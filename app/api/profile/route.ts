import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { isValidUsername } from '@/lib/utils';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: {
      username?: string;
      full_name?: string;
      linkedin_url?: string;
      headline?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

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
    if (body.linkedin_url !== undefined)
      update.linkedin_url = body.linkedin_url.trim();
    if (body.headline !== undefined) update.headline = body.headline.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
