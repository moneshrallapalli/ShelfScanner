require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'shelf_scanner',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

// Path to the schema file
const schemaPath = path.join(__dirname, '../database/schema.sql');

async function setupDatabase() {
  let client;
  
  try {
    console.log('🔄 Setting up Shelf Scanner database...\n');
    
    // First, connect to PostgreSQL without specifying a database to create the database if it doesn't exist
    const adminClient = new Client({
      user: dbConfig.user,
      host: dbConfig.host,
      password: dbConfig.password,
      port: dbConfig.port,
      database: 'postgres' // Connect to default postgres database
    });

    console.log('📡 Connecting to PostgreSQL server...');
    await adminClient.connect();

    // Check if database exists
    const dbCheckResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbConfig.database]
    );

    if (dbCheckResult.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`📦 Creating database '${dbConfig.database}'...`);
      await adminClient.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log(`✅ Database '${dbConfig.database}' created successfully!`);
    } else {
      console.log(`✅ Database '${dbConfig.database}' already exists.`);
    }

    await adminClient.end();

    // Now connect to the target database
    console.log(`📡 Connecting to database '${dbConfig.database}'...`);
    client = new Client(dbConfig);
    await client.connect();
    console.log('✅ Connected to database successfully!');

    // Read the schema file
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    console.log('📄 Reading database schema...');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    console.log('🔨 Creating database tables and structures...');
    await client.query(schema);

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('✅ Database setup completed successfully!\n');
    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Test the database connection and tables
    console.log('\n🧪 Running connection tests...');
    
    // Test device_sessions table
    try {
      await client.query('SELECT COUNT(*) FROM device_sessions');
      console.log('✅ Device sessions table: OK');
    } catch (err) {
      console.log('❌ Device sessions table: ERROR -', err.message);
    }

    // Test user_preferences table
    try {
      await client.query('SELECT COUNT(*) FROM user_preferences');
      console.log('✅ User preferences table: OK');
    } catch (err) {
      console.log('❌ User preferences table: ERROR -', err.message);
    }

    // Test image_uploads table
    try {
      await client.query('SELECT COUNT(*) FROM image_uploads');
      console.log('✅ Image uploads table: OK');
    } catch (err) {
      console.log('❌ Image uploads table: ERROR -', err.message);
    }

    // Test recommendations table
    try {
      await client.query('SELECT COUNT(*) FROM recommendations');
      console.log('✅ Recommendations table: OK');
    } catch (err) {
      console.log('❌ Recommendations table: ERROR -', err.message);
    }

    // Test reading_history table
    try {
      await client.query('SELECT COUNT(*) FROM reading_history');
      console.log('✅ Reading history table: OK');
    } catch (err) {
      console.log('❌ Reading history table: ERROR -', err.message);
    }

    // Test book_cache table
    try {
      await client.query('SELECT COUNT(*) FROM book_cache');
      console.log('✅ Book cache table: OK');
    } catch (err) {
      console.log('❌ Book cache table: ERROR -', err.message);
    }

    // Test rate_limits table
    try {
      await client.query('SELECT COUNT(*) FROM rate_limits');
      console.log('✅ Rate limits table: OK');
    } catch (err) {
      console.log('❌ Rate limits table: ERROR -', err.message);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log(`
📋 Connection Details:
   Host: ${dbConfig.host}:${dbConfig.port}
   Database: ${dbConfig.database}
   User: ${dbConfig.user}

🚀 You can now start the server with:
   npm run dev
   
💡 Environment Variables:
   Make sure your .env file has the correct DATABASE_URL:
   DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}
`);

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`
🚨 Connection Error Help:
   - Make sure PostgreSQL is installed and running
   - Check that PostgreSQL is listening on ${dbConfig.host}:${dbConfig.port}
   - Verify your database credentials in .env file
   
💡 To start PostgreSQL:
   macOS: brew services start postgresql
   Linux: sudo systemctl start postgresql
   Windows: Start PostgreSQL service from Services app
`);
    } else if (error.code === '28P01') {
      console.error(`
🚨 Authentication Error Help:
   - Check your database username and password in .env file
   - Make sure the user '${dbConfig.user}' exists and has proper permissions
   
💡 To create a PostgreSQL user:
   psql -U postgres -c "CREATE USER ${dbConfig.user} WITH PASSWORD '${dbConfig.password}' CREATEDB;"
`);
    } else if (error.code === '3D000') {
      console.error(`
🚨 Database Error Help:
   - The database '${dbConfig.database}' could not be accessed
   - Check that the database name is correct in your .env file
`);
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n⚠️  Setup interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Setup terminated');
  process.exit(0);
});

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('💥 Unexpected error during database setup:', error);
    process.exit(1);
  });
}

module.exports = { setupDatabase, dbConfig };