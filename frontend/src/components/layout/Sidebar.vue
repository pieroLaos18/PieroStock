<template>
  <aside id="app-sidebar" :class="['sidebar', 'demo-sidebar', { collapsed: shouldBeCollapsed, 'mobile-hidden': isMobileHidden }]" aria-label="Navegación principal" :aria-hidden="isMobileHidden" :inert="isMobileHidden">
    <div class="demo-brand-row">
      <router-link class="demo-brand" :to="homeRoute" aria-label="ERP ligero, ir a la página principal" @click="closeMobileMenu">
        <span class="demo-brand-mark"><i class="fas fa-cube" aria-hidden="true"></i></span>
        <span v-if="!shouldBeCollapsed"><strong>ERP ligero</strong><small>Ventas e inventario</small></span>
      </router-link>
      <button v-if="!isSmallScreen" class="demo-collapse-toggle" type="button" :aria-label="isCollapsed ? 'Expandir menú' : 'Contraer menú'" :title="isCollapsed ? 'Expandir menú' : 'Contraer menú'" @click="toggleSidebar">
        <i :class="isCollapsed ? 'fas fa-angles-right' : 'fas fa-angles-left'" aria-hidden="true"></i>
      </button>
    </div>

    <div v-if="!shouldBeCollapsed" class="demo-workspace" aria-label="Negocio actual">
      <span class="workspace-dot" aria-hidden="true"></span><span>Mi negocio</span>
    </div>
    <p v-if="!shouldBeCollapsed" class="demo-nav-label">MENÚ PRINCIPAL</p>
    <nav class="sidebar-menu demo-nav" aria-label="Menú principal">
      <ul>
        <li v-if="['admin', 'supervisor'].includes(role)">
          <router-link to="/main/dashboard" title="Resumen" aria-label="Resumen" @click="closeMobileMenu">
            <i class="fas fa-grid-2"></i>
            <span v-if="!shouldBeCollapsed">Resumen</span>
          </router-link>
        </li>
        <li v-if="['admin', 'supervisor', 'almacenero'].includes(role)">
          <router-link to="/main/products" title="Productos" aria-label="Productos" @click="closeMobileMenu">
            <i class="fas fa-boxes-stacked"></i>
            <span v-if="!shouldBeCollapsed">Productos</span>
          </router-link>
        </li>
        <li v-if="['admin', 'supervisor', 'cajero'].includes(role)">
          <router-link to="/main/sales" title="Ventas" aria-label="Ventas" @click="closeMobileMenu">
            <i class="fas fa-receipt"></i>
            <span v-if="!shouldBeCollapsed">Ventas</span>
          </router-link>
        </li>
        <li v-if="['admin', 'supervisor'].includes(role)">
          <router-link to="/main/reports" title="Reportes" aria-label="Reportes" @click="closeMobileMenu">
            <i class="fas fa-chart-pie"></i>
            <span v-if="!shouldBeCollapsed">Reportes</span>
          </router-link>
        </li>
        <li v-if="role === 'admin'">
          <router-link to="/main/users" title="Equipo" aria-label="Equipo" @click="closeMobileMenu">
            <i class="fas fa-users"></i>
            <span v-if="!shouldBeCollapsed">Equipo</span>
          </router-link>
        </li>
        <li v-if="['admin', 'supervisor'].includes(role)">
          <router-link to="/main/actividades" title="Actividad" aria-label="Actividad" @click="closeMobileMenu">
            <i class="fas fa-clock-rotate-left"></i>
            <span v-if="!shouldBeCollapsed">Actividad</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <div class="demo-sidebar-bottom">
      <img :src="userImage" class="demo-user-photo" :alt="`Foto de ${userName || 'usuario'}`" @error="handleImageError" />
      <div v-if="!shouldBeCollapsed" class="demo-user-info">
        <strong>{{ userName || 'Usuario' }}</strong>
        <span>{{ role }}</span>
      </div>
    </div>
  </aside>
</template>

<script>
import defaultUserImage from '@/assets/images/profile.png';

