<template>
  <div class="auth-page auth-page--reset">
    <div class="auth-card">
      <aside class="auth-aside">
        <router-link class="auth-brand" to="/login" aria-label="Sistema de ventas, inicio">
          <span class="auth-brand-mark"><i class="fas fa-store" aria-hidden="true"></i></span>
          <span>Sistema de ventas</span>
        </router-link>
        <div class="auth-aside-copy">
          <p class="auth-kicker">Seguridad de tu cuenta</p>
          <h2>Elige una nueva contraseña.</h2>
          <p>Actualiza tu acceso y continúa con tu trabajo con tranquilidad.</p>
        </div>
        <p class="auth-aside-footer"><span></span> Usa una contraseña que no compartas</p>
      </aside>
      <main class="auth-panel">
        <div class="reset-container">
      <div class="reset-header">
        <p class="auth-kicker">Nuevo acceso</p>
        <h1>Restablecer contraseña</h1>
        <p class="reset-subtitle">Crea una contraseña nueva para tu cuenta.</p>
      </div>
      <form @submit.prevent="handleReset">
        <label for="new-password">Nueva contraseña</label>
        <div class="reset-input-container">
          <i class="fas fa-lock" aria-hidden="true"></i>
          <input
            id="new-password"
            type="password"
            v-model="password"
            required
            minlength="8"
            aria-describedby="reset-password-requirements"
            placeholder="Crea una contraseña segura"
            autocomplete="new-password"
          />
        </div>
        <ul id="reset-password-requirements" class="password-requirements" aria-label="Requisitos de contraseña">
          <li :class="{ 'is-valid': passwordRequirements.minLength }"><i :class="passwordRequirements.minLength ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> 8 caracteres como mínimo</li>
          <li :class="{ 'is-valid': passwordRequirements.letter }"><i :class="passwordRequirements.letter ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> Una letra</li>
          <li :class="{ 'is-valid': passwordRequirements.number }"><i :class="passwordRequirements.number ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> Un número</li>
          <li :class="{ 'is-valid': passwordRequirements.special }"><i :class="passwordRequirements.special ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> Un carácter especial, por ejemplo ! @ #</li>
        </ul>
        <button type="submit" class="reset-btn enhanced-btn">Restablecer</button>
        <p v-if="message" class="auth-feedback auth-feedback--success" role="status">{{ message }}</p>
        <p v-if="error" class="auth-feedback auth-feedback--error" role="alert">{{ error }}</p>
      </form>
      <button class="login-link" @click="goToLogin">Ir al inicio de sesión</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { getPasswordRequirements, isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../services/passwordPolicy';
export default {
  data() {
    return {
      password: '',
      message: '',
      error: '',
      token: ''
    };
  },
  mounted() {
    this.token = this.$route.params.token;
  },
  computed: {
    passwordRequirements() {
      return getPasswordRequirements(this.password);
    },
  },
  methods: {
    async handleReset() {
      this.message = '';
      this.error = '';
      if (!isPasswordValid(this.password)) {
        this.error = PASSWORD_POLICY_MESSAGE;
        return;
      }

      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/reset-password/${this.token}`, {
          password: this.password
        });
        this.message = '¡Contraseña restablecida! Ahora puedes iniciar sesión.';
        this.password = '';
      } catch (err) {
        this.error = err.response?.data?.message || 'No se pudo restablecer la contraseña.';
      }
    },
    goToLogin() {
      this.$router.push('/login');
    }
  }
};
</script>
