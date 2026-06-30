'use client';

import { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { ShareableLinkCard } from './ShareableLinkCard';
import { ResumeUploader } from './ResumeUploader';
import { ProjectLinkManager } from './ProjectLinkManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ProfileSettings } from './ProfileSettings';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  linkedin_url: string | null;
  headline: string | null;
}

interface Resume {
  id: string;
  file_url: string | null;
  created_at: string;
  is_active: boolean;
  raw_text: string | null;
}

interface ProjectLink {
  id: string;
  type: string;
  url: string;
  scraped_content: string | null;
  created_at: string;
}

interface DashboardClientProps {
  profile: Profile | null;
  resume: Resume | null;
  links: ProjectLink[];
  appUrl: string;
}

export function DashboardClient({
  profile: initialProfile,
  resume: initialResume,
  links: initialLinks,
  appUrl,
}: DashboardClientProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [resume, setResume] = useState<Resume | null>(initialResume);
  const [links, setLinks] = useState<ProjectLink[]>(initialLinks);

  const greeting = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <ToastProvider>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">
            Hey {greeting} 👋
          </h1>
          <p className="mt-1 text-navy-600">
            Manage your resume chatbot, project links, and see who's asking.
          </p>
        </div>

        <ShareableLinkCard
          username={profile?.username ?? null}
          fullName={profile?.full_name ?? null}
          appUrl={appUrl}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ResumeUploader
            currentResume={resume}
            onUploaded={(r) => setResume(r)}
          />
          <ProfileSettings
            profile={profile}
            onUpdated={(p) => setProfile(p)}
          />
        </div>

        <ProjectLinkManager
          links={links}
          onChange={setLinks}
        />

        <AnalyticsDashboard />
      </div>
    </ToastProvider>
  );
}
