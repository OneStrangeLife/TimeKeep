require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDb } = require('./db/database');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const timeEntryRoutes = require('./routes/timeEntries');
const reportRoutes = require('./routes/reports');
const payPeriodRoutes = require('./routes/payPeriods');
const infoRoutes = require('./routes/info');
const userRoutes = require('./routes/users');
const linkRoutes = require('./routes/links');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pay-periods', payPeriodRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/links', linkRoutes);

// Serve built React app in production
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  const index = path.join(publicDir, 'index.html');
  res.sendFile(index, err => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

initDb();

app.listen(PORT, () => {
  console.log(`TimeKeep server running on http://localhost:${PORT}`);
});
