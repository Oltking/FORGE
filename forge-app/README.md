# Forge

**Prove it's true. Keep what's private, private.**

Forge lets you put your work, ideas, and contributions on a permanent record —
and later prove they're real, that you had them at a certain time, and that
nothing was changed — **without having to reveal the private details.**

No crypto knowledge needed to use it.

---

## The problem Forge solves

Most "proof" online is just trust:

- A résumé or LinkedIn is self-reported — anyone can inflate it.
- A GitHub history can be rewritten, and repos can be deleted.
- A benchmark result or a forecast can quietly be edited after the fact.
- An idea you shared early can be claimed by someone else later.

There's rarely a way to prove **what** you did, **when** you did it, and that
it **hasn't been altered** — especially if you don't want to expose everything.

Forge fixes that with one simple action: **seal it.**

---

## How it works (in plain English)

```
1. Seal it   →  Lock in your details. Once sealed, they can't be changed or back-dated.
2. Save it   →  A tamper-proof fingerprint is written to a permanent public record
                that nobody — not even Forge — can edit or delete.
3. Prove it  →  Later, reveal only the parts you choose. Anyone can check it's genuine.
```

You decide whether the details are **public** (visible to everyone, nothing to
keep) or **private** (hidden, and you reveal what you want, when you want).

---

## What you can prove

Forge is built to be effortless for builders, but works for anyone:

| Use it for | Example |
|---|---|
| 🛠️ **What you've built** | "I shipped v2 of the payments API on this date." |
| 🌿 **Open-source contributions** | Paste a GitHub PR link → it's sealed as provably yours. |
| 💡 **Ideas, before you share them** | Seal an idea privately; prove later you had it first. |
| 📊 **Results, before you publish** | Lock in your numbers; prove you didn't tweak them to look better. |
| 🔮 **Forecasts** | Seal a prediction before the outcome; prove you called it. |

Each one is just a **proof** — a set of details sealed together. Pick a template,
fill it in, hit seal. That's it.

---

## Reveal only what you choose

This is the part nothing else does well.

When you seal a proof, **each detail is locked separately.** Later you can reveal
some and keep the rest hidden — and anyone can confirm the revealed values are
*exactly* what you sealed, while the hidden ones stay completely private.

> Example: a lab seals an AI benchmark result before publishing. Later it reveals
> the model, the benchmark, and the score — proving those numbers were fixed
> *before* release — while keeping the private test-set details sealed.

---

## Why it can't be faked

You don't need to understand any of this to trust a proof, but here's what's
happening underneath:

- **Fingerprint, not contents.** Each detail is turned into a one-way fingerprint
  with a secret random value mixed in. The fingerprint can't be reversed into the
  detail, but it changes if even one character changes — so it proves nothing was
  altered, without exposing anything.
- **Permanent record.** Fingerprints are bundled together and written to a public,
  tamper-proof ledger. Once written, the record of *when* it was sealed is fixed
  forever — it can't be back-dated or quietly edited.
- **Anyone can check.** Verification is done against the public record itself, not
  against Forge. Even if Forge disappeared, your proofs would still verify.

The result: a record that's **un-fakeable, un-editable, and un-backdatable.**

---

## On-chain status (read this)

Forge anchors proofs to a permanent record. Out of the box, that record is a
**local, development ledger** — it's cryptographically real and tamper-proof, but
it is **not yet on a public blockchain.** The interface says so honestly, and every
fingerprint is copyable.

When connected to **Hacash** (a public proof-of-work blockchain), the exact same
proofs publish to the public chain, become checkable on a public explorer, and the
status flips to "Hacash blockchain." That switch is wiring + configuration — no
changes to how you use Forge.

---

## Run it locally

```bash
npm install
npm run dev            # http://localhost:3000
```

You'll need a free [Supabase](https://supabase.com) project for sign-in and
storage:

1. Create a project, open the **SQL editor**, and run the files in
   `supabase/migrations/` in order.
2. Copy `.env.example` to `.env.local` and fill in the keys (below).
3. (Optional) `npm run seed` to load example proofs and profiles.

The cryptographic core needs none of this — `npm test` proves it on its own.

---

## Deploy to Vercel

Forge is a standard Next.js app and deploys to Vercel in minutes.

**Option A — Vercel CLI (fastest):**
```bash
npm i -g vercel
vercel login
vercel            # from inside this folder → preview deploy
vercel --prod     # production deploy
```

**Option B — GitHub + Vercel dashboard:**
1. Push the repo to GitHub and "Import Project" in Vercel.
2. Set **Root Directory** to `forge-app`.
3. Add the environment variables (below) and deploy.

Either way, set these in the Vercel project (the same values you use locally):

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Secret** — server only |

Make sure your Supabase database has the migrations applied — the deployed app
uses the same Supabase project as your local one.

---

## Confidence it works

- `npm test` — the cryptographic core: sealing, selective disclosure, tamper and
  back-dating rejection.
- `npm run audit` — an end-to-end check against your live database: seal → save →
  reveal a subset → verify, including rejection of forged and re-keyed values.

---

## What's next

- **Sign in with GitHub** to import your real merged PRs automatically.
- **Public builder portfolio** — your sealed work and contributions as a shareable,
  verifiable profile.
- **Live Hacash publishing** — anchor proofs to the public blockchain.
- **Threshold proofs** — prove "score above X" without revealing the exact number.

---

*Built with Next.js, TypeScript, and Supabase. Not financial advice.*
