'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/Button';

interface SignInButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  redirectTo?: string;
}

export function SignInButton({
  label = 'Sign in with Google',
  variant = 'primary',
  size = 'md',
  redirectTo = '/dashboard',
}: SignInButtonProps) {
  async function handleSignIn() {
    const supabase = createSupabaseBrowserClient();
    const next = encodeURIComponent(redirectTo);
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${next}`,
      },
    });
  }

  return (
    <Button variant={variant} size={size} onClick={handleSignIn}>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M21.35 11.1H12v2.96h5.38c-.24 1.41-1.66 4.15-5.38 4.15a5.2 5.2 0 0 1 0-10.42c1.63 0 2.72.7 3.34 1.3l2.27-2.19C16.1 5.48 14.23 4.5 12 4.5a7.5 7.5 0 1 0 0 15c4.33 0 7.2-3.04 7.2-7.33 0-.5-.05-.88-.12-1.07z" />
      </svg>
      {label}
    </Button>
  );
}
