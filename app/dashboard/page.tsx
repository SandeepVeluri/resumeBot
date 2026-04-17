import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const service = createSupabaseServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, username, full_name, linkedin_url, headline')
    .eq('id', user.id)
    .maybeSingle();

  const { data: resume } = await service
    .from('resumes')
    .select('id, file_url, created_at, is_active, raw_text, parsed_sections')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: links } = await service
    .from('project_links')
    .select('id, type, url, scraped_content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="min-h-screen bg-navy-50/60">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-white">
              R
            </span>
            ResumeChat
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-navy-600 hidden sm:inline">
              {user.email}
            </span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-navy-200 px-3 py-1.5 text-navy-700 hover:bg-navy-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <DashboardClient
          profile={profile}
          resume={resume}
          links={links ?? []}
          appUrl={appUrl}
        />
      </main>
    </div>
  );
}
