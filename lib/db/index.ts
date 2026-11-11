import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { requireDbUrl } from '@/lib/config';
import * as schema from './schema';

// HTTP driver: use for request-path queries (Next.js server components on Vercel).
// No connection pool warmup; each query is a one-shot HTTPS fetch.
let _http: ReturnType<typeof drizzleHttp> | null = null;
export const db = () => {
  if (!_http) {
    const sql = neon(requireDbUrl());
    _http = drizzleHttp(sql, { schema });
  }
  return _http;
};

// WebSocket Pool driver: use for long-running scripts (sync, backfill, MCP server).
// Reuses a single connection across many queries, avoiding per-query fetch overhead.
let _pool: Pool | null = null;
let _pooled: ReturnType<typeof drizzlePool> | null = null;
export const dbPool = () => {
  if (!_pooled) {
    // Node.js needs an explicit ws impl; Vercel edge has it globally.
    if (typeof WebSocket === 'undefined') {
      neonConfig.webSocketConstructor = ws;
    }
    _pool = new Pool({ connectionString: requireDbUrl() });
    _pooled = drizzlePool(_pool, { schema });
  }
  return _pooled;
};

export const closePool = async () => {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _pooled = null;
  }
};

export { schema };
