import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDb } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

async function startServer() {
  // Ensure we run in production mode when NODE_ENV is not explicitly set
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
  // Ensure database folder and seed records are prepared first
  await initializeDb();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Parse JSON and URL-encoded bodies for checkouts, contact, and upload screenshots
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logs for visibility in developer container
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.url}`);
    next();
  });

  // API Router Mount
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', store: 'UstaadGee Stationers', live: true });
  });

  // Vite Assets Server Pipeline
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running server in DEVELOPMENT mode (Vite middleware enabled)...');
    
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);
  } else {
    console.log('Running server in PRODUCTION mode (Serving compiled build assets)...');
    
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Serve index.html for any SPA client-side routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const host = process.env.HOST || '0.0.0.0';
    console.log(`=======================================================`);
    console.log(` USTAADGEE STATIONERS BACKEND BOOTED SUCCESSFULLY!`);
    console.log(` Running on: http://${host}:${PORT}`);
    console.log(` Local Time: ${new Date().toLocaleString('en-US')}`);
    console.log(`=======================================================`);
  });
}

// Global exception catcher to prevent container thread aborts
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

startServer();
