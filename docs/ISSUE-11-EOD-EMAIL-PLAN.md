# Plan: Issue #11 — Add email functionality for EOD (End of Day) reports

**Goal:** Allow users to send End of Day report emails based on their time entries. Email format depends on which client(s) they worked (VICI, CMG, Reach, Reach+VICI, or daytime). Managers can configure EOD formats and client mapping in Setup.

---

## Requirements summary (from issue)

- **VICI only:** To: Lenora Lautos, Cc: Lee Brottman. Subject: EOD d/m. Body: Campaign, Hours, Completes, Date.
- **CMG only:** To: OMI. Subject: EOD d/m. Body: [User name], Campaign 3198 CTC CMG, Hours, Completes, Date.
- **Reach only:** To: Lenora Lautos, Cc: Lee Brottman. Subject: EOD d/m. Body: Campaign - Reach, Hours, Completes, Date.
- **Reach + VICI:** Same To/Cc, one email with two campaign blocks (Reach block then VICI block), then Date.
- **Daytime (variable):** To: configurable. Subject: EOD d/m. Body: Campaign, Hours, Completes, Date.
- **Dashboard:** Button for the user to send EOD at end of day.
- **Setup:** Form for managers to add/edit/delete EOD email formats (and configure which clients map to which format type).

---

## 1. Data model

### 1.1 New tables

**`eod_formats`** — one row per email “scenario” (VICI, CMG, Reach, Reach+VICI, Daytime).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| name | TEXT | Display name (e.g. "VICI", "CMG", "Reach", "Reach + VICI", "Daytime") |
| type | TEXT | Key for logic: `vici`, `cmg`, `reach`, `reach_and_vici`, `daytime` |
| to_addresses | TEXT | Comma-separated or semicolon To list |
| cc_addresses | TEXT | Optional Cc list |
| subject_template | TEXT | e.g. "EOD {{d}}/{{m}}" → day/month from date |
| body_template | TEXT | Placeholders: {{Campaign}}, {{Hours}}, {{Completes}}, {{Date}}, {{UserName}}; for reach_and_vici, support two blocks (e.g. {{ReachBlock}}, {{ViciBlock}}) or single combined template |
| sort_order | INTEGER | For display order |
| active | INTEGER | 1 = use, 0 = disabled |

**`eod_client_types`** — maps client to EOD format type so the app knows “this client is VICI”, “this client is Reach”, etc.

| Column | Type | Description |
|--------|------|-------------|
| client_id | INTEGER FK → clients(id) | |
| eod_type | TEXT | One of: `vici`, `cmg`, `reach`, `daytime` |

- One row per client that should trigger a specific EOD type; clients not listed default to `daytime` (or no EOD).
- Enables managers to assign “VICI”, “CMG”, “Reach” to the right clients without hardcoding names.

### 1.2 Schema location

- Add to `server/db/schema.sql` (new `CREATE TABLE` blocks) or use a migration in `server/db/` so existing DBs get the tables (e.g. migration that creates tables if not exist).

---

## 2. Backend — email sending

### 2.1 Dependencies and config

