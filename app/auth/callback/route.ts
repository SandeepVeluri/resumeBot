import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectPath = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', url.origin));
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Create profile row on first login.
      const service = createSupabaseServiceClient();
      const { data: existing } = await service
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .maybeSingle();

      if (!existing) {
        const fullName =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split('@')[0] ??
          'candidate';

        const base = slugify(fullName) || `user-${user.id.slice(0, 6)}`;
        let username = base;
        let suffix = 0;
        while (true) {
          const { data: taken } = await service
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();
          if (!taken) break;
          suffix += 1;
          username = `${base}-${suffix}`;
          if (suffix > 100) {
            username = `${base}-${Date.now().toString(36)}`;
            break;
          }
        }

        await service.from('profiles').insert({
          id: user.id,
          full_name: fullName,
          username,
        });
      }
    }

    return NextResponse.redirect(new URL(redirectPath, url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callback_failed';
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, url.origin),
    );
  }
}
