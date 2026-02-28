const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { name, version } = require('../../package.json');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ name, version });
});

module.exports = router;
