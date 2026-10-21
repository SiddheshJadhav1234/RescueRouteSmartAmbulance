import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './backend/routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Core Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

async function startServer() {
  if (!isProd) {
    // Mount Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RescueRoute] Full-Stack Server active on http://0.0.0.0:${PORT}`);
    console.log(`[RescueRoute] C++ DSA Engine ready with Adjacency List Graph & Custom MinHeap.`);
  });
}

startServer().catch((err) => {
  console.error('[RescueRoute] Fatal server startup failure:', err);
  process.exit(1);
});
