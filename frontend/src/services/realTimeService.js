class RealTimeService {
  constructor() {
    this.websocket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.connectionPromise = null;
    this.lastError = null;
    this.maxReconnectDelay = 30000;
  }

  getWebSocketUrl() {
    const configuredUrl = import.meta.env.VITE_WS_URL;
    if (configuredUrl) {
      return configuredUrl.endsWith('/ws') ? configuredUrl : `${configuredUrl.replace(/\/$/, '')}/ws`;
    }

    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const url = new URL(apiUrl, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  initialize() {
    if (import.meta.env.VITE_ENABLE_WEBSOCKETS === 'false') {
      this.notifyListeners('connection', { status: 'disabled', type: 'websocket' });
      return Promise.resolve();
    }
    if (this.websocket?.readyState === WebSocket.OPEN || this.websocket?.readyState === WebSocket.CONNECTING) {
      return this.connectionPromise || Promise.resolve();
    }
    this.shouldReconnect = true;
    return this.connect();
  }

  connect() {
    if (!this.shouldReconnect || this.connectionPromise) return this.connectionPromise || Promise.resolve();
    const token = localStorage.getItem('authToken');
    if (!token) return Promise.resolve();

    this.connectionPromise = new Promise((resolve) => {
      let socket;
      try {
        socket = new WebSocket(this.getWebSocketUrl());
      } catch (error) {
        this.lastError = error;
        this.connectionPromise = null;
        this.scheduleReconnect();
        resolve();
        return;
      }
      this.websocket = socket;

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'authenticate', token }));
        resolve();
      }, { once: true });

      socket.addEventListener('message', (event) => {
        try {
          this.handleRealTimeData(JSON.parse(event.data));
        } catch (error) {
          console.warn('[ws] Se ignoró un mensaje inválido.');
        }
      });

      socket.addEventListener('error', (error) => {
        this.lastError = error;
        this.notifyListeners('connection', { status: 'error', type: 'websocket', error });
      });

      socket.addEventListener('close', (event) => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.connectionPromise = null;
        this.websocket = null;
        this.notifyListeners('connection', {
          status: 'disconnected',
          type: 'websocket',
          code: event.code,
          reason: event.reason,
          wasConnected,
        });
        if (this.shouldReconnect) this.scheduleReconnect();
      });

      // No dejar initialize pendiente si el servidor no está disponible.
      setTimeout(resolve, 5000);
    }).finally(() => {
      this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * (2 ** Math.min(this.reconnectAttempts - 1, 5)), this.maxReconnectDelay);
    this.notifyListeners('connection', {
      status: 'reconnecting',
      type: 'websocket',
      attempt: this.reconnectAttempts,
      retryIn: delay,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  handleRealTimeData(message) {
    const { type, data = {} } = message || {};
    if (type === 'connection') {
      this.isConnected = data.status === 'connected';
      if (this.isConnected) this.reconnectAttempts = 0;
      this.notifyListeners('connection', data);
      return;
    }
    if (type === 'data_changed') {
      this.notifyListeners('data_changed', data);
      return;
    }
    if (type === 'session_revoked') {
      this.shouldReconnect = false;
      this.isConnected = false;
      this.notifyListeners('session_revoked', data);
      this.websocket?.close(1000, 'Session ended');
      return;
    }

    // Compatibilidad con servicios que aún publiquen eventos específicos.
    if (['dashboard_update', 'new_sale', 'new_product', 'user_activity'].includes(type)) {
      this.notifyListeners(type, data);
    }
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.removeListener(event, callback);
  }

  addListener(event, callback) {
    return this.subscribe(event, callback);
  }

  removeListener(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;
    eventListeners.delete(callback);
    if (eventListeners.size === 0) this.listeners.delete(event);
  }

  notifyListeners(event, data) {
    for (const callback of this.listeners.get(event) || []) {
      try {
        callback(data);
      } catch (error) {
        console.error('[ws] Error al procesar un evento del sistema:', error);
      }
    }
  }

  send(data) {
    if (!this.isConnected || this.websocket?.readyState !== WebSocket.OPEN) return false;
    this.websocket.send(JSON.stringify(data));
    return true;
  }

  requestUpdate(component = 'dashboard') {
    return this.send({ type: 'request_update', component });
  }

  forceUpdate() {
    return this.requestUpdate('dashboard');
  }

  fetchLatestData() {
    return this.forceUpdate();
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      type: 'websocket',
      attempts: this.reconnectAttempts,
      lastError: this.lastError?.message || null,
    };
  }

  getStatus() {
    return this.getConnectionStatus();
  }

  getErrorStats() {
    return { websocket: { hasError: Boolean(this.lastError), lastError: this.lastError?.message || null } };
  }

  disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.websocket?.close(1000, 'Client disconnected');
    this.websocket = null;
    this.isConnected = false;
    this.notifyListeners('connection', { status: 'disconnected', type: 'websocket' });
  }
}

const realTimeService = new RealTimeService();
export default realTimeService;
