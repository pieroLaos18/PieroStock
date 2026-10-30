<template>
  <div class="auth-page auth-page--register">
    <div class="auth-card">
      <aside class="auth-aside">
        <router-link class="auth-brand" to="/login" aria-label="Sistema de ventas, inicio">
          <span class="auth-brand-mark"><i class="fas fa-store" aria-hidden="true"></i></span>
          <span>Sistema de ventas</span>
        </router-link>
        <div class="auth-aside-copy">
          <p class="auth-kicker">Un buen comienzo</p>
          <h2>Organiza tu operación desde el primer día.</h2>
          <p>Crea tu cuenta para gestionar ventas e inventario desde un solo lugar.</p>
        </div>
        <p class="auth-aside-footer"><span></span> Configuración sencilla para tu equipo</p>
      </aside>
      <main class="auth-panel">
        <div class="register-container">
      <div class="register-header">
        <p class="auth-kicker">Registro</p>
        <h1>Crea tu cuenta</h1>
        <p class="subtitle">Completa tus datos para empezar.</p>
      </div>
      <form @submit.prevent="handleRegister">
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">Nombre</label>
            <div class="input-container enhanced-input">
              <i class="fas fa-user"></i>
              <input type="text" id="firstName" v-model="nombre" placeholder="Tu nombre" autocomplete="given-name" required />
            </div>
          </div>
          <div class="form-group">
            <label for="lastName">Apellido</label>
            <div class="input-container enhanced-input">
              <i class="fas fa-user"></i>
              <input type="text" id="lastName" v-model="apellido" placeholder="Tu apellido" autocomplete="family-name" required />
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <div class="input-container enhanced-input">
            <i class="fas fa-envelope"></i>
            <input type="email" id="email" v-model="email" placeholder="nombre@empresa.com" autocomplete="email" required />
          </div>
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="input-container enhanced-input">
            <i class="fas fa-lock"></i>
            <input type="password" id="password" v-model="password" placeholder="Crea una contraseña segura" autocomplete="new-password" minlength="8" aria-describedby="register-password-requirements" required />
          </div>
          <ul id="register-password-requirements" class="password-requirements" aria-label="Requisitos de contraseña">
            <li :class="{ 'is-valid': passwordRequirements.minLength }"><i :class="passwordRequirements.minLength ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> 8 caracteres como mínimo</li>
            <li :class="{ 'is-valid': passwordRequirements.letter }"><i :class="passwordRequirements.letter ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> Una letra</li>
            <li :class="{ 'is-valid': passwordRequirements.number }"><i :class="passwordRequirements.number ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> Un número</li>
            <li :class="{ 'is-valid': passwordRequirements.special }"><i :class="passwordRequirements.special ? 'fas fa-check-circle' : 'far fa-circle'" aria-hidden="true"></i> Un carácter especial, por ejemplo ! @ #</li>
          </ul>
        </div>
        <div class="form-group">
          <label for="address">Dirección</label>
          <div class="input-container enhanced-input">
            <i class="fas fa-map-marker-alt"></i>
            <input type="text" id="address" v-model="direccion" placeholder="Tu dirección" autocomplete="street-address" required />
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-register enhanced-btn">Crear Cuenta</button>
        </div>
        <p v-if="success" class="register-success">{{ success }}</p>
        <p v-if="error" class="register-error">{{ error }}</p>
        <div v-if="allowResend" class="resend-container">
          <button
            type="button"
            @click="reenviarVerificacion"
            :disabled="resendCooldown > 0"
            class="btn-register resend-btn"
          >
            {{ resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar correo de verificación' }}
          </button>
        </div>
        <div class="extra-links">
          <span>¿Ya tienes una cuenta?</span>
          <router-link to="/login" class="login-link">Inicia sesión aquí</router-link>
        </div>
      </form>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import api from '../services/api';
import { getPasswordRequirements, isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../services/passwordPolicy';

export default {
  data() {
    return {
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      direccion: '',
      success: null,
      error: null,
      allowResend: false,
      resendCooldown: 0,
      resendInterval: null,
    };
  },
  computed: {
    passwordRequirements() {
      return getPasswordRequirements(this.password);
    },
  },
  methods: {
    async handleRegister() {
      this.success = null;
      this.error = null;
      this.allowResend = false;

      if (!isPasswordValid(this.password)) {
        this.error = PASSWORD_POLICY_MESSAGE;
        return;
      }

      try {
        const response = await api.post('/auth/register', {
          correo_electronico: this.email,
          password: this.password,
          nombre: this.nombre,
          apellido: this.apellido,
          direccion: this.direccion,
        });

        this.success = response.data.message;
        this.error = null;

        // Opcional: redirigir tras registro
        setTimeout(() => {
          this.$router.push('/verificar');
        }, 2000);
      } catch (error) {
        this.error = error.response?.data?.message || 'Error al registrarse';
        // Solo muestra reenvío cuando el servidor confirma que hay una cuenta pendiente.
        this.allowResend = Boolean(error.response?.data?.allowResend);
        this.success = null;
      }
    },

    async reenviarVerificacion() {
      this.error = null;
      this.success = null;

      try {
        const response = await api.post('/auth/reenviar-verificacion', {
          correo_electronico: this.email,
        });

        this.success = response.data.message;
        this.allowResend = false;

        // ⏳ Cooldown
        this.resendCooldown = 30;
        this.resendInterval = setInterval(() => {
          this.resendCooldown--;
          if (this.resendCooldown <= 0) {
            clearInterval(this.resendInterval);
            this.allowResend = true;
          }
        }, 1000);
      } catch (err) {
        this.error = err.response?.data?.message || 'No se pudo reenviar el correo.';
      }
    },
  },
  beforeDestroy() {
    if (this.resendInterval) clearInterval(this.resendInterval);
  },
};
</script>
