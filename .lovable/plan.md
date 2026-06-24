# V2 Follow-up — Client Photos, Route Summary, Empty States, A11y, Quick Comms

## 1. Client profile photos

**Schema (migration)**
- Add `photo_url text null` to `public.clients` (nullable, no default — keeps existing rows valid).
- No new RLS — existing client policies cover the column.
- Storage: reuse the existing private `avatars` bucket under a `clients/` prefix (`clients/<client_id>/<uuid>.jpg`). No new bucket needed.
- Add RLS policies on `storage.objects` so:
  - Admins can `insert/update/delete` objects in `avatars` where path starts with `clients/`.
  - Authenticated users can `select` (signed URL not required since we'll display via signed URL helper, or make objects readable to authenticated). Pick: keep bucket private and generate signed URLs on read (3600s) — admin-only writes.

**Hooks / lib**
- `src/hooks/useClientPhoto.ts`:
  - `useUploadClientPhoto()` mutation — uploads file, updates `clients.photo_url` with the storage path (not URL).
  - `useDeleteClientPhoto()` — removes storage object + nulls column.
- `src/lib/clientPhoto.ts`:
  - `getClientPhotoUrl(path)` — returns a signed URL (cached per session) or `null`.
  - React hook `useClientPhotoUrl(path)` to resolve in components.

**Admin UI**
- `src/components/admin/ClientDetailSheet.tsx`: add a photo block at the top — current photo (or initial), Upload / Replace / Remove buttons. Validate <5 MB, jpeg/png/webp.
- `AdminCreateClient.tsx`: optional photo picker on create; upload after the client row is created.

**Caregiver UI**
- `ShiftCard.tsx`: show photo avatar (already has initials fallback in this branch) → swap to `<Avatar>` with signed URL when available.
- Dashboard "Up next" card: same.
- `TasksPage.tsx`: small avatar next to client name in each card.
- `ShiftDetail.tsx` (care plan view): larger photo at top of the visit.

**Types**: `src/integrations/supabase/types.ts` is auto-generated — do not edit. Cast through `as any` for the new column until regenerated, OR rely on regenerated types after migration.

## 2. Route summary card on caregiver dashboard

The "schedule graph" never landed as a literal chart; the dashboard currently has no route summary. Add a **Today's Route** card on the dashboard, sitting between the active-shift detail card and "Up next":

- Pulls today's shifts in start-time order.
- Shows: stop count, total estimated distance, total estimated travel time, and a mini static SVG map (existing `ClientMap` component if usable; otherwise a tiny custom SVG that plots stops on a normalized bounding box — pure presentation, no external SDK).
- Uses straight-line haversine for distance/time (existing `haversine` helper from `ShiftsPage.tsx` will be lifted into `src/lib/route.ts`) — clearly labelled "Estimated".
- "Open full route" button → `/shifts`.

No new dependencies. Existing Google Maps tracking is untouched.

## 3. Empty-state copy refresh

Consistent healthcare-clinical voice everywhere:
- `TasksPage.tsx` (no visits today): "No visits scheduled today. Check upcoming shifts to prepare for tomorrow's care."
- `ShiftTasksList.tsx` (no tasks for a visit): already updated last turn — verify.
- `MessagesPage.tsx` (no conversations): "No active conversations. Reach out to the agency, scheduler, or family using Quick Contacts above."
- `NotificationsPage.tsx`: "No new notifications. You'll see shift updates and care alerts here."
- `ShiftsPage.tsx` (no shifts): "No visits scheduled for this day."
- Visit Documentation (`CareNotesPage.tsx`) empty: "No documentation yet. Add observations, vitals, and any changes in condition."

## 4. Accessibility / contrast / spacing / tap targets

Pass after edits, verified against WCAG AA for the navy/ivory/gold tokens. Concrete fixes:

- **Contrast**:
  - The new bottom-nav inactive label color `hsl(217 20% 45%)` on ivory `#F8F6F2` — verify ≥4.5:1 for text. Bump to `hsl(217 30% 35%)` if needed.
  - `text-muted-foreground` is defined for the dark theme (`hsl(40 15% 70%)`) — on the ivory canvas it's ~3.0:1. Override in `:root` with an ivory-mode muted token: e.g. add `--muted-foreground-on-canvas: 217 20% 38%` and use it via a utility class on the canvas surfaces. Cleaner: redefine `--muted-foreground` for the ivory mode by introducing a `.theme-light` wrapper, OR override on canvas/surface elements directly. Approach: introduce two extra tokens `--surface-muted-foreground` and apply via Tailwind plugin colors (`text-surface-muted`) on ivory/white surfaces.
  - Audit gold `hsl(32 55% 58%)` text on white — only meets AA at ≥18pt. Reserve gold for headings/icons/CTAs; switch small "Today's total", "Timesheet" link labels to navy or darker gold (`hsl(28 60% 38%)`).
- **Touch targets**: bottom nav buttons currently ~52×56 — OK. Header icon buttons (`p-1`) compute to ~32×32 — bump to `min-h-11 min-w-11`. Notifications "Mark all read" button — already shadcn, fine. ShiftCard accept/decline — `py-2` ~36 — bump to `py-3 min-h-11`. ShiftTasksList checkbox row — add `py-2.5 min-h-11`. Messages Quick-Contact buttons — already 56×56 + label, OK.
- **Focus rings**: shadcn already provides `focus-visible` on buttons; the hand-rolled `<button>`s in BottomNav, Dashboard hero CTA, ShiftCard, AppHeader logo, and Quick Contacts need `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas`.
- **Semantic landmarks**: `MobileLayout` already wraps `<main>`. Add `<nav aria-label="Primary">` to BottomNav, `<header role="banner">` already on AppHeader via `<header>`.
- **Alt text**: AppHeader logo has alt="Angels of Comfort"; ShiftCard avatar is `aria-hidden` (initials are decorative — keep). Add `aria-label` describing client name on card root.
- **Color-only signals**: ShiftCard GPS pills already pair icon + text — OK. Status pills use color + text — OK.

## 5. Quick Communication contact actions

Today the Quick-Contact buttons all navigate to `/messages/new`. Wire real actions:

**Data model**
- Reuse `agency_settings` (already has 7 columns — verify which). Most likely add string columns for each contact: `agency_phone`, `agency_email`, `scheduler_phone`, `scheduler_email`, `clinical_supervisor_phone`, `clinical_supervisor_email`, `family_contact_label` (label shown), `family_contact_phone`, `family_contact_email`. Migration adds all as nullable text — no defaults required, existing rows stay valid.
- Optional: `documents_url` text for "View documents" deep-link (kept simple — uses existing `/profile` → documents page if not set).

**Caregiver UI**
- Tapping a Quick Contact opens a small bottom sheet (`Sheet` from shadcn) with 3 actions:
  - **Call** — `tel:` link (disabled if no phone)
  - **Message** — opens app chat to that contact's user_id if known, else opens default mail (`mailto:`)
  - **View documents** — for Agency only, navigates to a documents page; for others, disabled
- Sheet uses gold-accent navy actions and ivory background; ≥44px tap targets.

**Admin UI**
- New section in `AdminSettings.tsx` (or as edits inside existing "Agency" panel) for managing the contact directory: 4 cards (Agency / Scheduler / Clinical / Family) each with name, phone, email inputs. Saves to `agency_settings`.

**Hooks**
- Extend `useAgencySettings.ts` to expose & mutate the new columns.

---

## Out of scope
- No new map provider, no real-time routing engine.
- No changes to RLS for `clients` rows.
- Admin chat-of-record routing for contacts (linking a contact to a specific Supabase user) — for now we only store contact info; the "Message" button uses email link if no user id stored. Linking to a real user_id is a follow-up.

## Execution order
1. Migration: `clients.photo_url`, `agency_settings` contact columns, `storage.objects` RLS for `clients/*`.
2. Lib + hook for signed client photo URLs.
3. Admin client photo UI (sheet) and admin agency-settings contacts panel.
4. Caregiver photo display on ShiftCard, Dashboard "Up next", TasksPage, ShiftDetail.
5. Dashboard route summary card; lift `haversine` helper.
6. Empty-state copy pass across the 5 files listed.
7. A11y pass: token additions for ivory-muted text, focus rings on custom buttons, tap-target bumps.
8. Quick Communication sheet wired to phone/email/messages.
