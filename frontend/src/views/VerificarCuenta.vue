<template>
  <div class="auth-page auth-page--verification">
    <div class="auth-card">
      <aside class="auth-aside">
        <router-link class="auth-brand" to="/login" aria-label="Sistema de ventas, inicio">
          <span class="auth-brand-mark"><i class="fas fa-store" aria-hidden="true"></i></span>
          <span>Sistema de ventas</span>
        </router-link>
        <div class="auth-aside-copy">
          <p class="auth-kicker">Protección de cuenta</p>
          <h2>Confirmemos tu correo.</h2>
          <p>La verificación ayuda a mantener tu cuenta vinculada a una dirección válida.</p>
        </div>
        <p class="auth-aside-footer"><span></span> Un paso para completar tu registro</p>
      </aside>
      <main class="auth-panel">
        <section class="verify-content" aria-live="polite">
          <div class="verify-icon" :class="{ 'is-success': success, 'is-error': error }" aria-hidden="true">
            <i v-if="loading" class="fas fa-envelope-open-text"></i>
            <i v-else-if="success" class="fas fa-check"></i>
            <i v-else class="fas fa-envelope"></i>
          </div>
          <p class="auth-kicker">Verificación de cuenta</p>
          <h1>{{ loading ? 'Estamos verificando tu cuenta' : success ? 'Correo confirmado' : 'No pudimos verificar el correo' }}</h1>
          <p v-if="loading" class="verify-description">Espera un momento mientras comprobamos tu enlace.</p>
          <p v-if="success" class="auth-feedback auth-feedback--success" role="status">{{ success }} Serás redirigido al inicio de sesión en breve.</p>
          <p v-if="error" class="auth-feedback auth-feedback--error" role="alert">{{ error }}</p>
          <form v-if="allowResend" class="verify-resend-form" @submit.prevent="reenviarCorreo">
            <label for="verify-email">Correo electrónico de tu cuenta</label>
            <div class="auth-input-wrap">
              <i class="fas fa-envelope" aria-hidden="true"></i>
              <input id="verify-email" v-model="email" type="email" autocomplete="email" required placeholder="nombre@empresa.com" />
            </div>
            <button type="submit" class="auth-primary-button">Reenviar enlace</button>
          </form>
          <router-link v-if="!loading" to="/login" class="auth-back-link">Volver al inicio de sesión</router-link>
        </section>
      </main>
    </div>
  </div>
</template>

<script>
import axios from '@/services/api';

export default {
  data() {
    return {
      success: null,
      error: null,
      loading: true,
      allowResend: false,
      email: '',
    };
  },
  async mounted() {
    const token = this.$route.query.token;
    if (!token || typeof token !== 'string') {
      this.error = 'Token no válido o faltante.';
      this.loading = false;
      return;
    }

    try {
      const response = await axios.post('/auth/verificar', { token });
      this.success = response.data.message;
      this.loading = false;

      setTimeout(() => {
        this.$router.push('/login');
      }, 3000);
    } catch (err) {
      this.error = err.response?.data?.message || 'Ocurrió un error al verificar la cuenta.';
      this.loading = false;

      // Si el error es por token expirado, permitimos reenviar
      if (
        this.error.toLowerCase().includes('expirado') ||
        this.error.toLowerCase().includes('inválido')
      ) {
        this.allowResend = true;
      }
    }
  },
  methods: {
    async reenviarCorreo() {
      try {
        const response = await axios.post('/auth/reenviar-verificacion', { correo_electronico: this.email });
        this.success = response.data.message;
        this.error = null;
        this.allowResend = false;
      } catch (err) {
        this.error = err.response?.data?.message || 'No se pudo reenviar el correo.';
        this.success = null;
      }
    },
  },
};
</script>
