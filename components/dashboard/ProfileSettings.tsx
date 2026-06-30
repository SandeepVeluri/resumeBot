'use client';

import { useState } from 'react';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  linkedin_url: string | null;
  headline: string | null;
}

interface ProfileSettingsProps {
  profile: Profile | null;
  onUpdated: (p: Profile) => void;
}

export function ProfileSettings({ profile, onUpdated }: ProfileSettingsProps) {
  const toast = useToast();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          full_name: fullName,
          headline,
          linkedin_url: linkedin,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      toast.push('Profile updated.', 'success');
      onUpdated({ ...(profile ?? { id: json.profile.id }), ...json.profile });
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardTitle>Profile</CardTitle>
      <CardSubtitle>
        Your username is your chatbot URL. Your name and headline appear at the
        top of the recruiter chat.
      </CardSubtitle>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-navy-700">
          Username
          <Input
            className="mt-1"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="johndoe"
          />
        </label>
        <label className="text-xs font-medium text-navy-700">
          Full name
          <Input
            className="mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
        </label>
        <label className="text-xs font-medium text-navy-700">
          Headline
          <Input
            className="mt-1"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Senior Software Engineer"
          />
        </label>
        <label className="text-xs font-medium text-navy-700">
          LinkedIn URL
          <Input
            className="mt-1"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
          />
        </label>
        <Button onClick={save} loading={saving} className="self-start">
          Save profile
        </Button>
      </div>
    </Card>
  );
}
