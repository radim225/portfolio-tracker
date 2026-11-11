'use client';

import { useEffect } from 'react';

// Inline script injected into <head> to prevent FOUC.
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();
`,
      }}
    />
  );
}

export function useThemeToggle() {
  useEffect(() => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const update = () => {
      const isDark = document.documentElement.classList.contains('dark');
      btn.textContent = isDark ? '☀️' : '🌙';
    };
    update();
    const handler = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      update();
    };
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);
}
