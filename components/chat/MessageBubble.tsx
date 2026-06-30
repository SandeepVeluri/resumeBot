'use client';

import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function MessageBubble({ role, content, streaming }: MessageBubbleProps) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex gap-2 animate-fade-in',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div className="h-7 w-7 shrink-0 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold">
          R
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-navy-900 text-white rounded-br-sm'
            : 'bg-white border border-navy-100 text-navy-900 rounded-bl-sm',
        )}
      >
        {content}
        {streaming && (
          <span className="ml-1 inline-block align-middle text-navy-400">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
        )}
      </div>
    </div>
  );
}
