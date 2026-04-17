import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { retrieveRelevantChunks, getProjectLinkSummaries } from '@/lib/rag';
import {
  buildSystemPrompt,
  pickModel,
  streamClaudeResponse,
  sanitizeUserInput,
  type ClaudeMessage,
} from '@/lib/claude';
import { generateSessionToken } from '@/lib/utils';

export const runtime = 'nodejs';

const MAX_QUESTIONS_PER_SESSION = 15;
const MAX_SESSIONS_PER_DAY = 10;
const SESSION_INACTIVITY_HOURS = 24;

interface ChatRequestBody {
  username: string;
  message: string;
  sessionToken?: string;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const username = body.username?.trim().toLowerCase();
  const rawMessage = body.message ?? '';
  const userMessage = sanitizeUserInput(rawMessage);

  if (!username) return jsonError('Missing username', 400);
  if (!userMessage) return jsonError('Empty message', 400);

  const service = createSupabaseServiceClient();

  const { data: profile, error: profileErr } = await service
    .from('profiles')
    .select('id, full_name, username, headline')
    .eq('username', username)
    .single();

  if (profileErr || !profile) {
    return jsonError('Candidate not found', 404);
  }

  // Daily per-candidate session limit.
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const { count: sessionsToday } = await service
    .from('chat_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .gte('created_at', twentyFourHoursAgo);

  // Get or create the chat session
  let sessionRow: {
    id: string;
    session_token: string;
    question_count: number;
    last_active: string;
  } | null = null;

  if (body.sessionToken) {
    const { data } = await service
      .from('chat_sessions')
      .select('id, session_token, question_count, last_active, user_id')
      .eq('session_token', body.sessionToken)
      .maybeSingle();
    if (data && data.user_id === profile.id) {
      const lastActive = new Date(data.last_active).getTime();
      const expired =
        Date.now() - lastActive > SESSION_INACTIVITY_HOURS * 60 * 60 * 1000;
      if (!expired) sessionRow = data;
    }
  }

  if (!sessionRow) {
    if ((sessionsToday ?? 0) >= MAX_SESSIONS_PER_DAY) {
      return jsonError(
        'This candidate has reached the maximum number of chat sessions for today. Please try again tomorrow.',
        429,
      );
    }
    const token = generateSessionToken();
    const { data: inserted, error: insertErr } = await service
      .from('chat_sessions')
      .insert({
        user_id: profile.id,
        session_token: token,
        question_count: 0,
      })
      .select('id, session_token, question_count, last_active')
      .single();
    if (insertErr || !inserted) {
      return jsonError('Could not start session', 500);
    }
    sessionRow = inserted;
    await service
      .from('resume_views')
      .insert({ user_id: profile.id, session_id: inserted.id });
  }

  if (sessionRow.question_count >= MAX_QUESTIONS_PER_SESSION) {
    return jsonError(
      `You've reached the maximum of ${MAX_QUESTIONS_PER_SESSION} questions for this session.`,
      429,
    );
  }

  // Retrieve history: last 5 messages
  const { data: history } = await service
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionRow.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const historyMessages: ClaudeMessage[] = (history ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content as string,
    }));

  // Persist the user message.
  await service.from('chat_messages').insert({
    session_id: sessionRow.id,
    role: 'user',
    content: userMessage,
  });

  // Retrieve resume context via RAG
  const { chunks, lowConfidence } = await retrieveRelevantChunks(
    userMessage,
    profile.id,
  );

  const candidateName = profile.full_name || profile.username || 'the candidate';

  // Low-confidence canned response — don't waste a Claude call.
  if (lowConfidence) {
    const canned = `This isn't mentioned in ${candidateName}'s resume.`;
    await service.from('chat_messages').insert({
      session_id: sessionRow.id,
      role: 'assistant',
      content: canned,
    });
    await service
      .from('chat_sessions')
      .update({
        question_count: sessionRow.question_count + 1,
        last_active: new Date().toISOString(),
      })
      .eq('id', sessionRow.id);

    return new Response(canned, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Session-Token': sessionRow.session_token,
        'X-Low-Confidence': '1',
      },
    });
  }

  const resumeChunks = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');
  const projectSummaries = await getProjectLinkSummaries(profile.id);

  const systemPrompt = buildSystemPrompt({
    candidateName,
    resumeChunks,
    projectSummaries,
  });

  const model = pickModel(userMessage);

  const messages: ClaudeMessage[] = [
    ...historyMessages,
    { role: 'user', content: userMessage },
  ];

  const claudeStream = await streamClaudeResponse({
    systemPrompt,
    messages,
    model,
  });

  // Tee the stream: one side goes to client, the other accumulates to save the
  // assistant reply when the model finishes.
  const [clientStream, persistStream] = claudeStream.tee();

  void (async () => {
    const reader = persistStream.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) full += decoder.decode(value, { stream: true });
    }
    full += decoder.decode();

    await service.from('chat_messages').insert({
      session_id: sessionRow!.id,
      role: 'assistant',
      content: full.trim() || '(no response)',
    });
    await service
      .from('chat_sessions')
      .update({
        question_count: sessionRow!.question_count + 1,
        last_active: new Date().toISOString(),
      })
      .eq('id', sessionRow!.id);
  })();

  return new Response(clientStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Session-Token': sessionRow.session_token,
      'X-Model': model,
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('sessionToken');
  if (!token) return jsonError('Missing sessionToken', 400);

  const service = createSupabaseServiceClient();
  const { data: session } = await service
    .from('chat_sessions')
    .select('id')
    .eq('session_token', token)
    .maybeSingle();
  if (!session) return jsonError('Session not found', 404);

  const { data: messages } = await service
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  return new Response(JSON.stringify({ messages: messages ?? [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
