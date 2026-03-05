# TimeKeep

Web-based time tracking app for OMI. Log client/project hours in a spreadsheet-style interface, track completes by campaign, send End of Day (EOD) emails, export CSV/Excel, and generate printable reports.

## Quick Start

### 1. Install dependencies
```bash
npm install
npm --prefix client install
```

### 2. Create your .env file
```bash
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

### 3. Run in development mode
```bash
npm run dev
```
- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001  

Default login: **admin / admin123** (change this after first login)

## Production Build

Build the React app and serve everything from Express on one port:
```bash
npm run build
npm start
```
Access at http://localhost:3001 (or whatever `PORT` you set in `.env`).

### Production checklist

- [ ] Set **`JWT_SECRET`** in the environment to a long, random value (never use the default).
- [ ] Set **`CLIENT_URL`** to your frontend origin (e.g. `https://timekeep.example.com`) if different from the server.
- [ ] Set **`NODE_ENV=production`** when running the server.
- [ ] Run **`npm audit`** (root and `client/`) after dependency changes. Use **`npm audit fix`** in the project root and in `client/` when you’re okay with the proposed changes. (Root: `tar` advisories are from `better-sqlite3`’s install tooling; client: `npm audit fix --force` would upgrade to Vite 7 and may introduce breaking changes.)
- [ ] Change the default admin password after first login.

## Project Structure

```
TimeKeep/
├── server/                 # Node.js + Express API
│   ├── db/                 # SQLite schema, migrations, connection
│   ├── routes/             # API route modules
│   │   ├── auth.js
│   │   ├── clients.js
│   │   ├── projects.js
│   │   ├── timeEntries.js
│   │   ├── reports.js
│   │   ├── payPeriods.js
│   │   ├── users.js
│   │   ├── links.js
│   │   ├── scripts.js
│   │   ├── eod.js          # EOD formats, client mapping, email settings, send
│   │   ├── completes.js    # Completes tally (campaigns + counts)
│   │   └── info.js
│   └── middleware/         # JWT auth, requireAdmin
├── client/                 # React 18 + Vite 5 + Tailwind CSS
│   └── src/
│       ├── api/            # API client (client.js)
│       ├── context/       # Auth context
│       ├── components/    # TimeRow, ClientSummary, CompletesPanel, Sidebar, etc.
│       └── pages/         # Dashboard, Setup, Reports, Links, Scripts, etc.
├── docs/                  # Plan docs (e.g. ISSUE-13-COMPLETES-TALLY-PLAN.md)
├── .env.example
└── timekeep.db            # Created automatically on first run (gitignored)
```

## Features

### Core
- **Login** — JWT auth (12h expiry).
- **Dashboard** — Date picker, time entry table (client, project, start/stop, sales count, quarter-hour time, notes). Add/save/delete entries. Date history sidebar for quick date jump.
- **Quarter-hour rounding** — Time rounded to quarter hours (≥7.5 min remainder rounds up).
- **Clients & projects** — Managed in Setup; soft-delete (inactive) keeps history.

### Completes (Complete Tally)
- **Completes panel** on the Dashboard (below the Daily Summary): add campaigns, increment/decrement “completes” per campaign, reorder (up/down), edit names, remove campaigns.
- **Reset counts** — Set all campaign counts to 0; campaigns stay.
- **Reset everything** — Remove all campaigns (with confirmation).
- **Pop out** — Open the Completes form in a separate window (e.g. for a second screen). Data refetches on focus to stay in sync.

### End of Day (EOD) email
- **Send EOD** — Button on the Dashboard sends an EOD report email for the selected date based on the user’s time entries and client types (VICI, CMG, Reach, Reach+VICI, Daytime).
- **Setup → EOD Email Formats** — Admins define formats (To, Cc, subject/body templates) per type.
- **Setup → EOD Client Mapping** — Admins assign each client to an EOD type.
- **Setup → EOD Email Server & User** — Admins configure SMTP (host, port, user, password, from address). If left blank, the app falls back to env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EOD_FROM`.

### Reports & export
- **Reports** — Date range and optional client filter; summary view.
- **Export** — CSV, Excel, and printable report. Admin users can filter by any user; others see only their own data.

### Maintenance (Setup)
- **Clients & projects** — Add, edit, deactivate.
- **Pay periods** — Add, edit, delete; generate pay periods for a year.
- **Users** — Add users, edit display name, set admin flag, change password (admin only).
- **EOD** — Email formats, client→type mapping, SMTP/server settings (see above).
- **Links** — Optional links list (e.g. external Completes site).

### Other
- **Scripts** — User scripts (e.g. teleprompter content).
- **Admin Edit Time** — Admins can pick a user and date and add/edit/delete that user’s time entries for that day.
- **Teleprompter** — Route to run a script in full-screen teleprompter mode.
- **About** — App info.

## Environment

| Variable     | Description |
|-------------|-------------|
| `PORT`      | Server port (default 3001). |
| `JWT_SECRET`| Secret for signing JWTs. **Required;** use a long random value. |
| `CLIENT_URL`| Allowed CORS origin (e.g. `http://localhost:5173` in dev). |
| `DB_PATH`   | Path to SQLite DB (default `./timekeep.db`). |
| EOD (optional) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EOD_FROM`. Can also be set in Setup → EOD Email Server & User. |

## Adding a New User

From the project root (with dependencies installed):

```bash
node -e "
const bcrypt = require('bcrypt');
const db = require('better-sqlite3')('./timekeep.db');
const hash = bcrypt.hashSync('yourpassword', 10);
db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)').run('jane', hash, 'Jane Smith');
console.log('Done');
"
```

Or use **Setup → Users** (admin only) to add users and set passwords.
