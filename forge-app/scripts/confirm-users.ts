/**
 * Dev helper: list auth users and confirm any unconfirmed ones.
 *
 * Useful when "Confirm email" is enabled on the Supabase project and a local
 * test account is stuck unconfirmed (login returns "Invalid login credentials").
 *
 *   node --env-file=.env.local --import tsx scripts/confirm-users.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  if (data.users.length === 0) {
    console.log("No users found. Sign up first, then re-run this.");
    return;
  }

  const resetEmail = process.env.FORGE_RESET_EMAIL;
  const resetPassword = process.env.FORGE_RESET_PASSWORD;

  console.log(`Found ${data.users.length} user(s):`);
  for (const u of data.users) {
    const confirmed = Boolean(u.email_confirmed_at);
    console.log(`  ${u.email}  confirmed=${confirmed}`);

    if (!confirmed) {
      const { error: upErr } = await admin.auth.admin.updateUserById(u.id, {
        email_confirm: true,
      });
      if (upErr) console.log(`    -> failed to confirm: ${upErr.message}`);
      else console.log("    -> confirmed ✓");
    }

    if (resetEmail && resetPassword && u.email === resetEmail) {
      const { error: pwErr } = await admin.auth.admin.updateUserById(u.id, {
        password: resetPassword,
        email_confirm: true,
      });
      if (pwErr) console.log(`    -> password reset failed: ${pwErr.message}`);
      else console.log("    -> password reset ✓ you can sign in with the new password");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
