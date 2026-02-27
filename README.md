# TimeKeep

Web-based time tracking app for OMI. Log client/project hours in a spreadsheet-style interface, export CSV/Excel, and generate printable reports.

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
Access at http://localhost:3001 (or whatever PORT you set).

## Project Structure

```
TimeKeep/
├── server/           # Node.js + Express API
│   ├── db/           # SQLite schema + connection
│   ├── routes/       # auth, clients, projects, timeEntries, reports
│   └── middleware/   # JWT auth
├── client/           # React + Vite + Tailwind frontend
│   └── src/
│       ├── api/      # Fetch wrapper
│       ├── context/  # Auth context
│       ├── components/
│       └── pages/
├── .env.example
└── timekeep.db       # Created automatically on first run (gitignored)
```

## Features

- Login with JWT tokens (12h expiry)
- Dashboard: date picker, spreadsheet time entry rows
- Quarter-hour rounding (>=7.5 min remainder rounds up)
- Client/Project setup with soft-delete (inactive flag preserves history)
- Reports: date range + client filter, CSV/Excel/print export
- Admin users can view all coworkers' entries in reports

## Adding a New User

```bash
node -e "
const bcrypt = require('bcrypt');
const db = require('better-sqlite3')('./timekeep.db');
const hash = bcrypt.hashSync('yourpassword', 10);
db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)').run('jane', hash, 'Jane Smith');
console.log('Done');
"
```
