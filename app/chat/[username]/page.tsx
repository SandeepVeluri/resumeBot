import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { ChatView } from '@/components/chat/ChatView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: PageProps) {
  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('full_name, username, headline')
    .eq('username', params.username.toLowerCase())
    .maybeSingle();

  if (!profile) return { title: 'ResumeChat' };
  const name = profile.full_name || profile.username;
  return {
    title: `${name} — ResumeChat`,
    description: `Chat with ${name}'s resume.`,
  };
}

export default async function ChatPage({ params }: PageProps) {
  const username = params.username.toLowerCase();
  const service = createSupabaseServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, username, full_name, headline, linkedin_url')
    .eq('username', username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: resume } = await service
    .from('resumes')
    .select('raw_text, parsed_sections, created_at')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-6">
        <div className="max-w-md rounded-xl border border-navy-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-navy-900">
            {profile.full_name || profile.username} hasn't uploaded a resume yet.
          </h1>
          <p className="mt-2 text-sm text-navy-600">
            Check back soon or ask them to finish setting up.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-navy-900 px-4 py-2 text-sm text-white hover:bg-navy-800"
          >
            Create your own ResumeChat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ChatView
      username={username}
      candidateName={profile.full_name || profile.username || 'Candidate'}
      headline={profile.headline ?? null}
      linkedinUrl={profile.linkedin_url ?? null}
      resumeText={resume.raw_text ?? ''}
      parsedSections={
        (resume.parsed_sections as Record<string, string> | null) ?? null
      }
    />
  );
}
