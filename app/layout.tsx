import type { Metadata } from 'next';
import './globals.css';
import { TabNav } from '@/components/TabNav';
import { ThemeScript } from '@/components/ThemeScript';

export const metadata: Metadata = {
  title: 'Portfolio Tracker',
  description: 'Automatic Trading 212 portfolio dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Portfolio Tracker</h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </header>
          <TabNav />
          <main className="mt-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

function ThemeToggle() {
  return (
    <button
      id="theme-toggle"
      aria-label="Přepnout tmavý/světlý režim"
      className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-border"
      onClick={undefined}
    >
      🌙
    </button>
  );
}
