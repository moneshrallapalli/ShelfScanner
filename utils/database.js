require('dotenv').config();
const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shelf_scanner',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  
  // Connection pool settings
  max: 20, // maximum number of clients in pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Query executed:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Query error:', { text, duration, error: error.message });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<object>} Database client
 */
async function getClient() {
  const client = await pool.connect();
  
  const originalQuery = client.query;
  const originalRelease = client.release;
  
  // Add query logging to client
  client.query = (...args) => {
    const start = Date.now();
    return originalQuery.apply(client, args).finally(() => {
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('Client query executed:', { duration, query: args[0] });
      }
    });
  };
  
  // Ensure client is released even if there's an error
  client.release = (err) => {
    if (err) {
      console.error('Error releasing client:', err);
    }
    return originalRelease.call(client, err);
  };
  
  return client;
}

/**
 * Execute a transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

/**
 * Get database statistics
 * @returns {Promise<object>} Database statistics
 */
async function getStats() {
  try {
    const stats = {
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      tables: {}
    };
    
    // Get table row counts
    const tables = ['sessions', 'user_preferences', 'bookshelf_uploads', 'book_recommendations'];
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        stats.tables[table] = parseInt(result.rows[0].count);
      } catch (error) {
        stats.tables[table] = `Error: ${error.message}`;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { error: error.message };
  }
}

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

// Utility functions for common database operations

/**
 * Insert a record and return the inserted row
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {Promise<object>} Inserted row
 */
async function insertOne(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const columns = keys.join(', ');
  
  const text = `
    INSERT INTO ${table} (${columns}) 
    VALUES (${placeholders}) 
    RETURNING *
  `;
  
  const result = await query(text, values);
  return result.rows[0];
}

/**
 * Update a record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {object} data - Data to update
 * @returns {Promise<object>} Updated row
 */
async function updateById(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
  
  const text = `
    UPDATE ${table} 
    SET ${setClause}, updated_at = NOW() 
    WHERE id = $1 
    RETURNING *
  `;
  
  const result = await query(text, [id, ...values]);
  return result.rows[0];
}

/**
 * Find a record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<object|null>} Found record or null
 */
async function findById(table, id) {
  const text = `SELECT * FROM ${table} WHERE id = $1`;
  const result = await query(text, [id]);
  return result.rows[0] || null;
}

/**
 * Delete a record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteById(table, id) {
  const text = `DELETE FROM ${table} WHERE id = $1`;
  const result = await query(text, [id]);
  return result.rowCount > 0;
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closePool();
  process.exit(0);
});

module.exports = {
  query,
  getClient,
  transaction,
  testConnection,
  getStats,
  closePool,
  insertOne,
  updateById,
  findById,
  deleteById,
  pool
};