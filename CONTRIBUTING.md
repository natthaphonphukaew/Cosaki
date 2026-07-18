# Contributing to Cosaki

Read this **before writing any code** — and if you use an AI assistant (Copilot, Claude,
Cursor, etc.), **paste this file + `README.md` into its context first**. That single habit
prevents 90% of "the AI wrote something inconsistent" problems.

The team: **1 lead/owner** (reviews & merges everything) + designers building UI.

---

## 0. The golden rules (memorize)

1. **Never push to `main`.** Every change goes through a Pull Request that the lead approves.
2. **Designers touch the UI layer only.** Do **not** edit `server/**`, `client/src/api/**`, or
   database migrations. If the UI needs a new field/endpoint, ask the lead — don't let AI
   invent backend changes.
3. **Reuse, don't reinvent.** Before creating a component, check the inventory in §5. The AI
   will happily build a 4th button style — don't let it.
4. **One branch = one focused task.** Split work by *page/folder*, not by file, so two people
   rarely touch the same file.
5. **Format on save.** Prettier decides spacing/quotes/semicolons — never argue about style.

---

## 1. First-time setup

```bash
git clone https://github.com/natthaphonphukaew/Cosaki.git
cd Cosaki
npm install                 # installs all workspaces (root + server + client)

# Your own local env (never commit it)
cp server/.env.example server/.env     # then fill DATABASE_URL etc.

# Run it
cd server && node db/migrate.js
NODE_ENV=development DEMO_OTP=123456 node src/app.js   # backend :5000
npm run dev:client                                     # frontend :3000
```

Login while testing: **any phone number + code `123456`** (see README §1). KYC auto-approves in
dev — enter any date of birth.

**Editor:** install the **Prettier** and **ESLint** extensions and enable "Format on Save".
The repo's `.editorconfig` / `.prettierrc.json` / `client/eslint.config.js` configure them.

---

## 2. Branch & commit conventions

**Branch names** — `<type>/<short-scope>`:
- `feat/home-redesign`, `feat/seller-dashboard-ui`, `fix/pdp-spacing`, `chore/prettier`

**Commit messages** — short imperative summary, optional body:
```
feat: redesign Home hero + fandom chips
fix: correct checkout total spacing on iOS
```
Common types: `feat` (new), `fix` (bug), `style` (CSS/visual), `chore` (tooling/docs), `refactor`.

**Keep commits scoped.** Don't mix a Home redesign and a Profile fix in one commit.

---

## 3. The PR workflow (how work reaches `main`)

```
git checkout main && git pull            # start from latest
git checkout -b feat/your-task           # your own branch
# ...work, commit small & often...
npm run format                           # auto-format
npm run lint                             # check for real bugs (warnings are OK)
git push -u origin feat/your-task        # push branch
# open a Pull Request on GitHub → base: main
```

In the PR description, write **what changed and a screenshot** of the UI. Then:
1. The **lead reviews** the diff (often with an AI code-review pass) and runs the regression tests.
2. If changes are requested, push more commits to the same branch (the PR updates itself).
3. Once approved & green, the **lead merges**. Delete the branch.

**Pull `main` into your branch daily** (`git checkout main && git pull && git checkout - && git merge main`)
so conflicts stay tiny.

---

## 4. What you may / may not change

| ✅ Designers own | 🚫 Ask the lead first (business logic / contracts) |
|---|---|
| `client/src/pages/**` | `server/**` (controllers, routes, migrations, services) |
| `client/src/components/**` | `client/src/api/**` (must match the backend contract) |
| `client/src/index.css`, `tailwind.config.js` | anything touching **money math, booking state, escrow, strikes** |
| copy, layout, spacing, colors within the design system | `README.md` data-model / API sections |

If a design needs data the API doesn't return yet, **open an issue / ask** — the lead adds the
endpoint. Never let an AI "just add it to the controller."

---

## 5. Component & design-system inventory (reuse these)

Import from `@/...` (alias for `client/src`). Prefer these over hand-rolled markup:

- **Layout:** `components/layout/AppShell` (page + bottom nav), `PageHeader` (back + title),
  `BottomNav`, `AuthGuard`/`GuestGuard`.
- **UI:** `components/ui/Button`, `Input`, `Card`, `Badge` (status pills), `Spinner`, `Skeleton`,
  `ErrorState`, `ProductImage` (image **or** gradient+emoji placeholder — always use this for item
  images), `NotificationBell`, `ChatButton`.
- **Utilities:** `utils/image` (`fileToDataUrl` — downscale uploads to data-URLs), `utils/favorites`
  (localStorage wishlist), `utils/age`.
- **Toasts:** `react-hot-toast` (`toast.success/error`). **Icons:** `lucide-react` only.

**Design tokens (Tailwind):** brand purple `brand-purple`, pink `brand-pink`, gradient
`bg-brand-gradient`, surface `bg-surface-base`. Cards `rounded-2xl shadow-sm`. Page frame
`mx-auto min-h-screen w-full max-w-[390px]` (mobile-first, 390px). Match the surrounding file's
spacing/idiom — the whole app already follows one visual language; keep it.

**Rules for AI-generated UI:** no new CSS frameworks, no inline `<style>`, no new color hex —
use the tokens above. No new "Button"/"Modal" components — extend the existing ones.

---

## 6. Formatting & linting

```bash
npm run format        # Prettier auto-formats everything (run before committing)
npm run format:check  # CI-style check (fails if unformatted)
npm run lint          # ESLint on the client (bugs → warnings, won't block you)
```

Prettier owns *style*; ESLint flags *bugs* (unused vars, bad hook deps). Both are configured to be
lenient so they guide rather than block. **Do run `npm run format` before every PR** so diffs stay
about real changes, not whitespace.

---

## 7. Don'ts (the usual AI foot-guns)

- ❌ Committing `.env` or any secret/token. (It's gitignored — keep it that way.)
- ❌ Editing `package-lock.json` by hand, or running `npm install <random-lib>` the design doesn't need.
- ❌ Changing amounts/fees/percentages, booking status flow, or API request/response shapes.
- ❌ Adding a big new dependency for something a few lines of Tailwind/JS can do.
- ❌ Force-pushing to shared branches or to `main`.
- ❌ Reformatting an entire file you only meant to touch 3 lines of.

When unsure, open a draft PR and ask — small questions beat a broken `main`.
