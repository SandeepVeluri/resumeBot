'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageBubble } from './MessageBubble';
import { PromptSuggestions } from './PromptSuggestions';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  username: string;
  candidateName: string;
  headline: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const SESSION_KEY_PREFIX = 'resumechat_session_';

export function ChatPanel({ username, candidateName, headline }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I can answer questions about ${candidateName} based on their resume. Ask away.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SESSION_KEY_PREFIX + username);
    if (saved) sessionTokenRef.current = saved;
  }, [username]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setError(null);
      setSending(true);

      const userMsg: Message = { role: 'user', content: trimmed };
      const assistantMsg: Message = { role: 'assistant', content: '', streaming: true };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            message: trimmed,
            sessionToken: sessionTokenRef.current,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          let msg = text;
          try {
            msg = (JSON.parse(text) as { error?: string }).error ?? text;
          } catch {}
          throw new Error(msg || `HTTP ${res.status}`);
        }

        const returnedToken = res.headers.get('X-Session-Token');
        if (returnedToken) {
          sessionTokenRef.current = returnedToken;
          window.localStorage.setItem(
            SESSION_KEY_PREFIX + username,
            returnedToken,
          );
        }

        if (!res.body) {
          const fallback = await res.text();
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: fallback };
            return next;
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          acc += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: 'assistant',
              content: acc,
              streaming: true,
            };
            return next;
          });
        }
        acc += decoder.decode();
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: acc || '(no response)' };
          return next;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
        setMessages((prev) => prev.slice(0, -1)); // drop empty assistant bubble
      } finally {
        setSending(false);
      }
    },
    [sending, username],
  );

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-navy-100 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-navy-900">{candidateName}</p>
        {headline && <p className="text-xs text-navy-500">{headline}</p>}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3"
      >
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            streaming={m.streaming}
          />
        ))}

        {showSuggestions && (
          <div className="pt-2">
            <PromptSuggestions onPick={(t) => void send(t)} disabled={sending} />
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-navy-100 bg-white p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={`Ask about ${candidateName}…`}
            rows={1}
            className="flex-1 resize-none rounded-md border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className={cn(
              'rounded-md bg-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-40',
            )}
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>

        <p className="mt-2 text-center text-[11px] text-navy-500">
          Powered by ResumeChat —{' '}
          <Link href="/" className="underline hover:text-navy-800">
            Create yours free →
          </Link>
        </p>
      </div>
    </div>
  );
}
