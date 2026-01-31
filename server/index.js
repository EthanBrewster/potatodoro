import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initRedis, redis } from './db/redis.js';
import { initPostgres, pool } from './db/postgres.js';
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'hot', timestamp: Date.now() });
});

// API Routes
app.get('/api/kitchen/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const kitchenData = await redis.hgetall(`kitchen:${code}`);
    
    if (!kitchenData || Object.keys(kitchenData).length === 0) {
      return res.status(404).json({ error: 'Kitchen not found' });
    }
    
    const members = await redis.smembers(`kitchen:${code}:members`);
    res.json({ ...kitchenData, members });
  } catch (error) {
    console.error('Kitchen fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen' });
  }
});

// User stats endpoint
app.get('/api/user/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Catch-all for SPA routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Initialize databases and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize databases
    await initRedis();
    await initPostgres();
    
    // Setup socket handlers
    setupSocketHandlers(io);
    
    httpServer.listen(PORT, () => {
      console.log(`
🥔 ═══════════════════════════════════════════════════════════════ 🥔
   
   PATATODORO SERVER IS COOKING!
   
   Port: ${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}
   Redis: Connected
   Postgres: Connected
   
   Ready to toss some potatoes! 🔥
   
🥔 ═══════════════════════════════════════════════════════════════ 🥔
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io, app };
