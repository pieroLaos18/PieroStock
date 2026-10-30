<template>
  <div class="auth-page auth-page--recovery">
    <div class="auth-card">
      <aside class="auth-aside">
        <router-link class="auth-brand" to="/login" aria-label="Sistema de ventas, inicio">
          <span class="auth-brand-mark"><i class="fas fa-store" aria-hidden="true"></i></span>
          <span>Sistema de ventas</span>
        </router-link>
        <div class="auth-aside-copy">
          <p class="auth-kicker">Recuperación de acceso</p>
          <h2>Volver a entrar puede ser sencillo.</h2>
          <p>Te guiaremos para recuperar el acceso a tu cuenta.</p>
        </div>
        <p class="auth-aside-footer"><span></span> Tus datos de acceso son personales</p>
      </aside>
      <main class="auth-panel">
        <div class="forgot-container">
      <div class="forgot-header">
        <p class="auth-kicker">Recuperar cuenta</p>
        <h2>¿Olvidaste tu contraseña?</h2>
        <p class="forgot-subtitle">Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para crear una nueva.</p>
      </div>
      <form @submit.prevent="handleForgot">
        <label for="recovery-email">Correo electrónico</label>
        <div class="forgot-input-container">
          <i class="fas fa-envelope" aria-hidden="true"></i>
          <input id="recovery-email" type="email" v-model="email" autocomplete="email" required placeholder="nombre@empresa.com" />
        </div>
        <button type="submit" class="forgot-btn">Enviar enlace</button>
        <p v-if="message" class="auth-feedback auth-feedback--success" role="status">{{ message }}</p>
        <p v-if="error" class="auth-feedback auth-feedback--error" role="alert">{{ error }}</p>
      </form>
      <div class="forgot-extra-links">
        <router-link to="/login">Volver a iniciar sesión</router-link>
      </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
export default {
  data() {
    return {
      email: '',
      message: '',
      error: ''
    };
  },
  methods: {
    async handleForgot() {
      this.message = '';
      this.error = '';
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { email: this.email });
        this.message = 'Revisa tu correo para restablecer tu contraseña.';
      } catch (err) {
        this.error = err.response?.data?.message || 'No se pudo enviar el correo.';
      }
    }
  }
};
</script>