- **Library:** Add `nodemailer` (or similar) for SMTP.
- **Env:** e.g. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EOD_FROM` (from address). If not set, EOD feature can be disabled or return a clear error.

### 2.2 EOD send logic (high level)

1. **Input:** Authenticated user, optional `date` (default today).
2. **Load:** User’s time entries for that date; join clients and projects so each entry has `client_name`, `project_name`, `duration_hours`, `sales_count`, etc.
3. **Group:** By client (and optionally by project for “Campaign”).
4. **Resolve type:** For each client, look up `eod_client_types` → `eod_type`. If not found, treat as `daytime`.
5. **Choose format(s):**
   - Only one client type (vici, cmg, reach, daytime) → use that format (one email).
   - Both Reach and VICI present → use `reach_and_vici` format (one email with two blocks).
   - Mix including daytime → use daytime format for daytime clients; other types as above.
6. **Fill templates:** Replace placeholders (Campaign = project name or client+project, Hours = sum, Completes = sales count, Date = mm/dd/yyyy, UserName = display_name). For reach_and_vici, build Reach block and VICI block then inject into template.
7. **Send:** Use nodemailer to send the composed email(s). Return success or error (e.g. “EOD sent” or “No entries for this date” / “No format configured”).

### 2.3 API

- **POST /api/eod/send** (authenticated)
  - Body: `{ "date": "YYYY-MM-DD" }` (optional; default today).
  - Response: `{ "ok": true, "message": "EOD sent" }` or 4xx with `{ "error": "..." }`.
  - Implement in e.g. `server/routes/eod.js`, mounted at `/api/eod`.

---

## 3. Backend — EOD formats and client mapping (CRUD)

- **GET /api/eod/formats** — list active EOD formats (for Setup and for send logic).
- **POST /api/eod/formats** — create format (admin only).
- **PUT /api/eod/formats/:id** — update format (admin only).
- **DELETE /api/eod/formats/:id** — delete or deactivate (admin only).

- **GET /api/eod/client-types** — list client_id → eod_type mapping (for Setup).
- **PUT /api/eod/client-types** — set mapping (admin only). Body: e.g. `{ "client_id": 1, "eod_type": "vici" }` or bulk `[{ "client_id": 1, "eod_type": "vici" }, ...]`. Replace or merge as needed so managers can assign one type per client.

(Alternative: single “settings” endpoint that returns/updates formats + client types; either approach is fine.)

---

## 4. Frontend — Dashboard “Send EOD” button

- **Placement:** On the Dashboard (e.g. near the date picker or above/below the time sheet), a button: **“Send EOD”** or **“Send End of Day Report”**.
- **Behavior:**
  - On click: optional confirmation (“Send EOD report for [date]?”). Then call `POST /api/eod/send` with the currently selected date (or always today, per product choice).
  - On success: show a short success message (e.g. “EOD report sent.”).
  - On error: show error message (e.g. “No format configured for this day’s clients”, “Email failed”, “No entries for this date”).
- **State:** Disable button while request in flight; optionally hide or disable if no entries for the date (optional UX).

---

## 5. Frontend — Setup (EOD formats and client mapping)

- **Access:** Admin only (e.g. under Maintenance or its own Setup section).
- **Two parts:**

  **5.1 EOD Email Formats**
  - List existing formats (table or cards): name, type, To, Cc, subject preview.
  - Add new format: form with Name, Type (dropdown: VICI, CMG, Reach, Reach + VICI, Daytime), To, Cc, Subject template, Body template (textarea). Save → POST or PUT.
  - Edit / Delete per row.

  **5.2 Client → EOD type mapping**
  - List clients with a dropdown per client: “EOD type” = None / VICI / CMG / Reach / Daytime. Save → PUT client-types so backend stores which client maps to which type. This drives which format is used when that client appears in the user’s day.

- **Validation:** Required fields (e.g. To, subject, body for each format); type must be one of the enum values.

---

## 6. Implementation order (suggested)

1. **Schema:** Add `eod_formats` and `eod_client_types` (schema + migration if needed).
2. **Backend CRUD:** Routes for formats and client-types (GET/POST/PUT/DELETE as above), admin-only where specified.
3. **Backend send:** Nodemailer + env config; implement format selection and template filling; POST /api/eod/send.
4. **Client API:** Add `getEodFormats`, `saveEodFormat`, `deleteEodFormat`, `getEodClientTypes`, `saveEodClientTypes`, `sendEod(date)` in `client/src/api/client.js`.
5. **Dashboard:** Add “Send EOD” button and success/error handling.
6. **Setup:** Add EOD formats section and client-type mapping section; wire to API.

---

## 7. Out of scope / later

- **Scheduling:** No automatic “send at 5pm”; user-initiated only for this issue.
- **Attachments:** Issue describes body-only emails; attachments (e.g. CSV) can be a follow-up.
- **Multiple recipients per format:** To/Cc are stored in the format; no per-user recipient overrides in this plan.
- **Preview:** Optional “Preview EOD” before send can be added later (e.g. same API with `dry_run: true` returning composed subject/body).

---

## 8. Acceptance criteria (summary)

- [ ] Managers can add/edit/delete EOD email formats in Setup (type, To, Cc, subject, body templates).
- [ ] Managers can assign each client to an EOD type (VICI, CMG, Reach, Daytime) in Setup.
- [ ] User can click “Send EOD” on the Dashboard for the selected date (or today).
- [ ] For that date’s entries, the correct format(s) are chosen (VICI only, CMG only, Reach only, Reach+VICI, or daytime).
- [ ] Email is sent with the correct To/Cc, subject (e.g. EOD d/m), and body filled with Campaign, Hours, Completes, Date (and UserName where applicable).
- [ ] If no entries or no format applies, user sees a clear message; no email is sent (or only for the formats that do apply).
