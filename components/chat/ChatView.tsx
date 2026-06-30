'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ResumeViewer } from './ResumeViewer';
import { ChatPanel } from './ChatPanel';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  username: string;
  candidateName: string;
  headline: string | null;
  linkedinUrl: string | null;
  resumeText: string;
  parsedSections: Record<string, string> | null;
}

export function ChatView({
  username,
  candidateName,
  headline,
  linkedinUrl,
  resumeText,
  parsedSections,
}: ChatViewProps) {
  const [mobileTab, setMobileTab] = useState<'resume' | 'chat'>('chat');

  return (
    <div className="flex h-screen w-full flex-col bg-navy-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-navy-900 text-white text-xs">
              R
            </span>
            ResumeChat
          </Link>
          <div className="text-xs text-navy-500">
            Chatting with{' '}
            <span className="font-semibold text-navy-900">{candidateName}</span>
          </div>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="flex border-b border-navy-100 bg-white md:hidden">
        <button
          onClick={() => setMobileTab('resume')}
          className={cn(
            'flex-1 py-2 text-sm font-medium',
            mobileTab === 'resume'
              ? 'border-b-2 border-navy-900 text-navy-900'
              : 'text-navy-500',
          )}
        >
          Resume
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={cn(
            'flex-1 py-2 text-sm font-medium',
            mobileTab === 'chat'
              ? 'border-b-2 border-navy-900 text-navy-900'
              : 'text-navy-500',
          )}
        >
          Chat
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 overflow-hidden">
        {/* Resume panel (60%) */}
        <div
          className={cn(
            'w-full overflow-y-auto scrollbar-thin border-r border-navy-100 bg-white p-6 md:w-3/5 md:block',
            mobileTab === 'resume' ? 'block' : 'hidden md:block',
          )}
        >
          <ResumeViewer
            candidateName={candidateName}
            headline={headline}
            linkedinUrl={linkedinUrl}
            resumeText={resumeText}
            parsedSections={parsedSections}
          />
        </div>

        {/* Chat panel (40%) */}
        <div
          className={cn(
            'flex w-full flex-col bg-navy-50 md:w-2/5',
            mobileTab === 'chat' ? 'flex' : 'hidden md:flex',
          )}
        >
          <ChatPanel
            username={username}
            candidateName={candidateName}
            headline={headline}
          />
        </div>
      </div>
    </div>
  );
}
