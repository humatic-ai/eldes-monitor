/**
 * Next.js Instrumentation Hook
 * This file runs code when the server starts, before any requests are handled.
 * Used to initialize cron jobs automatically on server startup.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on server-side (Node.js runtime)
    const { initializeApp } = await import('./init');
    
    console.log('[Instrumentation] Initializing application on server startup...');
    initializeApp();
    console.log('[Instrumentation] Application initialization complete');
  }
}

