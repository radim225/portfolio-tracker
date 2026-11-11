const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
};

const optional = (name: string): string | undefined => process.env[name];

export const config = {
  t212: {
    apiKey: optional('T212_API_KEY') ?? '',
    env: (optional('T212_ENV') ?? 'live') as 'live' | 'demo',
    get baseUrl() {
      return this.env === 'demo'
        ? 'https://demo.trading212.com/api/v0'
        : 'https://live.trading212.com/api/v0';
    },
  },
  db: {
    url: optional('DATABASE_URL') ?? '',
  },
};

export const requireT212Key = () => {
  if (!config.t212.apiKey) throw new Error('T212_API_KEY not set');
  return config.t212.apiKey;
};

export const requireDbUrl = () => {
  if (!config.db.url) throw new Error('DATABASE_URL not set');
  return config.db.url;
};

void env;