export default {
  name: 'Sidebar',
  props: {
    userName: String,
    userImage: String,
    role: String,
    visible: Boolean,
    isSmallScreen: Boolean
  },
  data() {
    return {
      isCollapsed: false,
      // Base64 fallback image (simple user icon) como último recurso
      fallbackImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMzYjgyZjYiLz4KPGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iMTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNiA1MkMxNiA0NC4yNjggMjMuMjY4IDM4IDMyIDM4UzQ4IDQ0LjI2OCA0OCA1MiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+'
    };
  },
  computed: {
    homeRoute() {
      if (this.role === 'cajero') return '/main/sales';
      if (this.role === 'almacenero') return '/main/products';
      return '/main/dashboard';
    },
    shouldBeCollapsed() {
      if (this.isSmallScreen) return false;
      return !this.visible || this.isCollapsed;
    },
    isMobileHidden() {
      return this.isSmallScreen && !this.visible;
    }
  },
  methods: {
    toggleSidebar() {
      if (this.isSmallScreen) {
        this.$emit('toggle', !this.visible);
      } else {
        this.isCollapsed = !this.isCollapsed;
      }
    },
    closeMobileMenu() {
      if (this.isSmallScreen && this.visible) this.$emit('toggle', false);
    },
    handleImageError(event) {
      const image = event.currentTarget;
      const defaultImageUrl = new URL(defaultUserImage, window.location.href).href;
      if (image.src !== defaultImageUrl) {
        image.src = defaultImageUrl;
      } else {
        image.src = this.fallbackImage;
      }
    }
  }
};
</script>

<style scoped>
:root {
  --primary-color: #3b82f6;
  --primary-dark: #2563eb;
  --sidebar-bg: #1e3a8a;
  --text-light: #ffffff;
  --text-accent: #93c5fd;
}

.sidebar {
  width: 260px;
  height: 100vh;
  background-color: var(--sidebar-bg);
  color: var(--text-light);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  transition: width 0.3s ease;
  overflow: hidden;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.2);
}

/* Colapsado */
.sidebar.collapsed {
  width: 80px;
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 1rem;
  align-self: flex-end;
  transition: transform 0.3s;
}

.toggle-btn:hover {
  transform: scale(1.2);
}

/* Usuario */
.sidebar-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.user-image {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-color);
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.3);
  margin-bottom: 10px;
}

.sidebar-username,
.sidebar-role {
  transition: opacity 0.3s ease;
}

.sidebar.collapsed .sidebar-username,
.sidebar.collapsed .sidebar-role {
  opacity: 0;
  pointer-events: none;
  height: 0;
  overflow: hidden;
}

/* Menú */
.sidebar-menu {
  flex: 1;
  padding-top: 1rem;
}

.sidebar-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-menu li {
  margin-bottom: 10px;
}

.sidebar-menu a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: var(--text-light);
  text-decoration: none;
  font-size: 1rem;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
}

.sidebar-menu a i {
  font-size: 1.2rem;
  color: var(--primary-color);
  transition: color 0.2s ease;
}

.sidebar-menu a:hover,
.sidebar-menu a.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--primary-color);
  transform: translateX(6px);
}

.sidebar-menu a:hover i,
.sidebar-menu a.router-link-exact-active i {
  color: #fff;
}

/* Ocultar texto al colapsar */
.sidebar.collapsed a span {
  opacity: 0;
  pointer-events: none;
  display: none;
}

.sidebar.demo-sidebar {
  position: sticky;
  top: 0;
  left: auto;
  z-index: 5;
  width: 238px;
  height: 100vh;
  height: 100dvh;
  flex: 0 0 238px;
  gap: 0;
  padding: 23px 16px 17px;
  overflow: auto;
  border-right: 1px solid rgba(255, 255, 255, .08);
  background: #102436;
  color: #edf6f7;
  box-shadow: none;
}

.sidebar.demo-sidebar.collapsed {
  width: 72px;
  flex-basis: 72px;
  padding-inline: 12px;
}

.sidebar.demo-sidebar.collapsed .demo-brand-row {
  justify-content: center;
  flex-wrap: wrap;
  row-gap: 7px;
}

.sidebar.demo-sidebar.collapsed .demo-brand-row .demo-brand {
  flex: 0 0 40px;
}

.sidebar.demo-sidebar.collapsed .demo-collapse-toggle {
  width: 27px;
  height: 27px;
  flex-basis: 27px;
}

.demo-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 40px;
  margin: 0 3px 25px;
  color: inherit;
  text-decoration: none;
}

.demo-brand-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 25px;
}

.demo-brand-row .demo-brand {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0 0 0 3px;
}

