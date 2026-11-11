import 'dotenv/config';
import { runDailySync } from '@/lib/sync/daily';
import { closePool } from '@/lib/db';

const dryRun = process.argv.includes('--dry-run');
if (dryRun) console.log('[sync] Dry-run mode — no writes to DB.');

runDailySync(dryRun)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
