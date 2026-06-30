'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Resume {
  id: string;
  file_url: string | null;
  created_at: string;
  is_active: boolean;
  raw_text: string | null;
}

interface ResumeUploaderProps {
  currentResume: Resume | null;
  onUploaded: (resume: Resume) => void;
}

export function ResumeUploader({ currentResume, onUploaded }: ResumeUploaderProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.push('File too large. Max 5MB.', 'error');
        return;
      }
      const form = new FormData();
      form.append('file', file);
      setUploading(true);
      try {
        const res = await fetch('/api/upload-resume', {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Upload failed');
        toast.push('Resume uploaded and indexed.', 'success');
        onUploaded({
          id: json.resumeId,
          file_url: null,
          created_at: new Date().toISOString(),
          is_active: true,
          raw_text: null,
        });
      } catch (err) {
        toast.push(err instanceof Error ? err.message : 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    },
    [toast, onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void upload(file);
    },
    [upload],
  );

  return (
    <Card>
      <CardTitle>Resume</CardTitle>
      <CardSubtitle>
        Upload your latest resume (PDF or DOCX, max 5MB). We'll extract, chunk,
        and embed it automatically.
      </CardSubtitle>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragging
            ? 'border-navy-500 bg-navy-50'
            : 'border-navy-200 hover:border-navy-400 hover:bg-navy-50/50',
        )}
      >
        <p className="text-sm font-medium text-navy-900">
          {uploading
            ? 'Uploading and indexing…'
            : 'Click to upload or drag & drop'}
        </p>
        <p className="mt-1 text-xs text-navy-500">PDF or DOCX</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
          className="hidden"
        />
      </div>

      {currentResume && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-navy-100 bg-navy-50/50 px-3 py-2">
          <div className="text-sm">
            <p className="font-medium text-navy-900">Current resume</p>
            <p className="text-xs text-navy-500">
              Uploaded {new Date(currentResume.created_at).toLocaleDateString()}
            </p>
          </div>
          {currentResume.file_url && (
            <a
              href={currentResume.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-navy-700 hover:underline"
            >
              View
            </a>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          loading={uploading}
        >
          Replace resume
        </Button>
      </div>
    </Card>
  );
}
