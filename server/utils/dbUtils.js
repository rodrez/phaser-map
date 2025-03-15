/**
 * Utility functions for database operations
 */

/**
 * Safely parse JSON from a database field
 * @param {string} jsonString - The JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} - Parsed object or default value
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
};

/**
 * Convert a database row to camelCase
 * @param {object} row - Database row with snake_case keys
 * @returns {object} - Object with camelCase keys
 */
export const toCamelCase = (row) => {
  if (!row) return null;
  
  const result = {};
  
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = row[key];
    }
  }
  
  return result;
};

/**
 * Convert an array of database rows to camelCase
 * @param {array} rows - Array of database rows
 * @returns {array} - Array of objects with camelCase keys
 */
export const rowsToCamelCase = (rows) => {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toCamelCase);
};

export default {
  safeJsonParse,
  toCamelCase,
  rowsToCamelCase
}; 