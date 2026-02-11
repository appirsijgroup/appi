export function toCamelCase<T>(obj: unknown): T {
    if (obj === null || typeof obj === 'undefined') return obj as T;
    if (Array.isArray(obj)) return obj.map(toCamelCase) as unknown as T;
    if (typeof obj !== 'object') return obj as T;

    const source = obj as Record<string, unknown>;
    const converted: Record<string, unknown> = {};
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            // Only convert the KEY string, not the VALUE
            const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
            // Recursive call for object values, but don't convert string values
            const value = source[key];
            converted[camelKey] = (typeof value === 'object' && value !== null) ? toCamelCase(value) : value;
        }
    }
    return converted as T;
}

export function toSnakeCase<T>(obj: unknown): T {
    if (obj === null || typeof obj === 'undefined') return obj as T;
    // Restore string conversion for toSnakeCase (needed for column mapping)
    if (typeof obj === 'string') {
        return obj.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`) as unknown as T;
    }
    if (Array.isArray(obj)) return obj.map(toSnakeCase) as unknown as T;
    if (typeof obj !== 'object') return obj as T;

    const source = obj as Record<string, unknown>;
    const converted: Record<string, unknown> = {};
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            converted[snakeKey] = toSnakeCase(source[key]);
        }
    }
    return converted as T;
}
