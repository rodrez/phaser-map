import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Create connection pool
  const pool = new Pool({
    connectionString,
  });

  // Initialize Drizzle ORM
  const db = drizzle(pool);

  // Define migrations directory
  const migrationPath = path.join(__dirname, '../../migrations');

  // Run migrations
  console.log(`Running migrations from ${migrationPath}...`);

  try {
    await migrate(db, { migrationsFolder: migrationPath });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error); 