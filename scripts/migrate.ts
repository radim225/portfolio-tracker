import 'dotenv/config';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from '@/lib/db';

async function main() {
  const start = Date.now();
  console.log('Applying migrations to Neon…');
  await migrate(db(), { migrationsFolder: './lib/db/migrations' });
  console.log(`Done in ${Date.now() - start} ms.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
