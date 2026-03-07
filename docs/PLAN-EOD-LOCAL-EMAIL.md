# Plan: EOD — Local Email (Preview + User’s Client)

**Goal:** Stop sending EOD from the server. Instead, compose the EOD email on the server, return it to the client, show a preview the user can edit, then open the user’s default email client (e.g. Outlook, Thunderbird, Apple Mail) so they send it from their own account.

---

## Current behavior (brief)

- **Dashboard:** “Send EOD” calls `POST /api/eod/send` with the selected date.
- **Server:** Loads entries for that date, picks EOD format by client types, fills subject/body from templates, sends via **nodemailer** using SMTP (Setup or env).
- **Result:** Email is sent from the server; no user preview or local client.

---

## Target behavior

1. User clicks **“EOD Email”** (or “Prepare EOD Email”) on the Dashboard.
2. App calls a **compose** endpoint that returns the draft email (to, cc, subject, body) — **no sending**, no SMTP required.
3. A **preview modal** opens with editable To, Cc, Subject, and Body.
4. User can change any field, then click **“Open in Email”**.
5. A **mailto:** link is opened so the user’s default mail client opens with the (possibly edited) draft; user sends from their own email locally.

---

## 1. Backend

### 1.1 Reuse “compose” logic

- **Refactor** the existing `POST /send` handler so that:
  - All steps up to building `subject` and `body` (and reading `to`/`cc` from the format) are in a **shared helper** (e.g. `composeEodPayload(date, userId)`).
  - That helper returns something like:
    - `{ to, cc, subject, body }` (and optionally `formatType` or `formatName` for the UI).
  - Validation stays the same: require at least one saved entry for the date, valid user, and an active EOD format for the inferred type.

### 1.2 New endpoint: compose (no SMTP)

- **GET or POST `/api/eod/compose`**
  - Query/body: `date` (optional, default today).
  - Response: `{ to, cc, subject, body }` (strings; `cc` may be empty).
  - Errors: same as today (no entries, no format, etc.) with appropriate status and `{ error: "..." }`.
  - **Does not** use `getEodEmailConfig()` or `getTransporter()`; no SMTP needed.

### 1.3 Existing “send” endpoint

- **Option A (recommended):** Remove `POST /api/eod/send` and all SMTP usage from the EOD flow so the only path is compose → preview → mailto.
- **Option B:** Keep `POST /api/eod/send` as an optional “send from server” path when SMTP is configured; default UI uses only compose + mailto.

For “send using user’s own email locally,” Option A keeps the app simple and avoids storing SMTP credentials. We can still keep the **Setup → EOD Email Server & User** section for a future “send from server” if you add it back later.

---

## 2. Frontend

### 2.1 API

- Add `composeEod(date)` that calls the new compose endpoint and returns `{ to, cc, subject, body }`.
- If we remove server send: remove or repurpose `sendEod` (e.g. delete from `client.js` and from the Dashboard).

### 2.2 Dashboard button

- Change button label from “Send EOD” to something like **“EOD Email”** or **“Prepare EOD Email”**.
- On click:
  - If there are no saved entries for the date, show the same validation message as today (“Save at least one entry before…”).
  - Call `composeEod(date)`; on success open the preview modal with the returned values; on error show the API error message.

### 2.3 EOD Preview modal

- **Content:**
  - **To** — single-line input (or textarea if you want to support multiple addresses), pre-filled from compose.
  - **Cc** — same, pre-filled.
  - **Subject** — single-line input, pre-filled.
  - **Body** — multiline textarea, pre-filled.
- **Actions:**
  - **“Open in Email”** — build a `mailto:` URL with `to`, `cc`, `subject`, `body` (properly encoded with `encodeURIComponent`). Open via `window.location.href = mailtoUrl` or `window.open(mailtoUrl)`. Then close the modal (or leave it open so user can open again with updated fields).
  - **“Copy to clipboard”** (optional) — copy body (and maybe subject) so if mailto fails or has length limits, user can paste into their client.
  - **“Close”** — close modal without opening mailto.
- **UX:** Modal can be a simple overlay with the four fields and the two (or three) buttons. No need for “Send” from the app — sending is always from the user’s client.

### 2.4 mailto notes

- Some browsers/clients impose length limits on `mailto` (especially body). If the body is very long, we can:
  - Still open mailto with a truncated body and show a note (“Body was truncated; copy from below if needed”), and/or
  - Rely on “Copy to clipboard” for the full body.

---

## 3. Setup and docs

- **Setup → EOD Email Server & User:** If we remove server send (Option A), this section can be hidden or marked as “Optional – for future server sending.” If we keep send (Option B), leave it as is for the optional server path.
- **README / docs:** State that EOD is “compose and open in your default email client”; no server SMTP required for the main flow. Mention that To/Cc/Subject/Body come from EOD formats and client mapping, and that the user can edit the draft before opening their email client.

---

## 4. Implementation order

| Step | Task |
|------|------|
| 1 | Backend: Extract `composeEodPayload(date, userId)` in `server/routes/eod.js`; implement `GET` or `POST /api/eod/compose` that returns `{ to, cc, subject, body }`. |
| 2 | Backend: Remove `POST /api/eod/send` (or keep and document as optional). Remove SMTP usage from the default EOD flow. |
| 3 | Client API: Add `composeEod(date)`; remove or keep `sendEod` per chosen option. |
| 4 | Dashboard: Replace “Send EOD” with “EOD Email”; on click call `composeEod(date)` and open preview modal with response. |
| 5 | New component: EOD preview modal (editable To, Cc, Subject, Body; “Open in Email” via mailto, “Close”; optional “Copy”). |
| 6 | Setup/README: Update text so EOD is described as local email + preview; adjust or hide SMTP section if we dropped server send. |

---

## 5. Summary

- **Server:** New compose endpoint returns draft `{ to, cc, subject, body }`; no SMTP needed for the main flow. Optionally remove `/eod/send` and SMTP from this flow.
- **Client:** One button (“EOD Email”) → compose → show modal with editable preview → “Open in Email” opens mailto so the user sends from their own email locally. Optional “Copy” for long bodies or problematic mailto limits.

This gives you “send using the user’s own email locally” and “email window open with a preview so manual changes can be made before the user sends it” as requested.
