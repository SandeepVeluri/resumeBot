import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Returns null when the key looks valid for service-role / secret usage.
 * Returns a short classifier string when the key is clearly the wrong one
 * (anon / publishable) so we can surface a helpful error.
 *
 * Supabase ships two key formats:
 *   - Legacy JWTs with a `role` claim (`anon` or `service_role`).
 *   - New opaque keys prefixed with `sb_publishable_` or `sb_secret_`.
 */
function classifyKey(key: string): 'service' | 'anon' | 'publishable' | 'unknown' {
  if (key.startsWith('sb_secret_')) return 'service';
  if (key.startsWith('sb_publishable_')) return 'publishable';

  try {
    const payload = key.split('.')[1];
    if (!payload) return 'unknown';
    const json = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf-8');
    const role = (JSON.parse(json) as { role?: string }).role;
    if (role === 'service_role') return 'service';
    if (role === 'anon') return 'anon';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function createSupabaseServiceClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (Supabase Dashboard → Settings → API → "service_role" / "secret" key).',
    );
  }

  const kind = classifyKey(supabaseServiceRoleKey);
  if (kind === 'anon' || kind === 'publishable') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY appears to be the "${kind}" key, not the secret / service_role key. ` +
        `In Supabase Dashboard → Settings → API, copy the secret key (starts with "sb_secret_" on new projects, ` +
        `or has role "service_role" on legacy projects) into .env.local and restart the dev server.`,
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
