import { config } from '@/lib/config';

const RETRY_AFTER_MS = 10_000;
const MAX_RETRIES = 3;

export class T212HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    // Bodies can be whole HTML error pages — keep messages readable.
    super(`[t212] ${status} on ${url}: ${body.slice(0, 300)}`);
  }
}

interface FetchOptions extends RequestInit {
  retries?: number;
}

export async function t212Fetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const { retries = MAX_RETRIES, ...fetchOpts } = opts;
  const url = `${config.t212.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: config.t212.apiKey,
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string>),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { ...fetchOpts, headers });

    if (res.status === 429) {
      const reset = res.headers.get('x-ratelimit-reset');
      const remaining = res.headers.get('x-ratelimit-remaining');
      const waitMs = reset
        ? Math.max(0, Number(reset) * 1000 - Date.now()) + 500
        : RETRY_AFTER_MS;
      console.warn(
        `[t212] Rate limited on ${path} (remaining=${remaining}). Waiting ${waitMs}ms…`,
      );
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new T212HttpError(res.status, url, body);
    }

    logRateLimit(path, res.headers);
    return res;
  }

  throw new Error(`[t212] Max retries exceeded for ${path}`);
}

export async function t212Json<T>(path: string, opts?: FetchOptions): Promise<T> {
  const res = await t212Fetch(path, opts);
  return res.json() as Promise<T>;
}

function logRateLimit(path: string, headers: Headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const limit = headers.get('x-ratelimit-limit');
  if (remaining !== null && limit !== null && Number(remaining) < 3) {
    const reset = headers.get('x-ratelimit-reset');
    const resetIn = reset ? Math.round((Number(reset) * 1000 - Date.now()) / 1000) : '?';
    console.warn(`[t212] ${path} — ${remaining}/${limit} requests left (resets in ${resetIn}s)`);
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
