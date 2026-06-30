'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface ShareableLinkCardProps {
  username: string | null;
  fullName: string | null;
  appUrl: string;
}

export function ShareableLinkCard({
  username,
  fullName,
  appUrl,
}: ShareableLinkCardProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!username) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-900">
          You haven't set a username yet. Pick one below so recruiters can chat
          with your resume.
        </p>
      </Card>
    );
  }

  const fullUrl = `${appUrl.replace(/\/$/, '')}/chat/${username}`;
  const name = fullName?.split(' ')[0] ?? 'me';
  const linkedInBlurb = `💬 Chat with my resume: ${fullUrl}`;

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.push(`${label} copied`, 'success');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="bg-gradient-to-br from-navy-900 to-navy-700 text-white border-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy-200">
            Your shareable chatbot
          </p>
          <p className="mt-1 font-mono text-lg break-all">{fullUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => copy(fullUrl, 'Link')}
            className="bg-white text-navy-900"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Preview
          </a>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-white/10 p-4 text-sm">
        <p className="text-xs uppercase tracking-wider text-navy-200 mb-2">
          Add this to your LinkedIn bio
        </p>
        <div className="flex items-start justify-between gap-3">
          <code className="text-white/90">{linkedInBlurb}</code>
          <button
            onClick={() => copy(linkedInBlurb, 'Blurb')}
            className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
          >
            Copy
          </button>
        </div>
      </div>
    </Card>
  );
}
