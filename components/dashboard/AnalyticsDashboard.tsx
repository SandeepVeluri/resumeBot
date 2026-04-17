'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';

interface Analytics {
  totalViews: number;
  totalSessions: number;
  totalQuestions: number;
  mostAsked: { question: string; count: number } | null;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed');
        const json = (await res.json()) as Analytics;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled)
          setData({
            totalViews: 0,
            totalSessions: 0,
            totalQuestions: 0,
            mostAsked: null,
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-navy-900 mb-4">Analytics</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Recruiter visits"
          value={data?.totalViews ?? 0}
          loading={loading}
        />
        <MetricCard
          label="Questions asked"
          value={data?.totalQuestions ?? 0}
          loading={loading}
        />
        <MetricCard
          label="Chat sessions"
          value={data?.totalSessions ?? 0}
          loading={loading}
        />
      </div>

      <Card className="mt-4">
        <CardTitle>Most asked question</CardTitle>
        {loading ? (
          <p className="text-sm text-navy-500">Loading…</p>
        ) : data?.mostAsked ? (
          <div>
            <p className="text-navy-900">&ldquo;{data.mostAsked.question}&rdquo;</p>
            <p className="mt-1 text-xs text-navy-500">
              Asked {data.mostAsked.count} time{data.mostAsked.count === 1 ? '' : 's'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-navy-500">
            No questions yet. Share your link to get started.
          </p>
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="text-center">
      <p className="text-xs uppercase tracking-wider text-navy-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-navy-900">
        {loading ? '—' : value}
      </p>
    </Card>
  );
}
