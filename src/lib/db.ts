import { Pool, QueryResult, QueryResultRow } from 'pg';

// Use the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('⚠️ DATABASE_URL is not defined in environment variables. Database connections will fail.');
}

// Create a connection pool
// This manages multiple connections for us automatically
const pool = new Pool({
    connectionString,
    // Optional: SSL configuration if needed for production (often needed for cloud DBs, but maybe not for local)
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

/**
 * Validates the database connection.
 * Useful to call once at startup to ensure everything is wired correctly.
 */
export async function testConnection() {
    try {
        const client = await pool.connect();
        // Successfully connected to database - log removed for production
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Failed to connect to local PostgreSQL database:', err);
        return false;
    }
}

/**
 * Execute a query against the database.
 * Use this for simple, one-off queries.
 * @param text The SQL query string
 * @param params Optional array of parameters for prepared statements ($1, $2, etc.)
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // Log slow queries (> 1s)
        // Slow query warning removed/silenced for production to avoid log pollution
        return res;
    } catch (error) {
        console.error('Error executing query', { text, error });
        throw error;
    }
};

/**
 * Get a client from the pool for transactions.
 * Don't forget to call client.release() when done!
 */
export const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Monkey patch release to track accidental leaks if needed in future
    return client;
};

export default pool;