.demo-collapse-toggle {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border: 1px solid rgba(210, 229, 236, .12);
  border-radius: 9px;
  background: rgba(255, 255, 255, .045);
  color: #8ca5b0;
  cursor: pointer;
}

.demo-collapse-toggle:hover {
  border-color: rgba(63, 200, 169, .32);
  background: rgba(37, 172, 154, .15);
  color: #72decd;
}

.demo-brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border: 1px solid rgba(75, 208, 190, .28);
  border-radius: 13px;
  background: rgba(49, 191, 171, .14);
  color: #69d8c7;
}

.demo-brand strong,
.demo-brand small {
  display: block;
  white-space: nowrap;
}

.demo-brand strong { color: #f2f8f8; font-size: .91rem; letter-spacing: -.02em; }
.demo-brand small { margin-top: 2px; color: #9aafba; font-size: .68rem; }

.demo-workspace {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 42px;
  padding: 0 11px;
  border: 1px solid rgba(207, 229, 234, .1);
  border-radius: 10px;
  background: rgba(255, 255, 255, .045);
  color: #dce8eb;
  font-size: .76rem;
  font-weight: 600;
}

.workspace-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3fc8a9;
  box-shadow: 0 0 0 3px rgba(63, 200, 169, .12);
}

.demo-workspace i { margin-left: auto; color: #849aa5; font-size: .65rem; }
.demo-nav-label { margin: 26px 10px 9px; color: #758d9a; font-size: .62rem; font-weight: 750; letter-spacing: .12em; }

.sidebar.demo-sidebar .sidebar-menu {
  flex: 1;
  padding: 0;
}

.sidebar.demo-sidebar .sidebar-menu ul {
  display: grid;
  gap: 4px;
  padding: 0;
}

.sidebar.demo-sidebar .sidebar-menu li { margin: 0; }

.sidebar.demo-sidebar .sidebar-menu a {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #aabcc5;
  font-size: .77rem;
  font-weight: 570;
  text-decoration: none;
  transition: background .16s ease, color .16s ease;
}

.sidebar.demo-sidebar .sidebar-menu a i {
  width: 17px;
  color: #8ba2ae;
  font-size: .85rem;
  text-align: center;
}

.sidebar.demo-sidebar .sidebar-menu a:hover,
.sidebar.demo-sidebar .sidebar-menu a.router-link-exact-active {
  transform: none;
  border-color: rgba(63, 200, 169, .15);
  background: rgba(37, 172, 154, .15);
  color: #eafffb;
}

.sidebar.demo-sidebar .sidebar-menu a:hover i,
.sidebar.demo-sidebar .sidebar-menu a.router-link-exact-active i { color: #61d7c4; }

.demo-sidebar-bottom {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  padding: 14px 3px 2px;
  border-top: 1px solid rgba(221, 238, 240, .1);
}

.demo-user-photo {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border: 1px solid #a4d3d5;
  border-radius: 50%;
  object-fit: cover;
}

.demo-user-info { display: grid; flex: 1; gap: 2px; min-width: 0; }
.demo-user-info strong { overflow: hidden; color: #f3f7f8; font-size: .69rem; text-overflow: ellipsis; white-space: nowrap; }
.demo-user-info span { color: #8ca3af; font-size: .64rem; text-transform: capitalize; }

@media (max-width: 760px) {
  .sidebar.demo-sidebar {
    position: relative;
    width: 100%;
    height: auto;
    flex: 0 0 auto;
    padding: 12px 15px;
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
  }

  .sidebar.demo-sidebar .demo-brand-row { margin: 0 0 11px; }
  .sidebar.demo-sidebar .demo-brand { margin: 0 3px; }
  .sidebar.demo-sidebar .demo-workspace,
  .sidebar.demo-sidebar .demo-nav-label,
  .sidebar.demo-sidebar .demo-sidebar-bottom { display: none; }
  .sidebar.demo-sidebar .sidebar-menu { overflow-x: auto; }
  .sidebar.demo-sidebar .sidebar-menu ul { display: flex; gap: 4px; width: max-content; }
  .sidebar.demo-sidebar .sidebar-menu a { width: auto; min-width: max-content; min-height: 36px; padding: 0 9px; font-size: .66rem; }
  .sidebar.demo-sidebar .sidebar-menu a i { width: auto; }
}
</style>
