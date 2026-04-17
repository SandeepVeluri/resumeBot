import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  const [{ count: viewsCount }, { count: sessionCount }] = await Promise.all([
    service
      .from('resume_views')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    service
      .from('chat_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  // Pull question messages.
  const { data: sessionIds } = await service
    .from('chat_sessions')
    .select('id')
    .eq('user_id', user.id);

  const ids = (sessionIds ?? []).map((r) => r.id);

  let totalQuestions = 0;
  let mostAsked: { question: string; count: number } | null = null;

  if (ids.length > 0) {
    const { data: questions } = await service
      .from('chat_messages')
      .select('content')
      .in('session_id', ids)
      .eq('role', 'user');

    totalQuestions = questions?.length ?? 0;

    if (questions && questions.length > 0) {
      const freq = new Map<string, number>();
      for (const q of questions) {
        const norm = String(q.content).trim().toLowerCase().slice(0, 140);
        if (!norm) continue;
        freq.set(norm, (freq.get(norm) ?? 0) + 1);
      }
      let best: [string, number] | null = null;
      for (const entry of freq.entries()) {
        if (!best || entry[1] > best[1]) best = entry;
      }
      if (best) mostAsked = { question: best[0], count: best[1] };
    }
  }

  return NextResponse.json({
    totalViews: viewsCount ?? 0,
    totalSessions: sessionCount ?? 0,
    totalQuestions,
    mostAsked,
  });
}
