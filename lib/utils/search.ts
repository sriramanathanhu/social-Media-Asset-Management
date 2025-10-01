// Utility for case-insensitive search with PostgreSQL and SQLite

export function buildSearchConditions(search: string, fields: string[]) {
  if (!search) return undefined;

  type SearchCondition = { [key: string]: { contains: string; mode?: 'insensitive' } };
  const conditions: SearchCondition[] = [];

  fields.forEach(field => {
    // For PostgreSQL, use mode: 'insensitive' for case-insensitive search
    // This also works with SQLite
    conditions.push(
      { [field]: { contains: search, mode: 'insensitive' } }
    );
  });

  return conditions;
}

// Alternative: Use startsWith for better performance with indexes
export function buildSearchConditionsStartsWith(search: string, fields: string[]) {
  if (!search) return undefined;

  type SearchCondition = { [key: string]: { startsWith: string; mode?: 'insensitive' } };
  const conditions: SearchCondition[] = [];

  fields.forEach(field => {
    // For PostgreSQL, use mode: 'insensitive' for case-insensitive search
    // This also works with SQLite
    conditions.push(
      { [field]: { startsWith: search, mode: 'insensitive' } }
    );
  });

  return conditions;
}