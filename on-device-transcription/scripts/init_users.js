import { createClient } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

const projectDir = process.cwd();
try {
  const envRaw = fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8');
  for (const line of envRaw.split('\\n')) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...rest] = line.split('=');
      if (key) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
} catch (e) {
  console.log("No .env.local found or error reading it");
}

async function main() {
  const client = createClient();
  await client.connect();
  console.log("Connected to database...");

  try {
    const result = await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Users table created successfully:", result);
  } catch (error) {
    console.error("Error creating users table:", error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
