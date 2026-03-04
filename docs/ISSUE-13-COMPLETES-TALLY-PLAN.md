# Plan: Issue #13 — Add a Complete Tally Form (“Completes”)

**Goal:** Add a form named “Completes” that lets users track campaigns and their complete counts. Users can add/remove/edit campaigns, reorder them, increment/decrement completes per campaign, reset all counts (keeping campaigns), or reset everything. The panel is shown on the right side of the app and can be popped out to a separate window.

**Reference:** Full functional site at https://completes.onestrangelife.dev (for UI/behavior reference; implementation will live inside TimeKeep).

---

## Requirements summary (from issue)

- **Form name:** “Completes” (Complete Tally Form).
- **Campaigns:** Add, remove, edit campaign names; rearrange sort order (e.g. drag-and-drop or up/down).
- **Completes:** Add/subtract one complete per campaign (increment/decrement count).
- **Reset options:**
  - **Reset all (without erasing campaigns):** Set all complete counts to 0; keep campaign list and order.
  - **Reset everything:** Clear all campaigns and counts (full reset).
- **Placement:** Visible on the right side of the main content.
- **Pop out:** Ability to open the Completes panel in a separate/pop-out window (e.g. for a second screen or floating window).

---

## 1. Data model

### 1.1 New tables

**`completes_campaigns`** — one row per campaign in the tally (user-scoped or global; see 1.2).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| user_id | INTEGER FK → users(id) | Owner of this tally (or NULL for a single global tally per instance) |
| name | TEXT NOT NULL | Campaign display name |
| sort_order | INTEGER NOT NULL DEFAULT 0 | Order in the list (lower = higher on list) |
| created_at | TEXT | |

**`completes_counts`** — current count of “completes” per campaign (or per campaign per day; see 1.2).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| campaign_id | INTEGER FK → completes_campaigns(id) ON DELETE CASCADE | |
| count | INTEGER NOT NULL DEFAULT 0 | Current tally |
| updated_at | TEXT | Last change |

- **Design choice:** Either one row per campaign (count is the current total) or one row per campaign per date (count is for that day). Issue says “reset all without erase campaigns” and “reset everything,” which fits a single current count per campaign. Optionally support “per date” later (e.g. add `entry_date` to `completes_counts`).
- **Scope:** Decide whether tally is per user or app-wide. Recommendation: **per user** so each user has their own Completes list and counts (`user_id` on `completes_campaigns`). If product prefers one shared tally, make `user_id` NULL and ignore in API.

### 1.2 Schema location

- Add to `server/db/schema.sql`.
- Add migration in `server/db/database.js` to create tables if not exist (for existing DBs).

### 1.3 Alternative: single table

- **`completes_items`** with columns: id, user_id, name, sort_order, count (default 0), created_at, updated_at. One row per campaign; count is the tally. Simpler; use this unless a separate history/audit is needed.

**Recommendation:** Use a single table `completes_items` (id, user_id, name, sort_order, count, created_at, updated_at) for simplicity. “Reset all” = set count = 0 for all rows for that user. “Reset everything” = delete all rows for that user.

---

## 2. Backend — API

### 2.1 Routes

- **GET /api/completes** — List current user’s campaigns with counts, ordered by sort_order. Response: `[{ id, name, sort_order, count }, ...]`.
- **POST /api/completes** — Create campaign (body: `{ name }`). Assign next sort_order (e.g. max+1). Create with count 0.
- **PUT /api/completes/:id** — Update campaign (body: `{ name?, sort_order? }`).
- **DELETE /api/completes/:id** — Remove campaign (and its count).
- **POST /api/completes/:id/add** — Increment count by 1. Body optional: `{ amount: 1 }` for flexibility. Response: updated item with new count.
- **POST /api/completes/:id/subtract** — Decrement count by 1 (floor at 0). Response: updated item.
- **POST /api/completes/reset-counts** — Set count = 0 for all campaigns for current user. Response: list of updated items.
- **POST /api/completes/reset-all** — Delete all campaigns (and counts) for current user. Response: `{ ok: true }`.

All endpoints require authentication; scope by `req.user.id`.

### 2.2 Reorder

- **Option A:** `PUT /api/completes/:id` with `sort_order`; client sends new order (e.g. after drag-and-drop, send PUT for each moved item with new sort_order).
- **Option B:** `PUT /api/completes/reorder` with body `{ order: [id1, id2, ...] }`; server updates sort_order by index. Prefer **Option B** for a single request on reorder.

### 2.3 File

- New file: `server/routes/completes.js`. Mount at `/api/completes` in `server/index.js`.

---

## 3. Frontend — Layout and placement

### 3.1 Right-side panel

- **Layout:** Main content (e.g. Dashboard) and Sidebar stay as-is. A **Completes panel** sits on the **right** of the main content area (so: Sidebar | Main | Completes). Use a fixed or sticky right column (e.g. 280–320px width) that scrolls independently if needed.
- **Visibility:** Show the Completes panel on routes where it makes sense (e.g. Dashboard, and optionally other pages). Could be always visible when logged in, or only on Dashboard—per product choice. Recommendation: show on Dashboard by default; optionally allow “pin” so it shows on other pages.
- **Collapse:** Optional narrow strip or icon to collapse the panel to an icon only (expand on click).

