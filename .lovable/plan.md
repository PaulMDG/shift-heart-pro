# Angels of Comfort — V2 Design Pass

Goal: shift from "90% navy" to a layered navy + ivory + gold premium healthcare aesthetic, strengthen primary actions, humanize content, and tighten navigation/branding — without changing business logic or data flows.

## 1. Theme tokens (foundation — do first)

`src/index.css` + `tailwind.config.ts`:
- Add an **ivory surface layer** as the default page background for content areas:
  - `--canvas: 38 30% 96%` (warm ivory ~ #F8F6F2)
  - `--canvas-foreground: 217 60% 12%` (navy text on ivory)
  - `--surface: 0 0% 100%` (white cards on ivory)
  - `--surface-foreground: 217 60% 12%`
- Keep current navy `--background` for hero/header bands only via a new `.bg-hero-navy` utility.
- Strengthen gold CTA: add `--shadow-gold-glow` and a `gradient-cta` (richer gold with subtle inner highlight).
- Add `bg-canvas`, `bg-surface`, `text-canvas-foreground`, `text-surface-foreground` to Tailwind colors.
- Keep serif display + Inter body untouched.

## 2. Layout shell

`MobileLayout` / page wrappers:
- Default page background → `bg-canvas` (ivory) with navy text.
- Pages opt into a navy "hero band" at the top (Dashboard, Profile header) instead of full-screen navy.
- Cards switch from `bg-card` (navy) to `bg-surface` (white) with soft shadow + thin border.

## 3. Bottom navigation (active state)

`src/components/layout/BottomNav.tsx`:
- Active tab: filled gold icon (solid variant or `fill-primary`), gold label, subtle gold pill background, and a 2px gold top indicator.
- Inactive: muted navy icon, no fill.

## 4. Header / branding

`AppHeader.tsx`:
- Increase logo presence ~18%: swap the text-only "ANGELS / of Comfort" center block for the actual `<Logo />` mark at `h-9` (currently effectively `h-6` text).
- Keep menu + bell on sides.
- Menu/bell icons gold-tinted on ivory.

Auth & Admin login logos: bump `h-24` → `h-28`, stacked `h-36` → `h-44`.

## 5. Dashboard (`Index.tsx`)

- Top: navy hero band (rounded-bottom) with greeting "Good Afternoon, Andrew" + "X visits scheduled today". **Remove the circular "A" avatar.**
- Below hero on ivory:
  - **Dominant Clock In CTA**: full-width, larger (h-16 → h-20), gold gradient, gold glow shadow, big serif label. When in-progress → Clock Out variant.
  - Next visit card (white surface, client photo placeholder, time, address).
  - Today's route summary card replacing the dotted chart: mini static map thumbnail + total distance + travel time + stop count. (Uses existing client coords; static SVG/Leaflet snapshot — no new map provider needed.)
- Recent alerts: relative time formatter (`5 mins ago`, `Today`, `Yesterday`, then date).

## 6. Notifications

`src/lib/format.ts` — add `formatRelativeTime(date)`:
- `< 1 min` → "Just now"
- `< 60 min` → "X mins ago"
- same day → "Today, 2:14 PM"
- yesterday → "Yesterday, 2:14 PM"
- older → existing short date
Apply on `NotificationsPage` and dashboard alerts.

## 7. Tasks page

`TasksPage.tsx` + `ShiftTasksList.tsx`:
- Empty state copy → "No tasks assigned for this visit. Continue documenting observations, care notes, and any changes in condition."
- Rename button **"Open care notes" → "Visit Documentation"**.
- Card surface → white on ivory background.

## 8. Messages page

`MessagesPage.tsx`:
- New top section **"Quick Contacts"**: horizontal scroll of avatars — Agency, Scheduler, Clinical Supervisor, Family Contact. Tapping opens a chat/contact route (wire to existing chat/new-chat where available; placeholder action otherwise — no backend changes).
- Group existing Voice / Photo / Document / Call entry points under a **"Quick Communication"** header.
- Threads list below, unchanged data, restyled to white-on-ivory cards.

## 9. Shift / client cards

`ShiftCard.tsx` and visit cards:
- White surface, navy text, soft shadow.
- Add small client avatar circle (initials fallback; uses `client.photo_url` if present, otherwise gradient-initial bubble). No schema change.

## 10. Out of scope (will not touch)

- Auth providers, RLS, edge functions, data hooks, Supabase schema.
- Admin pages keep current dark theme (admin-theme) — only the caregiver-facing app gets the ivory shift, since the brief is about the caregiver experience. Admin polish can be a follow-up.
- No new dependencies. Mini route map uses a static SVG composition from existing lat/lng, not a new map SDK.

## Technical notes

- All new colors added as HSL semantic tokens in `index.css` and registered in `tailwind.config.ts` under `colors`. No raw hex in components.
- New `gradient-cta` and `shadow-gold-glow` utilities defined in the `@layer utilities` block.
- Relative-time helper is pure and unit-testable; existing `formatTime` stays.
- Logo size bump is done via existing `<Logo />` height props — no asset changes.

## Suggested execution order

1. Tokens + Tailwind config
2. Layout shell + BottomNav + AppHeader (visible everywhere)
3. Dashboard rebuild (biggest visual win)
4. Notifications relative time
5. Tasks copy + button rename
6. Messages restructure
7. Shift card avatars + polish pass
