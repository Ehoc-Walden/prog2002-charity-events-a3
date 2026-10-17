'use strict';

const express = require('express');
const db = require('../../event_db');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await db.execute(`
    SELECT DISTINCT v.suburb, v.state_code
    FROM venues v
    JOIN events e ON e.venue_id = v.venue_id
    WHERE e.status = 'published'
    ORDER BY v.suburb ASC
  `);

  res.json({
    data: rows.map((row) => ({
      suburb: row.suburb,
      stateCode: row.state_code,
      label: `${row.suburb}, ${row.state_code}`
    }))
  });
}));

module.exports = router;
