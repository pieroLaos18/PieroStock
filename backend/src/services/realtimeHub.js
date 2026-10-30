const jwt = require('jsonwebtoken');
const { WebSocket, WebSocketServer } = require('ws');
const pool = require('../config/db');
const { hashToken } = require('../utils/tokenHash');

let websocketServer;
let heartbeatTimer;

const send = (socket, type, data = {}) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data, timestamp: Date.now() }));
  }
};

const isAuthenticatedSession = async (userId, token) => {
  const [[user]] = await pool.query('SELECT activo, must_change_password FROM users WHERE id = ?', [userId]);
  if (!user || Number(user.activo) !== 1 || Number(user.must_change_password) === 1) return false;
  const [sessions] = await pool.query(
    'SELECT id FROM sessions WHERE user_id = ? AND token IN (?, ?) AND activo = 1 AND expiracion > NOW()',
    [userId, hashToken(token), token]
  );
  return sessions.length > 0;
};

const activeSocketsFor = (userId) => [...(websocketServer?.clients || [])]
  .some(socket => socket.userId === Number(userId) && socket.isAuthenticated && socket.readyState === WebSocket.OPEN);

const updateOfflineWhenLastSocketCloses = (userId) => {
  setTimeout(async () => {
    try {
      if (!activeSocketsFor(userId)) {
        await pool.query('UPDATE users SET is_online = 0 WHERE id = ?', [userId]);
      }
    } catch (error) {
      console.warn('[ws] No se pudo actualizar el estado del usuario al desconectar.');
    }
  }, 0);
};

const authenticateSocket = async (socket, token) => {
  if (typeof token !== 'string' || !token) throw new Error('Token requerido.');
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (!decoded.id || !(await isAuthenticatedSession(decoded.id, token))) {
    throw new Error('La sesión ya no es válida.');
  }
  socket.userId = Number(decoded.id);
  socket.token = token;
  socket.tokenExpiresAt = Number(decoded.exp || 0) * 1000;
  socket.lastSessionCheck = Date.now();
  socket.isAuthenticated = true;
  socket.isAlive = true;
  await pool.query('UPDATE users SET is_online = 1 WHERE id = ?', [socket.userId]);
  send(socket, 'connection', { status: 'connected', type: 'websocket' });
}

const attachRealtimeHub = (server) => {
  if (websocketServer) return websocketServer;
  websocketServer = new WebSocketServer({ noServer: true, maxPayload: 4096 });

  server.on('upgrade', (request, socket, head) => {
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',').map(value => value.trim());
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (client) => {
      websocketServer.emit('connection', client, request);
    });
  });

  websocketServer.on('connection', (socket) => {
    const authTimeout = setTimeout(() => {
      if (!socket.isAuthenticated) socket.close(1008, 'Authentication required');
    }, 5000);

    socket.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        socket.close(1007, 'Invalid message');
        return;
      }

      if (!socket.isAuthenticated) {
        if (message.type !== 'authenticate') {
          socket.close(1008, 'Authenticate first');
          return;
        }
        try {
          await authenticateSocket(socket, message.token);
          clearTimeout(authTimeout);
        } catch {
          send(socket, 'session_revoked', { message: 'Tu sesión expiró. Inicia sesión nuevamente.' });
          socket.close(1008, 'Invalid session');
        }
        return;
      }

      if (message.type === 'request_update') {
        const entitiesByComponent = {
          dashboard: ['dashboard', 'sales', 'inventory', 'activities'],
          sales: ['sales'],
          inventory: ['inventory'],
          activities: ['activities'],
        };
        const entities = entitiesByComponent[message.component] || entitiesByComponent.dashboard;
        send(socket, 'data_changed', { entities, action: 'manual_refresh' });
      }
    });

    socket.on('pong', () => { socket.isAlive = true; });
    socket.on('close', () => {
      clearTimeout(authTimeout);
      if (socket.isAuthenticated) updateOfflineWhenLastSocketCloses(socket.userId);
    });
    socket.on('error', () => {});
  });

  heartbeatTimer = setInterval(() => {
    for (const socket of websocketServer.clients) {
      if (!socket.isAuthenticated) continue;
      if (!socket.isAlive || Date.now() >= socket.tokenExpiresAt) {
        send(socket, 'session_revoked', { message: 'Tu sesión expiró. Inicia sesión nuevamente.' });
        socket.close(1008, 'Session expired');
        continue;
      }
      socket.isAlive = false;
      socket.ping();
      if (Date.now() - socket.lastSessionCheck > 120000) {
        socket.lastSessionCheck = Date.now();
        isAuthenticatedSession(socket.userId, socket.token)
          .then(valid => {
            if (!valid) {
              send(socket, 'session_revoked', { message: 'Tu sesión ya no está activa.' });
              socket.close(1008, 'Session revoked');
            }
          })
          .catch(() => {});
      }
    }
  }, 30000);

  return websocketServer;
};

const publishDataChanged = (change, targetUserId = null) => {
  if (!websocketServer) return;
  const entities = Array.isArray(change.entities) ? change.entities : ['activities'];
  const message = JSON.stringify({
    type: 'data_changed',
    data: { ...change, entities },
    timestamp: Date.now(),
  });
  for (const socket of websocketServer.clients) {
    if (!socket.isAuthenticated || socket.readyState !== WebSocket.OPEN) continue;
    if (targetUserId !== null && socket.userId !== Number(targetUserId)) continue;
    socket.send(message);
  }
};

const disconnectSession = (token, message = 'La sesión se cerró.') => {
  const affectedUsers = new Set();
  for (const socket of websocketServer?.clients || []) {
    if (socket.token === token && socket.readyState === WebSocket.OPEN) {
      affectedUsers.add(socket.userId);
      send(socket, 'session_revoked', { message });
      socket.close(1008, 'Session closed');
    }
  }
  for (const userId of affectedUsers) updateOfflineWhenLastSocketCloses(userId);
};

const disconnectUser = (userId, message = 'Tu usuario fue desactivado.') => {
  for (const socket of websocketServer?.clients || []) {
    if (socket.userId === Number(userId) && socket.readyState === WebSocket.OPEN) {
      send(socket, 'session_revoked', { message });
      socket.close(1008, 'User disabled');
    }
  }
};

const closeRealtimeHub = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  for (const socket of websocketServer?.clients || []) socket.close(1001, 'Server shutting down');
  websocketServer?.close();
  websocketServer = null;
};

module.exports = { attachRealtimeHub, publishDataChanged, disconnectSession, disconnectUser, closeRealtimeHub };
