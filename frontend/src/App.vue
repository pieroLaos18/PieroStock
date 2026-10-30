<template>
  <div id="app">
    <!-- Sidebar/Navbar SOLO si está autenticado -->
    <router-view />
    <button
      v-if="isAuthPage && $route?.path !== '/demo'"
      type="button"
      class="auth-theme-toggle"
      :aria-label="theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      :title="theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      @click="toggleTheme"
    >
      <i :class="theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'" aria-hidden="true"></i>
      <span>{{ theme === 'dark' ? 'Modo claro' : 'Modo oscuro' }}</span>
    </button>
  </div>
</template>

<script>
// Importa los estilos globales y de terceros aquí
import './assets/css/global.css';
import 'vue-datepicker-next/index.css';
import { applyTheme, getPreferredTheme, watchSystemTheme } from './services/theme';

// Componente principal de la aplicación
export default {
  name: 'App',
  data() {
    return {
      theme: 'light',
      stopWatchingSystemTheme: null,
    };
  },
  computed: {
    isAuthPage() {
      const path = this.$route?.path || '';
      return path === '/login' || path === '/register' || path === '/forgot-password' ||
        path === '/verificar' || path === '/demo' || path.startsWith('/reset-password/');
    },
    currentUserRole() {
      return localStorage.getItem('userRole');
    },
    isAuthenticated() {
      return !!localStorage.getItem('authToken');
    }
  },
  created() {
    this.setTheme(getPreferredTheme(), false);
    this.stopWatchingSystemTheme = watchSystemTheme((theme) => this.setTheme(theme, false));
    window.addEventListener('app-theme-change', this.syncTheme);
  },
  beforeUnmount() {
    this.stopWatchingSystemTheme?.();
    window.removeEventListener('app-theme-change', this.syncTheme);
  },
  methods: {
    setTheme(theme, rememberChoice = true) {
      this.theme = theme;
      applyTheme(theme, rememberChoice);
    },
    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    },
    syncTheme(event) {
      this.theme = event.detail;
    },
  },
};
</script>
