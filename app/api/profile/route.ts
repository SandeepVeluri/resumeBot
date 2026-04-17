import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { isValidUsername } from '@/lib/utils';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    username?: string;
    full_name?: string;
    linkedin_url?: string;
    headline?: string;
  };

  const update: Record<string, string> = {};
  if (body.username !== undefined) {
    const u = body.username.trim().toLowerCase();
    if (!isValidUsername(u)) {
      return NextResponse.json(
        {
          error:
            'Username must be 3-32 chars, lowercase letters, digits, and dashes.',
        },
        { status: 400 },
      );
    }
    update.username = u;
  }
  if (body.full_name !== undefined) update.full_name = body.full_name.trim();
  if (body.linkedin_url !== undefined) update.linkedin_url = body.linkedin_url.trim();
  if (body.headline !== undefined) update.headline = body.headline.trim();

  const service = createSupabaseServiceClient();

  if (update.username) {
    const { data: taken } = await service
      .from('profiles')
      .select('id')
      .eq('username', update.username)
      .neq('id', user.id)
      .maybeSingle();
    if (taken) {
      return NextResponse.json(
        { error: 'Username already taken.' },
        { status: 400 },
      );
    }
  }

  const { data, error } = await service
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('id, username, full_name, linkedin_url, headline')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
