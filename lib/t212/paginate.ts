import { t212Fetch, T212HttpError } from './client';
import type { Paginated } from './types';

// T212's nextPagePath shape is inconsistent across endpoints:
//   orders/dividends: full path "/api/v0/equity/history/orders?cursor=…"
//   transactions:     bare query string "limit=50&cursor=…&time=…" (no path, no "?")
// Normalize all shapes into a path relative to baseUrl.
function resolveNextPath(basePath: string, next: string | null | undefined): string | null {
  if (!next) return null;
  const stripped = next.replace(/^\/api\/v0/, '');
  if (stripped.startsWith('/')) return stripped;
  return `${basePath}${stripped.startsWith('?') ? '' : '?'}${stripped}`;
}

// T212 cursors stop resolving once the referenced item is older than roughly a
// month (the API 404s on its own nextPagePath; full history is only available
// through the CSV export endpoints). Treat that as the end of reachable data
// rather than a failure — but only on continuation pages, so a genuinely wrong
// path on the first request still throws.
function isExpiredCursor(err: unknown, requestPath: string): boolean {
  return (
    err instanceof T212HttpError &&
    err.status === 404 &&
    requestPath.includes('cursor=')
  );
}

interface FetchAllOptions {
  limit?: number;
  // Return false to stop paginating early (e.g. when we hit already-stored rows).
  stopWhen?: (items: unknown[]) => boolean;
  // Delay between requests in ms (helps stay under 6 req/min).
  delayMs?: number;
}

export async function fetchAll<T>(
  path: string,
  opts: FetchAllOptions = {},
): Promise<T[]> {
  const { limit = 50, stopWhen, delayMs = 0 } = opts;
  const collected: T[] = [];
  let nextPath: string | null = `${path}?limit=${limit}`;

  let page = 0;
  while (nextPath) {
    page++;
    console.log(`[paginate] ${path} page ${page} — GET ${nextPath}`);
    let res;
    try {
      res = await t212Fetch(nextPath);
    } catch (err) {
      if (isExpiredCursor(err, nextPath)) {
        console.warn(`[paginate] ${path} — cursor no longer resolvable (T212 404); stopping with ${collected.length} items.`);
        break;
      }
      throw err;
    }
    const data = (await res.json()) as Paginated<T>;
    const items = data.items ?? [];
    collected.push(...items);
    console.log(`[paginate] ${path} page ${page} — ${items.length} items (total ${collected.length})`);

    if (stopWhen?.(items)) break;

    nextPath = resolveNextPath(path, data.nextPagePath);
    if (nextPath && delayMs > 0) {
      console.log(`[paginate] waiting ${delayMs}ms before next page…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return collected;
}

// Same as fetchAll but stops paginating once an item whose extracted key is
// already in `knownKeys` is seen. Useful for tail-fetching append-only history.
// Keys are compared as strings — DB primary keys are text, while the API may
// return numeric ids, so everything is coerced through String() here.
export async function fetchTail<T>(
  path: string,
  knownKeys: Set<string>,
  opts: { limit?: number; delayMs?: number; idExtractor?: (item: T) => string | number | undefined } = {},
): Promise<T[]> {
  const { limit = 50, delayMs = 0, idExtractor = (item) => (item as Record<string, unknown>).id as string | number | undefined } = opts;
  const collected: T[] = [];
  let nextPath: string | null = `${path}?limit=${limit}`;

  while (nextPath) {
    let res;
    try {
      res = await t212Fetch(nextPath);
    } catch (err) {
      if (isExpiredCursor(err, nextPath)) {
        console.warn(`[paginate] ${path} — cursor no longer resolvable (T212 404); stopping with ${collected.length} items.`);
        break;
      }
      throw err;
    }
    const data = (await res.json()) as Paginated<T>;
    const items = data.items ?? [];

    let stop = false;
    for (const item of items) {
      const rawKey = idExtractor(item);
      const key = rawKey === undefined ? undefined : String(rawKey);
      if (key !== undefined && knownKeys.has(key)) {
        stop = true;
        break;
      }
      collected.push(item);
    }

    if (stop) break;
    nextPath = resolveNextPath(path, data.nextPagePath);
    if (nextPath && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return collected;
}
