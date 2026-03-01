# Plan: Issue #9 — Admin Edit form

**Goal:** A form that allows an admin to edit all available daily data entered by a user. Add / edit / delete / insert data.

**Scope:** “Daily data” = time entries (`time_entries`). Admins need a dedicated UI to pick a user and a date, then manage that user’s time entries for that day (view, add, edit, delete, insert new rows).

---

## Current state

- **API**
  - `GET /api/time-entries?date=&user_id=` — admins can pass `user_id` to load another user’s entries; non-admins are restricted to their own.
  - `PUT /api/time-entries/:id` and `DELETE /api/time-entries/:id` — admins can already edit/delete any user’s entry.
  - `POST /api/time-entries` — always creates the entry for `req.user.id`; there is no way for an admin to create an entry on behalf of another user.

- **UI**
  - Dashboard shows only the current user’s entries for a single date; it does not pass `user_id` to the API.
  - Reports let admins filter by user for read-only summary/export.
  - No dedicated “admin edit user’s time” page.

- **Reuse**
  - `TimeRow`, `ClientSummary`, date picker, clients/projects loading are all reusable for an admin edit view.

---

## 1. Backend

### 1.1 POST /api/time-entries — allow admin to set `user_id`

- **Change:** Accept optional `user_id` in the request body.
- **Rules:**
  - If `user_id` is present and the requester is **admin**, use `user_id` as the entry’s `user_id` (validate that the user exists and is active).
  - Otherwise ignore `user_id` and use `req.user.id` (current behavior).
- **Validation:** If `user_id` is provided and requester is admin, ensure the target user exists and is active; otherwise return 400.

**File:** `server/routes/timeEntries.js` (in the `router.post('/', ...)` handler).

---

## 2. Frontend — Admin Edit page

### 2.1 New page: “Edit User Time” (admin-only)

- **Route:** `/admin/edit-time` (or `/edit-time`).
- **Guard:** Render only if `user.is_admin`; otherwise redirect (e.g. to `/`) or show “Admin only”.
- **Layout:** Same structure as Dashboard: date picker + table of time rows + “+ Add Entry” + optional summary.

### 2.2 Page behavior

1. **User selector** (dropdown)
   - Load active users via `api.getUsers()` (already used in Reports).
   - Required before loading entries; default to first user or empty “Select user”.
   - When user or date changes, reload entries for that user and date.

2. **Date**
   - Single date picker (same as Dashboard). Entries shown for selected user + this date.

3. **Data loading**
   - `api.getTimeEntries(date, selectedUserId)` when both user and date are set.
   - Load clients and projects once (same as Dashboard).

4. **Table**
   - Reuse `TimeRow` with the same props: `entry`, `clients`, `allProjects`, `onSave`, `onDelete`.
   - Rows show client, project, start, stop, sales, duration, notes; Save / Del per row.

5. **Add entry**
   - “+ Add Entry” appends a new blank row for the selected date.
   - On save of a new row, call `api.createTimeEntry({ ...payload, user_id: selectedUserId })` so the backend creates the entry for the selected user (backend change in §1).

6. **Edit / delete**
   - Existing `api.updateTimeEntry(id, payload)` and `api.deleteTimeEntry(id)` already allow admin to edit/delete any entry; no API change needed. Ensure the page passes the same payload shape as Dashboard (no need to send `user_id` on update).

7. **Insert**
   - Interpret “insert” as “add a new row” (same as “+ Add Entry”). If you later need “insert between two rows” (e.g. by `start_time` or order), that can be a follow-up (e.g. default start_time to slot between two entries). For this issue, add/insert = one new row.

8. **Optional:** Reuse `ClientSummary` and `DateHistorySidebar` if useful (e.g. show summary for selected user’s day; history could be scoped to selected user in a later iteration).

### 2.3 Files to add/change

| Action | File |
|--------|------|
| Add | `client/src/pages/AdminEditTime.jsx` — new page with user dropdown, date, table (reuse `TimeRow`), add row, load/save/delete using `user_id` where needed. |
| Change | `client/src/App.jsx` — add route for `/admin/edit-time` with admin-only guard (e.g. `RequireAdmin` or inline check). |
| Change | `client/src/components/Sidebar.jsx` — add “Edit User Time” (or “Admin Edit”) link visible only when `user.is_admin`. |
| Change | `client/src/api/client.js` — ensure `createTimeEntry` can accept `user_id` in the payload (no signature change; backend will read it). |

### 2.4 Admin-only route

- Option A: New wrapper `RequireAdmin`: redirect to `/` if `!user.is_admin`, else render children.
- Option B: Inside the page component, if `!user.is_admin` return `<Navigate to="/" replace />` (or a “Forbidden” message).

Use the same pattern as `RequireAuth` for consistency (Option A recommended).

---

## 3. Implementation order

1. **Backend:** Implement optional `user_id` in `POST /api/time-entries` with admin check and validation.
2. **API client:** Confirm `createTimeEntry` sends body as-is (so `user_id` is included when the admin page sends it).
3. **Admin page:** Create `AdminEditTime.jsx` (user dropdown, date, load entries with `user_id`, table with `TimeRow`, add row, save/delete; create with `user_id`).
4. **Routing:** Add `/admin/edit-time` route and `RequireAdmin` (or equivalent).
5. **Nav:** Add sidebar link “Edit User Time” for admins only.
6. **Smoke test:** As admin, select user, pick date, add/edit/delete/insert (add) entries and confirm they are stored for the selected user.

---

## 4. Out of scope / later

- **Audit log:** No requirement to log “admin X edited user Y’s entry” for this issue; can be a separate enhancement.
- **Bulk operations:** Only single-row add/edit/delete (and “insert” as add) for this plan.
- **Date range view:** Single-date view only; range could be a future improvement.
- **Permissions:** No new roles; “admin” remains the only role that can use this form.

---

## 5. Acceptance criteria (summary)

- [ ] Admin can open “Edit User Time” from the sidebar.
- [ ] Admin can select a user and a date.
- [ ] Admin sees that user’s time entries for that date in a table (same columns as Dashboard).
- [ ] Admin can add a new entry for that user and date (new row, save).
- [ ] Admin can edit existing entries (change client, project, times, sales, notes; save).
- [ ] Admin can delete entries.
- [ ] Non-admins do not see the “Edit User Time” link and cannot access the page (redirect or forbidden).
- [ ] New entries created by admin on this page are stored with the selected user’s `user_id`.
