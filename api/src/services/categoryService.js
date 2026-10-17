'use strict';

/**
 * @file Business logic for event categories.
 *
 * The Assessment 3 task description asks the admin site to be able to
 * "manipulate charity events and event category data", so categories get the
 * same CRUD treatment as events. Deleting a category that is still used by an
 * event is blocked for the same data-integrity reason as events.
 */

const db = require('../../event_db');
const { HttpError } = require('../utils/http');

const CATEGORY_SELECT = `
  SELECT
    c.category_id,
    c.name,
    c.slug,
    c.description,
    c.accent_colour,
    c.icon_key,
    c.is_active,
    c.created_at,
    (SELECT COUNT(*) FROM events e WHERE e.category_id = c.category_id) AS event_count
  FROM categories c
`;

/**
 * Converts a category row into the JSON shape used by both websites.
 *
 * @param {object} row Raw categories row.
 * @returns {object} Category in the public API shape.
 */
function mapCategory(row) {
  return {
    id: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    accentColour: row.accent_colour,
    iconKey: row.icon_key,
    isActive: Boolean(row.is_active),
    eventCount: row.event_count === undefined ? undefined : Number(row.event_count)
  };
}

/**
 * Lists categories, optionally including deactivated ones.
 *
 * @param {{ includeInactive?: boolean }} [options] Admin passes `includeInactive: true`.
 * @returns {Promise<Array<object>>} Categories ordered by name.
 */
async function listCategories(options = {}) {
  const where = options.includeInactive ? '' : 'WHERE c.is_active = 1';
  const [rows] = await db.execute(`${CATEGORY_SELECT} ${where} ORDER BY c.name ASC`);
  return rows.map(mapCategory);
}

/**
 * Creates a category.
 *
 * @param {object} payload Output of `validateCategoryPayload`.
 * @returns {Promise<object>} The created category.
 * @throws {HttpError} 409 when the slug or name already exists.
 */
async function createCategory(payload) {
  try {
    const [result] = await db.execute(
      `INSERT INTO categories (name, slug, description, accent_colour, icon_key, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payload.name, payload.slug, payload.description, payload.accentColour, payload.iconKey, payload.isActive ? 1 : 0]
    );
    return getCategoryById(result.insertId);
  } catch (error) {
    throw translateCategoryError(error);
  }
}

/**
 * Updates a category.
 *
 * @param {number} categoryId Category primary key.
 * @param {object} payload Output of `validateCategoryPayload`.
 * @returns {Promise<object>} The updated category.
 * @throws {HttpError} 404 when missing, 409 on duplicate slug/name.
 */
async function updateCategory(categoryId, payload) {
  try {
    const [result] = await db.execute(
      `UPDATE categories
       SET name = ?, slug = ?, description = ?, accent_colour = ?, icon_key = ?, is_active = ?
       WHERE category_id = ?`,
      [payload.name, payload.slug, payload.description, payload.accentColour, payload.iconKey, payload.isActive ? 1 : 0, categoryId]
    );
    if (result.affectedRows === 0) throw new HttpError(404, 'Category not found.');
    return getCategoryById(categoryId);
  } catch (error) {
    throw translateCategoryError(error);
  }
}

/**
 * Deletes a category that is not referenced by any event.
 *
 * @param {number} categoryId Category primary key.
 * @returns {Promise<{id:number}>} The deleted id.
 * @throws {HttpError} 404 when missing, 409 when events still use it.
 */
async function deleteCategory(categoryId) {
  const [rows] = await db.execute(
    'SELECT c.name, (SELECT COUNT(*) FROM events e WHERE e.category_id = c.category_id) AS event_count FROM categories c WHERE c.category_id = ? LIMIT 1',
    [categoryId]
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, 'Category not found.');
  if (Number(row.event_count) > 0) {
    throw new HttpError(409, `"${row.name}" cannot be deleted because ${row.event_count} event(s) still use it.`, {
      eventCount: Number(row.event_count)
    });
  }
  await db.execute('DELETE FROM categories WHERE category_id = ?', [categoryId]);
  return { id: categoryId };
}

/**
 * Loads one category by primary key.
 *
 * @param {number} categoryId Category primary key.
 * @returns {Promise<object>} The category.
 * @throws {HttpError} 404 when missing.
 */
async function getCategoryById(categoryId) {
  const [rows] = await db.execute(`${CATEGORY_SELECT} WHERE c.category_id = ? LIMIT 1`, [categoryId]);
  if (!rows[0]) throw new HttpError(404, 'Category not found.');
  return mapCategory(rows[0]);
}

/**
 * Converts duplicate-key database errors into a friendly 409 response.
 *
 * @param {Error & {code?: string}} error Error thrown by mysql2.
 * @returns {Error} Original error or a translated HttpError.
 */
function translateCategoryError(error) {
  if (error instanceof HttpError) return error;
  if (error.code === 'ER_DUP_ENTRY') {
    return new HttpError(409, 'A category with that name or slug already exists.');
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new HttpError(409, 'This category is still used by one or more events.');
  }
  return error;
}

module.exports = {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  mapCategory,
  updateCategory
};
