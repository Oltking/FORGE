/**
 * Run one anchoring pass from the command line (useful as a cron target):
 *   node --env-file=.env.local --import tsx scripts/anchor.ts
 */

import { createClient } from "@supabase/supabase-js";
import { anchorPending } from "../src/lib/forge/anchor";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

anchorPending(db)
  .then((r) => console.log(r.message))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