### 3.2 Pop out

- **Behavior:** A control (e.g. “Pop out” or window icon) opens the Completes UI in a separate window.
- **Implementation options:**
  - **A) New route + window.open:** Add a route (e.g. `/completes`) that renders only the Completes panel (no sidebar, full page or minimal chrome). User clicks “Pop out” → `window.open('/completes', 'completes', 'width=400,height=600')`. Both in-app panel and popout use the same API; state can go out of sync if user edits in both—acceptable for MVP or sync via refetch on focus.
  - **B) Same app, floating div:** Keep one React tree; “pop out” could open a second browser window and use postMessage or shared backend only (no shared React state)—complex.
- **Recommendation:** **Option A.** New route `/completes` that renders the Completes form only. “Pop out” opens that route in a new window. In the main app, the right panel can show the same UI (reuse the same component); both windows refetch on focus or on a short interval to stay in sync.

### 3.3 UI content of the panel (match “screenshot” behavior)

- **Header:** Title “Completes” and controls: Pop out (icon/link), maybe Collapse.
- **List of campaigns:** Each row: campaign name (editable inline or via edit icon), current count, **[−]** and **[+]** (or “Add”/“Subtract”) to decrement/increment. Optional: drag handle for reorder.
- **Add campaign:** Input + “Add” (or “+ Add Campaign”) to create a new campaign (count starts at 0).
- **Reorder:** Drag-and-drop or Up/Down buttons per row to change sort_order.
- **Actions:** 
  - **Reset All:** Reset all counts to 0 (keep campaigns). Calls `POST /api/completes/reset-counts`.
  - **Reset Everything:** Remove all campaigns and counts. Confirmation: “Are you sure? This will remove all campaigns.” Calls `POST /api/completes/reset-all`.

---

## 4. Frontend — Implementation details

### 4.1 Components

- **CompletesPanel** (or **CompletesForm**): The main UI block (list, add campaign, add/subtract, reset buttons). Used both in the right column and on the `/completes` pop-out page.
- **Dashboard (or App layout):** Renders the main content and, in a right column, `<CompletesPanel />`. Layout: flex with main flex-1 and right panel fixed width.
- **CompletesPage** (for `/completes`): Minimal layout (or no sidebar) that only renders `<CompletesPanel />` so the pop-out window has no sidebar.

### 4.2 Client API

- In `client/src/api/client.js`:  
  `getCompletes`, `createCompletesCampaign`, `updateCompletesCampaign`, `deleteCompletesCampaign`, `addComplete`, `subtractComplete`, `resetCompletesCounts`, `resetCompletesAll`, `reorderCompletes(order)`.

### 4.3 State and sync

- CompletesPanel fetches on mount and after mutations (create, update, delete, add, subtract, reset). If both main app and popout are open, refetch on window focus (or poll) so they stay in sync.

### 4.4 Routes

- **Main app:** No new route required for the in-app panel; it’s part of the Dashboard (or global layout) as a right column.
- **Pop out:** New route `/completes` that renders only the Completes panel (and maybe a small header “Completes” with “Close” to close the window). Guard with `RequireAuth`.

---

## 5. Implementation order (suggested)

1. **Schema & migration:** Add `completes_items` (or two tables) and migration in `server/db/`.
2. **Backend:** Implement `server/routes/completes.js` with all endpoints; mount in `server/index.js`.
3. **Client API:** Add completes methods in `client/src/api/client.js`.
4. **CompletesPanel component:** Build the form (list, add/edit/delete campaign, +/−, reset counts, reset all). No layout placement yet.
5. **Layout — right panel:** Integrate CompletesPanel into Dashboard (or main layout) as a right-side column.
6. **Pop out:** Add route `/completes`, page that renders only CompletesPanel; add “Pop out” button that opens `window.open('/completes', ...)`.
7. **Reorder:** Implement drag-and-drop or up/down and call reorder API.
8. **Polish:** Collapse/expand, refetch on focus for popout, error handling, loading states.

---

## 6. Out of scope / later

- Per-date completes (count per campaign per day) — can add `entry_date` and separate counts later if needed.
- Sync with time entries or EOD “completes” — currently separate; integration could be a follow-up.
- Multi-device real-time sync — refetch on focus is sufficient for MVP.

---

## 7. Acceptance criteria (summary)

- [ ] User sees a “Completes” panel on the right side of the main content (e.g. Dashboard).
- [ ] User can add, edit, and remove campaigns.
- [ ] User can reorder campaigns (e.g. drag or up/down).
- [ ] User can add or subtract one complete per campaign (count displayed and updated).
- [ ] “Reset All” sets all counts to 0 and keeps campaigns.
- [ ] “Reset Everything” removes all campaigns (with confirmation).
- [ ] User can open the Completes form in a separate window (“Pop out”).
- [ ] Data is persisted per user via the API and survives refresh.
