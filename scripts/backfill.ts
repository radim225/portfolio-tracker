import 'dotenv/config';
import { runBackfill } from '@/lib/sync/backfill';
import { closePool } from '@/lib/db';

runBackfill()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
