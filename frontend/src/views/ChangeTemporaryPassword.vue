<template>
  <div class="auth-page auth-page--recovery">
    <div class="auth-card">
      <aside class="auth-aside">
        <router-link class="auth-brand" to="/login"><span class="auth-brand-mark"><i class="fas fa-store"></i></span><span>Sistema de ventas</span></router-link>
        <div class="auth-aside-copy"><p class="auth-kicker">Protege tu cuenta</p><h2>Un último paso para comenzar.</h2><p>La contraseña temporal ya cumplió su función. Elige una personal para continuar.</p></div>
        <p class="auth-aside-footer"><span></span> Tu contraseña es personal</p>
      </aside>
      <main class="auth-panel">
        <div class="forgot-container">
          <div class="forgot-header"><p class="auth-kicker">Primer acceso</p><h1>Crea tu contraseña</h1><p class="forgot-subtitle">Por seguridad, debes reemplazar la contraseña temporal antes de usar el sistema.</p></div>
          <form @submit.prevent="submit">
            <label for="new-password">Nueva contraseña</label>
            <div class="forgot-input-container"><i class="fas fa-lock" aria-hidden="true"></i><input id="new-password" v-model="password" type="password" autocomplete="new-password" minlength="8" required placeholder="Crea una contraseña segura" /></div>
            <label for="confirm-password">Confirma tu contraseña</label>
            <div class="forgot-input-container"><i class="fas fa-lock" aria-hidden="true"></i><input id="confirm-password" v-model="confirmation" type="password" autocomplete="new-password" minlength="8" required placeholder="Repite la nueva contraseña" /></div>
            <ul class="password-requirements"><li>8 caracteres como mínimo</li><li>Una letra y un número</li><li>Un carácter especial</li></ul>
            <button type="submit" class="forgot-btn" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar contraseña' }}</button>
            <p v-if="error" class="auth-feedback auth-feedback--error" role="alert">{{ error }}</p>
          </form>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import api from '@/services/api';
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from '@/services/passwordPolicy';

export default {
  name: 'ChangeTemporaryPassword',
  data: () => ({ password: '', confirmation: '', saving: false, error: '' }),
  methods: {
    async submit() {
      this.error = '';
      if (!isPasswordValid(this.password)) { this.error = PASSWORD_POLICY_MESSAGE; return; }
      if (this.password !== this.confirmation) { this.error = 'Las contraseñas no coinciden.'; return; }
      this.saving = true;
      try {
        await api.post('/auth/change-temporary-password', { password: this.password });
        localStorage.removeItem('mustChangePassword');
        const role = (localStorage.getItem('userRole') || '').toLowerCase();
        const destination = role === 'cajero' ? '/main/sales' : role === 'almacenero' ? '/main/products' : '/main/dashboard';
        await this.$router.replace(destination);
      } catch (error) {
        this.error = error.response?.data?.message || 'No se pudo actualizar la contraseña. Inténtalo de nuevo.';
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>
