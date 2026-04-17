import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { ToastProvider } from '@/components/ui/Toast';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  return (
    <div className="min-h-screen bg-navy-50/60">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-navy-700 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-navy-900 mb-6">Settings</h1>
        <ToastProvider>
          <ProfileSettings profile={profile} onUpdated={() => {}} />
        </ToastProvider>
      </main>
    </div>
  );
}
