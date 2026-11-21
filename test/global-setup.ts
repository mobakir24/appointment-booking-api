import { execSync } from 'child_process';
import { config } from 'dotenv';

export default async function globalSetup() {
  config({ path: '.env.test', override: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing: create .env.test (see .env.test.example)');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
