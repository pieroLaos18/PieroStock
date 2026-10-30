<template>
  <div class="auth-page auth-page--login">
    <div class="auth-card">
      <aside class="auth-aside">
        <router-link class="auth-brand" to="/login" aria-label="Sistema de ventas, inicio">
          <span class="auth-brand-mark"><i class="fas fa-store" aria-hidden="true"></i></span>
          <span>Sistema de ventas</span>
        </router-link>
        <div class="auth-aside-copy">
          <p class="auth-kicker">Gestión comercial</p>
          <h2>Tu negocio,<br />en orden.</h2>
          <p>Ventas, inventario y reportes reunidos en un espacio claro para el trabajo diario.</p>
        </div>
        <p class="auth-aside-footer"><span></span> Una herramienta para avanzar con claridad</p>
      </aside>
      <main class="auth-panel">
        <div class="login-container">
      <div class="login-header">
        <p class="auth-kicker">Acceso a tu cuenta</p>
        <h1>Qué bueno tenerte de vuelta</h1>
        <p class="subtitle">Ingresa tus datos para continuar.</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <div class="input-container enhanced-input">
            <i class="fas fa-envelope"></i>
            <input type="email" id="email" v-model="email" placeholder="nombre@empresa.com" autocomplete="username" required />
          </div>
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="input-container enhanced-input">
            <i class="fas fa-lock"></i>
            <input type="password" id="password" v-model="password" placeholder="Ingresa tu contraseña" autocomplete="current-password" required />
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-login enhanced-btn">Iniciar Sesión</button>
        </div>
        <p v-if="error" class="login-error">{{ error }}</p>
        <div v-if="showResend" class="resend-container">
  <button
    type="button"
    @click="reenviarVerificacion"
    :disabled="resendCooldown > 0"
    class="btn-login resend-btn"
  >
    {{ resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar correo de verificación' }}
  </button>
  <p v-if="resendMessage" class="resend-message">{{ resendMessage }}</p>
</div>
        <div class="extra-links">
          <router-link to="/forgot-password" class="forgot-password">¿Olvidaste tu contraseña?</router-link>
          <span aria-hidden="true">·</span>
          <router-link to="/register" class="register-link">Crear cuenta</router-link>
        </div>
        <router-link to="/demo" class="demo-entry-link"><i class="fas fa-circle-play"></i> Explorar demo interactiva</router-link>
      </form>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
// Importa axios para realizar la petición de login
import axios from 'axios';

export default {
  data() {
  return {
    email: '',
    password: '',
    error: '',
    showResend: false,
    resendMessage: '',
    resendCooldown: 0,
    resendInterval: null,
  };
},
  watch: {
    // Limpia el error al modificar el email o la contraseña
    email() { this.error = ''; },
    password() { this.error = ''; }
  },
  methods: {
    // Maneja el envío del formulario de login
    async handleLogin() {
  this.error = '';
  this.resendMessage = '';
  this.showResend = false;

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      correo_electronico: this.email,
      password: this.password,
    });
const user = response.data.user;

localStorage.setItem('authToken', response.data.token);
localStorage.setItem('userName', user.name);
localStorage.setItem('userId', user.id);
localStorage.setItem('userEmail', user.email);
localStorage.setItem('userRole', user.rol.toLowerCase());
localStorage.setItem('userImage', user.image || '');
if (response.data.requiresPasswordChange) {
  localStorage.setItem('mustChangePassword', 'true');
  this.$router.push('/change-password');
  return;
}
localStorage.removeItem('mustChangePassword');

    const rol = response.data.user.rol?.toLowerCase();
    if (rol === 'admin' || rol === 'supervisor') {
      this.$router.push('/main/dashboard');
    } else if (rol === 'cajero') {
      this.$router.push('/main/sales');
    } else if (rol === 'almacenero') {
      this.$router.push('/main/products');
    } else {
      this.$router.push('/main/dashboard');
    }
  } catch (error) {
    const message = error.response?.data?.message || 'Error al iniciar sesión';
    this.error = message;

    if (message.toLowerCase().includes('verificada')) {
      this.showResend = true;
    }
  }
},
async reenviarVerificacion() {
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/reenviar-verificacion`, {
      correo_electronico: this.email,
    });

    this.resendMessage = 'Correo reenviado. Revisa tu bandeja de entrada.';
    this.resendCooldown = 30;

    this.resendInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  } catch (err) {
    this.resendMessage = 'Error al reenviar correo. Intenta más tarde.';
  }
}

  },
};
</script>
