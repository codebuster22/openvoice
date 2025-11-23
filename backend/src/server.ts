import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import healthRouter from './api/routes/health';
import { ConversationHandler } from './api/websocket/ConversationHandler';

/**
 * OpenVoice Backend Server
 *
 * - REST API: Health check endpoint
 * - WebSocket: Voice conversation handler
 * - Port: 3000 (configurable via PORT env var)
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS for development (frontend on port 8080)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// REST Routes
app.use('/', healthRouter);

// Create HTTP server
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/conversation' });

// WebSocket handler
const conversationHandler = new ConversationHandler();

wss.on('connection', (ws) => {
  conversationHandler.handleConnection(ws);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 OpenVoice server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎙️  WebSocket: ws://localhost:${PORT}/conversation`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;
