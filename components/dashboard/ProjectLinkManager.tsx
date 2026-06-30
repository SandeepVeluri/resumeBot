'use client';

import { useState } from 'react';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface ProjectLink {
  id: string;
  type: string;
  url: string;
  scraped_content: string | null;
  created_at: string;
}

interface ProjectLinkManagerProps {
  links: ProjectLink[];
  onChange: (links: ProjectLink[]) => void;
}

const typeIcons: Record<string, string> = {
  github: '🐙',
  medium: '✍️',
  figma: '🎨',
  website: '🌐',
  other: '🔗',
};

export function ProjectLinkManager({ links, onChange }: ProjectLinkManagerProps) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!url.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/scrape-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to add link');
      onChange([json.link, ...links]);
      setUrl('');
      toast.push('Link scraped and saved.', 'success');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const prev = links;
    onChange(links.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/scrape-link?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not remove');
    } catch (err) {
      onChange(prev);
      toast.push(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }

  return (
    <Card>
      <CardTitle>Project links</CardTitle>
      <CardSubtitle>
        Add GitHub, Medium, Figma, or personal sites. We scrape them so the
        chatbot can reference your work.
      </CardSubtitle>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/yourname"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add();
          }}
        />
        <Button onClick={add} loading={adding}>
          Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="mt-4 text-sm text-navy-500">No links yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-navy-100 rounded-md border border-navy-100">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex items-start justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span>{typeIcons[l.type] ?? '🔗'}</span>
                  <span className="uppercase text-xs font-semibold text-navy-500">
                    {l.type}
                  </span>
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate block text-navy-900 hover:underline"
                >
                  {l.url}
                </a>
                {l.scraped_content && (
                  <p className="mt-1 text-xs text-navy-500 line-clamp-2">
                    {l.scraped_content.slice(0, 200)}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(l.id)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
