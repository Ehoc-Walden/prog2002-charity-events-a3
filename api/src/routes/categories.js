'use strict';

/**
 * @file Express router for the `/api/categories` resource.
 *
 *  GET    /api/categories                 Active categories (public site).
 *  GET    /api/categories?includeInactive=1  Every category (admin site).
 *  GET    /api/categories/:categoryId     One category.
 *  POST   /api/categories                 Create a category.
 *  PUT    /api/categories/:categoryId     Update a category.
 *  DELETE /api/categories/:categoryId     Delete, blocked while events use it.
 *
 * The task description asks the admin site to manipulate "event category data"
 * as well as events, so the collection is a full CRUD resource. Deleting is
 * refused while any event still references the category, which protects the
 * foreign key in the `events` table.
 */

const express = require('express');
const categoryService = require('../services/categoryService');
const { asyncHandler, HttpError } = require('../utils/http');
const { toId, validateCategoryPayload } = require('../utils/validation');

const router = express.Router();

/**
 * Parses and validates a `:categoryId` path parameter.
 *
 * @param {string} value Raw path parameter.
 * @returns {number} Validated category id.
 * @throws {HttpError} 400 when the value is not a positive integer.
 */
function categoryIdParam(value) {
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, 'Category ID must be a positive integer.');
  }
  return toId(value, 'categoryId');
}

/** GET /api/categories - list categories (active only unless asked otherwise). */
router.get('/', asyncHandler(async (req, res) => {
  const includeInactive = ['1', 'true', 'yes'].includes(String(req.query.includeInactive || '').toLowerCase());
  const categories = await categoryService.listCategories({ includeInactive });
  res.json({ data: categories, meta: { count: categories.length, includeInactive } });
}));

/** POST /api/categories - create a category. */
router.post('/', asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(validateCategoryPayload(req.body));
  res.status(201).json({ data: category });
}));

/** GET /api/categories/:categoryId - read a single category. */
router.get('/:categoryId', asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(categoryIdParam(req.params.categoryId));
  res.json({ data: category });
}));

/** PUT /api/categories/:categoryId - update a category. */
router.put('/:categoryId', asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    categoryIdParam(req.params.categoryId),
    validateCategoryPayload(req.body)
  );
  res.json({ data: category });
}));

/** DELETE /api/categories/:categoryId - delete an unused category. */
router.delete('/:categoryId', asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(categoryIdParam(req.params.categoryId));
  res.json({ data: result, meta: { message: 'Category deleted.' } });
}));

module.exports = router;
