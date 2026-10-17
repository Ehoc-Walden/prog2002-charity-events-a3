'use strict';

const express = require('express');
const db = require('../../event_db');
const { asyncHandler, HttpError } = require('../utils/http');

const router = express.Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await db.execute(`
    SELECT organisation_id, name, slug, tagline, mission, description,
           contact_email, contact_phone, website_url, logo_key
    FROM organisations
    WHERE is_active = 1
    ORDER BY name ASC
  `);

  res.json({
    data: rows.map((row) => ({
      id: row.organisation_id,
      name: row.name,
      slug: row.slug,
      tagline: row.tagline,
      mission: row.mission,
      description: row.description,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      websiteUrl: row.website_url,
      logo: row.logo_key
    }))
  });
}));

router.get('/:organisationId', asyncHandler(async (req, res) => {
  if (!/^\d+$/.test(req.params.organisationId)) {
    throw new HttpError(400, 'Organisation ID must be a positive integer.');
  }

  const [rows] = await db.execute(`
    SELECT organisation_id, name, slug, tagline, mission, description,
           contact_email, contact_phone, website_url, logo_key
    FROM organisations
    WHERE organisation_id = ? AND is_active = 1
    LIMIT 1
  `, [Number(req.params.organisationId)]);

  if (rows.length === 0) {
    throw new HttpError(404, 'Organisation not found.');
  }

  const row = rows[0];
  res.json({
    data: {
      id: row.organisation_id,
      name: row.name,
      slug: row.slug,
      tagline: row.tagline,
      mission: row.mission,
      description: row.description,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      websiteUrl: row.website_url,
      logo: row.logo_key
    }
  });
}));

module.exports = router;
