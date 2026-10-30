<template>
  
  <div :class="['main-container', 'demo-shell', { 'mobile-layout': isSmallScreen }]">
    
    <!-- Sidebar -->
    <button
      v-if="isSmallScreen && isSidebarVisible"
      class="sidebar-backdrop"
      type="button"
      aria-label="Cerrar menú"
      @click="toggleSidebar"
    ></button>
    <Sidebar :visible="isSidebarVisible" :isSmallScreen="isSmallScreen" :role="currentUserRole" :userName="userName" :userImage="fullUserImage" @toggle="setSidebarVisible" />
    <!-- Contenedor de contenido principal -->
    <div :class="['content-wrapper', 'demo-main', { 'collapsed': !isSidebarVisible }]">
      <AppBar
        :title="currentPageTitle"
        :theme="theme"
        :notificationCount="notificationCount"
        :fullUserImage="fullUserImage"
        :userName="userName"
        :isSidebarCollapsed="!isSidebarVisible"
        :isSmallScreen="isSmallScreen"
        :sidebarOpen="isSidebarVisible"
        @open-notifications="openNotifications"
        @toggle-theme="toggleTheme"
        @toggle-sidebar="toggleSidebar"
        @logout="logout"
        @show-profile="showProfileModal = true"
      />
      <!-- Main Content -->
      <div class="main-content demo-content">
        <div class="dashboard-inner">
          <router-view @set-title="setPageTitle"></router-view>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <InactivityModal v-if="showInactivityModal" @confirm="confirmActivity" />
    <NotificationModal v-if="showNotifications" :visible="showNotifications" :lowStockProducts="lowStockProducts" @close="() => showNotifications = false" @edit="goToEditProduct" />
    <UserProfileModal 
      v-if="showProfileModal" 
      @close="() => showProfileModal = false"
      @profile-updated="onProfileUpdated"
    />

    <!-- Toasts -->
    <ToastNotification :visible="toastVisible" :message="toastMessage" type="warning" icon="fas fa-exclamation-triangle" />
    <ToastNotification :visible="toast.show" :message="toast.message" />
  </div>
  
</template>

<script>
import Sidebar from '@/components/layout/Sidebar.vue';
import AppBar from '@/components/layout/AppBar.vue';
import NotificationModal from '@/components/modals/NotificationModal.vue';
import InactivityModal from '@/components/modals/InactivityModal.vue';
import UserProfileModal from '@/components/UserProfileModal.vue';
import ToastNotification from '@/components/layout/ToastNotification.vue';
import defaultUserImage from '@/assets/images/profile.png';
import axios from 'axios';
import { applyTheme, getPreferredTheme, watchSystemTheme } from '@/services/theme';
import { clearSession } from '@/services/session';
import realTimeService from '@/services/realTimeService';

export default {
  components: {
    Sidebar,
    AppBar,
    NotificationModal,
    InactivityModal,
    UserProfileModal,
    ToastNotification
  },
  data() {
    return {
      isSidebarVisible: true,
      userName: '',
      userImage: '',
      defaultImage: defaultUserImage,
      isSmallScreen: false,
      bodyOverflowBeforeDrawer: '',
      notificationCount: 0,
      theme: 'light',
      inactivityTimer: null,
      warningTimer: null,
      showInactivityModal: false,
      inactivityLimit: 10 * 60 * 1000,
      warningLimit: 5 * 60 * 1000,
      showNotifications: false,
      lowStockProducts: [],
      realtimeUnsubscribers: [],
      toastVisible: false,
      toastMessage: '',
      pageTitle: '',
      showProfileModal: false,
      lastActivity: Date.now(),
      warningShown: false,
      logoutTimer: null,
      toast: {
        show: false,
        message: '',
        timeout: null
      },
      stopWatchingSystemTheme: null,
    };
  },
  computed: {
    currentPageTitle() {
      const titles = {
        '/main/dashboard': 'Resumen',
        '/main/products': 'Productos',
        '/main/sales': 'Ventas',
        '/main/reports': 'Reportes',
        '/main/users': 'Equipo',
        '/main/actividades': 'Actividad',
      };
      return titles[this.$route.path] || this.pageTitle || 'Resumen';
    },
    currentUserRole() {
      return (localStorage.getItem('userRole') || '').toLowerCase();
    },
    fullUserImage() {
      const image = this.userImage || localStorage.getItem('userImage');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      if (!image || image === 'null' || image === 'undefined' || image === '') {
        return this.defaultImage;
      }

      // Las rutas de assets del frontend nunca deben convertirse en rutas de /uploads del API.
      if (image === this.defaultImage || image.startsWith('/src/assets/') || image.startsWith('/assets/')) {
        return image === this.defaultImage || image.startsWith('/src/assets/') ? this.defaultImage : image;
      }
      if (image.startsWith('http://') || image.startsWith('https://')) {
        if (/\/uploads\/+src\/assets\//i.test(image)) return this.defaultImage;
        return image;
      }
      if (image.startsWith('/uploads/')) {
        return `${apiUrl.replace(/\/$/, '')}${image}`;
      }
      return `${apiUrl.replace(/\/$/, '')}/uploads/${image.replace(/^\//, '')}`;
    }
  },
  watch: {
    isSidebarVisible() { this.syncMobileDrawerScroll(); },
    isSmallScreen() { this.syncMobileDrawerScroll(); }
  },
  created() {
    this.bodyOverflowBeforeDrawer = document.body.style.overflow;
    // Cargar datos del usuario de localStorage
    this.userName = localStorage.getItem('userName') || 'Usuario';
    this.userImage = localStorage.getItem('userImage') || this.defaultImage;
    
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize);
    this.setTheme(getPreferredTheme(), false);
    this.stopWatchingSystemTheme = watchSystemTheme((theme) => this.setTheme(theme, false));
    this.realtimeUnsubscribers = [
      realTimeService.subscribe('connection', this.handleRealtimeConnection),
      realTimeService.subscribe('data_changed', this.handleRealtimeChange),
      realTimeService.subscribe('session_revoked', this.handleRealtimeSessionRevoked),
    ];
    realTimeService.initialize();
    this.updateLowStockNotifications();
  },
  mounted() {
    this.resetInactivityTimer();
    this.syncMobileDrawerScroll();
    window.addEventListener('keydown', this.handleGlobalKeydown);
    ['mousemove', 'keydown', 'click'].forEach(event => {
      window.addEventListener(event, this.resetInactivityTimer);
    });
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeydown);
    document.body.style.overflow = this.bodyOverflowBeforeDrawer;
    ['mousemove', 'keydown', 'click'].forEach(event => {
      window.removeEventListener(event, this.resetInactivityTimer);
    });
    clearTimeout(this.inactivityTimer);
    clearTimeout(this.warningTimer);
    this.realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
    realTimeService.disconnect();
    this.stopWatchingSystemTheme?.();
  },
  methods: {
    toggleSidebar() {
      this.isSidebarVisible = !this.isSidebarVisible;
    },
    setSidebarVisible(visible) {
      this.isSidebarVisible = Boolean(visible);
      if (!this.isSidebarVisible && this.isSmallScreen) {
        this.$nextTick(() => document.querySelector('.mobile-menu-btn')?.focus());
      }
    },
    syncMobileDrawerScroll() {
      const isDrawerOverlay = this.isSmallScreen && window.innerWidth > 760 && this.isSidebarVisible;
      document.body.style.overflow = isDrawerOverlay ? 'hidden' : this.bodyOverflowBeforeDrawer;
    },
    handleGlobalKeydown(event) {
      if (event.key === 'Escape' && this.isSmallScreen && this.isSidebarVisible) {
        this.setSidebarVisible(false);
      }
    },
    checkScreenSize() {
      const wasSmallScreen = this.isSmallScreen;
      this.isSmallScreen = window.innerWidth <= 1024;
      
      // En un viewport móvil, mantener el menú cerrado hasta que la persona lo abra.
      if (wasSmallScreen !== this.isSmallScreen) {
        if (this.isSmallScreen) {
          this.isSidebarVisible = false;
        } else {
          this.isSidebarVisible = true;
        }
      }
    },
    async logout() {
      try {
        const token = localStorage.getItem('authToken');
        await axios.post('/api/users/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {}
      clearSession();
      this.$router.push('/login');
    },
    handleRealtimeConnection(data) {
      if (data.status === 'connected') this.updateLowStockNotifications();
    },
    handleRealtimeChange(change) {
      if (change.entities?.includes('inventory')) this.updateLowStockNotifications();
    },
    handleRealtimeSessionRevoked(data) {
      clearSession();
      this.showToast(data.message || 'Tu sesión ya no está activa.', 5000);
      this.$router.replace('/login');
    },
    toggleTheme() {
      const newTheme = this.theme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
    },
    setTheme(theme, rememberChoice = true) {
      this.theme = theme;
      applyTheme(theme, rememberChoice);
    },
    resetInactivityTimer() {
      clearTimeout(this.inactivityTimer);
      clearTimeout(this.warningTimer);
      this.startInactivityTimers();
      if (this.showInactivityModal) this.showInactivityModal = false;
    },
    startInactivityTimers() {
      this.warningTimer = setTimeout(() => {
        this.showInactivityModal = true;
        this.warningShown = true;
      }, this.warningLimit);
      this.inactivityTimer = setTimeout(() => {
        this.logout();
        this.showToast('Sesión cerrada por inactividad.');
      }, this.inactivityLimit);
    },
    confirmActivity() {
      this.showInactivityModal = false;
      this.resetInactivityTimer();
    },
    async openNotifications() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        const products = await res.json();
        this.lowStockProducts = Array.isArray(products) ? products.filter(p => p.stock <= p.stock_min) : [];
        this.notificationCount = this.lowStockProducts.length;
        this.showNotifications = true;
      } catch (e) {
        this.lowStockProducts = [];
        this.notificationCount = 0;
        this.showNotifications = true;
        console.error('Error fetching products:', e);
      }
    },
    async updateLowStockNotifications() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        const products = await res.json();
        const lowStock = products.filter(p => p.stock <= p.stock_min);
        if (this.notificationCount === 0 && lowStock.length > 0) {
          this.notificationCount = lowStock.length;
          this.lowStockProducts = lowStock;
          this.showLowStockToast();
        } else {
          this.notificationCount = lowStock.length;
          this.lowStockProducts = lowStock;
        }
      } catch (e) {
        this.lowStockProducts = [];
        this.notificationCount = 0;
      }
    },
    goToEditProduct(productId) {
      this.showNotifications = false;
      this.$router.push({
        path: '/main/products',
        query: { edit: productId }
      });
    },
    showLowStockToast() {
      this.toastMessage = `¡Atención! Hay ${this.notificationCount} producto(s) con bajo stock.`;
      this.toastVisible = true;
      setTimeout(() => {
        this.toastVisible = false;
      }, 4000);
    },
    setPageTitle(title) {
      this.pageTitle = title;
    },
    showToast(message, duration = 3000) {
      this.toast.message = message;
      this.toast.show = true;
      clearTimeout(this.toast.timeout);
      this.toast.timeout = setTimeout(() => {
        this.toast.show = false;
      }, duration);
    },
    onProfileUpdated(updatedUserData) {
      if (updatedUserData.name) {
        this.userName = updatedUserData.name;
        localStorage.setItem('userName', updatedUserData.name);
      }
      if (updatedUserData.email) localStorage.setItem('userEmail', updatedUserData.email);
      if (updatedUserData.image) {
        let imageToStore = updatedUserData.image;
        if (imageToStore.startsWith('http')) {
          const urlParts = imageToStore.split('/uploads/');
          if (urlParts.length > 1) {
            imageToStore = `/uploads/${urlParts[1]}`;
          }
        }
        
        this.userImage = imageToStore;
        localStorage.setItem('userImage', imageToStore);
      }
      this.showProfileModal = false;
      this.showToast('Perfil actualizado correctamente', 3000);
    }
  }
};
</script>

<style scoped>
.main-container {
  min-height: 100vh;
  width: 100%;
  background: var(--app-background, #f1f5f6);
  color: var(--app-ink, #15283b);
  display: flex;
  flex-direction: row;
  align-items: stretch;
  position: relative;
  overflow-x: clip;
}

.sidebar-backdrop {
  display: none;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
  margin: 0;
  transition: none;
}

.content-wrapper.collapsed {
  margin-left: 0;
}

.main-content {
  flex: 1;
  min-height: 0;
  padding: 23px clamp(18px, 3.5vw, 48px) 45px;
  background: var(--app-background, #f1f5f6);
}

.dashboard-inner {
  width: 100%;
  max-width: 1510px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .content-wrapper,
  .content-wrapper.collapsed { margin-left: 0; }

  .main-content {
    padding: 20px clamp(14px, 3.5vw, 28px) 32px;
  }

  .sidebar-backdrop {
    position: fixed;
    z-index: 150;
    inset: 0;
    display: block;
    background: rgba(7, 20, 30, 0.42);
    backdrop-filter: blur(3px);
  }
}

@media (max-width: 560px) {
  .main-content {
    padding: 17px 14px 28px;
  }
}

/* Diseño del sistema autenticado: misma línea visual clara y compacta de la demo. */
.main-container {
  --surface: var(--app-surface, #fff);
  --surface-soft: var(--app-surface-soft, #f7fafb);
  --ink: var(--app-ink, #203746);
  --muted: var(--app-muted, #788a95);
  --line: var(--app-border, #e2e9eb);
  --accent: var(--app-accent, #2bb9a6);
  --accent-soft: var(--app-accent-soft, #eaf7f4);
}

.main-container.demo-shell {
  background: var(--app-background, #f4f7f8);
}

.content-wrapper.demo-main {
  min-height: 100vh;
  margin: 0;
}

.main-container .main-content.demo-content {
  padding: 23px clamp(18px, 3.5vw, 48px) 45px;
  background: var(--app-background, #f4f7f8);
}

.main-container .content-wrapper.demo-main :deep(.app-bar.demo-topbar) {
  position: sticky;
  top: 0;
  left: auto;
  width: 100%;
  height: 62px;
  padding: 0 clamp(18px, 3.5vw, 48px);
}

.main-container :deep(.page-heading) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 62px;
}

.main-container :deep(.page-heading h1) {
  margin: 0;
  color: var(--ink);
  font-size: 1.55rem;
  font-weight: 730;
  letter-spacing: -.05em;
  line-height: 1.2;
}

.main-container :deep(.page-heading p:not(.eyebrow)) {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: .76rem;
}

.main-container :deep(.eyebrow) {
  margin: 0 0 5px;
  color: #148a83;
  font-size: .62rem;
  font-weight: 760;
  letter-spacing: .12em;
}

.main-container :deep(.primary-button),
.main-container :deep(.secondary-button) {
  display: inline-flex;
  min-height: 39px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid #078f89;
  border-radius: 9px;
  background: #078f89;
  color: #fff;
  font-size: .72rem;
  font-weight: 690;
  text-decoration: none;
  white-space: nowrap;
}

.main-container :deep(.secondary-button) {
  border-color: var(--line);
  background: var(--surface);
  color: var(--ink);
}

.main-container :deep(.metric-grid) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.main-container :deep(.metric-grid.compact-metrics) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.main-container :deep(.metric-card) {
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface);
  box-shadow: 0 4px 14px rgba(22, 50, 67, .025);
}

.main-container :deep(.metric-card > span),
.main-container :deep(.metric-top) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: .68rem;
}

.main-container :deep(.metric-card > strong) {
  display: block;
  margin-top: 8px;
  color: var(--ink);
  font-size: 1.37rem;
  font-weight: 730;
  letter-spacing: -.045em;
}

.main-container :deep(.metric-icon) {
  display: grid;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  place-items: center;
  border-radius: 9px;
  font-size: .75rem;
}

.main-container :deep(.metric-icon.teal) { background: #e8f6f3; color: #128e84; }
.main-container :deep(.metric-icon.blue) { background: #edf3fc; color: #5a7fbd; }
.main-container :deep(.metric-icon.violet) { background: #f3effb; color: #8464b6; }
.main-container :deep(.metric-icon.amber) { background: #fff5e8; color: #ce9140; }
.main-container :deep(.metric-foot) { display: block; margin-top: 8px; color: var(--muted); font-size: .67rem; }

.main-container :deep(.demo-panel) {
  min-width: 0;
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 5px 17px rgba(22, 50, 67, .025);
}

.main-container :deep(.filters-panel) {
  padding: 0;
}

.main-container :deep(.table-toolbar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  border-bottom: 1px solid var(--line);
}

.main-container :deep(.filters-panel .table-toolbar) { border: 0; }

.main-container :deep(.search-box) {
  display: flex;
  min-width: min(100%, 330px);
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: #82929c;
}

.main-container :deep(.search-box input) {
  width: 100%;
  height: 34px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: .68rem;
}

.main-container :deep(.search-box button) {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: var(--surface-soft);
  color: var(--muted);
}

.main-container :deep(.filters-panel select),
.main-container :deep(.filters-panel input[type="date"]) {
  min-height: 34px;
  padding: 0 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: .68rem;
}

.main-container :deep(.products-results.table-panel),
.main-container :deep(.sales-results.table-panel),
.main-container :deep(.reports-table-container.table-panel),
.main-container :deep(.users-table-container.table-panel) {
  padding: 0;
  overflow: hidden;
}

.main-container :deep(.products-results .table-toolbar),
.main-container :deep(.sales-results .table-toolbar),
.main-container :deep(.reports-table-container .table-toolbar),
.main-container :deep(.users-table-container .table-toolbar) {
  border-bottom: 1px solid var(--line);
}

.main-container :deep(.table-title-group h2) {
  margin: 3px 0 0;
  color: var(--ink);
  font-size: .84rem;
  font-weight: 710;
}

.main-container :deep(.compact-metrics + .filters-panel) { margin-top: 0; }

.main-container :deep(.metric-grid + .filters-panel),
.main-container :deep(.filters-panel + .products-results),
.main-container :deep(.filters-panel + .sales-results) {
  margin-top: 0;
}

.main-container .main-content :deep(.products-table) {
  width: 100%;
  overflow: auto;
  border-radius: 0 0 14px 14px;
  background: var(--surface);
}

.main-container .main-content :deep(.products-table table) {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  color: var(--ink);
  text-align: left;
}

.main-container .main-content :deep(.products-table th),
.main-container .main-content :deep(.products-table td) {
  height: 58px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: .69rem;
  vertical-align: middle;
}

.main-container .main-content :deep(.products-table th) {
  height: 39px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: .61rem;
  font-weight: 680;
  text-transform: uppercase;
}

.main-container .main-content :deep(.table-product) { display: flex; align-items: center; gap: 9px; }
.main-container .main-content :deep(.table-product > span) { display: grid; gap: 3px; min-width: 0; }
.main-container .main-content :deep(.table-product b) { color: var(--ink); font-size: .68rem; }
.main-container .main-content :deep(.table-product small),
.main-container .main-content :deep(.stock-subtext) { display: block; max-width: 280px; overflow: hidden; color: var(--muted); font-size: .59rem; text-overflow: ellipsis; white-space: nowrap; }
.main-container .main-content :deep(.table-product-image) { width: 36px; height: 36px; flex: 0 0 36px; border: 1px solid var(--line); border-radius: 9px; object-fit: cover; }
.main-container .main-content :deep(.status-pill) { display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 7px; font-size: .6rem; font-weight: 680; }
.main-container .main-content :deep(.status-pill i) { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.main-container .main-content :deep(.status-pill.healthy) { background: #ebf7f1; color: #248b69; }
.main-container .main-content :deep(.status-pill.warning) { background: #fff6e8; color: #b77c28; }
.main-container .main-content :deep(.small-action) { padding: 6px 8px; border: 1px solid #dcece8; border-radius: 7px; background: #f6fbf9; color: #267e74; font-size: .6rem; font-weight: 650; white-space: nowrap; }
.main-container .main-content :deep(.product-actions-cell) { white-space: nowrap; }
.main-container .main-content :deep(.product-actions-cell button) { display: inline-grid; width: 29px; height: 29px; margin-right: 4px; place-items: center; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--muted); }
.main-container .main-content :deep(.product-actions-cell .edit-btn:hover) { background: var(--accent-soft); color: var(--accent); }
.main-container .main-content :deep(.product-actions-cell .delete-btn:hover) { background: #fff0ef; color: #c45f62; }
.main-container .main-content :deep(.sales-filters) { display: flex; align-items: center; gap: 8px; }
.main-container .main-content :deep(.sales-filters .date-filter),
.main-container .main-content :deep(.sales-filters .method-select) { width: auto; min-width: 132px; }
.main-container .main-content :deep(.activities-list.activity-list-panel) { display: grid; gap: 0; padding: 4px 18px; }
.main-container .main-content :deep(.activity-item.activity-row) { display: flex; align-items: center; gap: 10px; min-height: 69px; margin: 0; padding: 9px 0; border: 0; border-top: 1px solid var(--line); border-radius: 0; background: transparent; box-shadow: none; }
.main-container .main-content :deep(.activity-item.activity-row:first-child) { border-top: 0; }
.main-container .main-content :deep(.activity-item.activity-row .activity-mark) { display: grid; width: 31px; height: 31px; flex: 0 0 31px; place-items: center; border-radius: 9px; background: #e8f6f2; color: #168a7f; font-size: .68rem; }
.main-container .main-content :deep(.activity-item.activity-row .activity-copy) { display: grid; flex: 1; gap: 4px; min-width: 0; }
.main-container .main-content :deep(.activity-item.activity-row .activity-header) { display: flex; align-items: center; justify-content: space-between; gap: 9px; }
.main-container .main-content :deep(.activity-item.activity-row .activity-title) { overflow: hidden; margin: 0; color: var(--ink); font-size: .69rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.main-container .main-content :deep(.activity-item.activity-row .activity-meta) { display: flex; flex-wrap: wrap; gap: 10px; color: var(--muted); font-size: .61rem; }
.main-container .main-content :deep(.activity-item.activity-row .meta-item) { display: inline-flex; align-items: center; gap: 5px; }
.main-container .main-content :deep(.activity-item.activity-row .activity-type) { padding: 4px 7px; border-radius: 7px; background: var(--accent-soft); color: var(--accent); font-size: .59rem; font-weight: 650; }
.main-container .main-content :deep(.activity-item.activity-row .activity-timestamp) { display: grid; gap: 2px; color: var(--muted); font-size: .6rem; text-align: right; }
.main-container .main-content :deep(.report-filter-heading) { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 15px 0; }
.main-container .main-content :deep(.report-filter-heading > div) { display: grid; gap: 3px; }
.main-container .main-content :deep(.report-period-label) { color: var(--ink); font-size: .68rem; font-weight: 650; }
.main-container .main-content :deep(.report-toolbar) { justify-content: flex-start; flex-wrap: wrap; }
.main-container .main-content :deep(.report-toolbar .date-container) { position: relative; display: flex; align-items: center; }
.main-container .main-content :deep(.report-toolbar .date-input) { min-width: 160px; padding: 0 10px; }
.main-container .main-content :deep(.report-toolbar .date-label) { position: absolute; top: -7px; left: 8px; padding: 0 4px; background: var(--surface); color: var(--muted); font-size: .58rem; }
.main-container .main-content :deep(.report-toolbar .export-controls) { margin-left: auto; }
.main-container .main-content :deep(.report-toolbar .export-buttons) { display: flex; gap: 6px; }
.main-container .main-content :deep(.report-toolbar .export-btn) { display: inline-flex; min-height: 34px; align-items: center; gap: 6px; padding: 0 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink); font-size: .65rem; }

.main-content {
  padding: 23px clamp(18px, 3.5vw, 48px) 45px;
}

.dashboard-inner {
  max-width: 1510px;
}

.main-container :deep(.app-bar) {
  height: 66px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 3px 14px rgba(20, 48, 65, .045);
  padding-inline: clamp(16px, 2.6vw, 34px);
}

.main-container :deep(.page-title) {
  color: var(--ink);
  font-size: .98rem;
  font-weight: 700;
  letter-spacing: -.02em;
}

.main-container :deep(.app-bar .icon-btn) {
  color: var(--muted);
}

.main-container :deep(.app-bar .icon-btn:hover) {
  background: var(--accent-soft);
  color: var(--accent);
}

.main-container :deep(.user-name) {
  color: var(--ink);
  font-weight: 650;
}

.main-container :deep(.dashboard-page),
.main-container .main-content :deep(.dynamic-content) {
  min-height: calc(100vh - 120px);
  max-height: none;
  overflow: visible;
  padding: 0;
  background: transparent;
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.main-container :deep(.dashboard-header),
.main-container :deep(.products-header),
.main-container :deep(.sales-header),
.main-container :deep(.reports-header),
.main-container :deep(.users-header),
.main-container :deep(.activities-header) {
  position: relative;
  margin: 0 0 18px;
  padding: 22px 24px;
  overflow: visible;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 8px 24px rgba(22, 48, 62, .045);
}

.main-container :deep(.dashboard-header::before),
.main-container :deep(.products-header::before),
.main-container :deep(.sales-header::before),
.main-container :deep(.reports-header::before),
.main-container :deep(.users-header::before),
.main-container :deep(.activities-header::before) {
  display: none;
}

.main-container :deep(.header-content) {
  position: relative;
  z-index: auto;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.main-container :deep(.header-left) {
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.main-container :deep(.header-icon) {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  padding: 0;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: 13px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 1.08rem;
  box-shadow: none;
}

.main-container :deep(.header-text h1) {
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.35rem, 2vw, 1.75rem);
  font-weight: 740;
  letter-spacing: -.045em;
  line-height: 1.2;
}

.main-container :deep(.header-subtitle) {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: .82rem;
  font-weight: 450;
  opacity: 1;
}

.main-container :deep(.header-stats) {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 14px;
}

.main-container :deep(.stat-item) {
  min-width: 92px;
  gap: 4px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-soft);
}

.main-container :deep(.stat-number) {
  color: var(--ink);
  font-size: 1rem;
  font-weight: 720;
  line-height: 1.15;
}

.main-container :deep(.stat-label) {
  color: var(--muted);
  font-size: .61rem;
  font-weight: 650;
  letter-spacing: .055em;
  opacity: 1;
}

.main-container :deep(.header-actions) {
  position: static;
  flex: 0 0 auto;
}

.main-container :deep(.btn-new-product),
.main-container :deep(.btn-new-sale),
.main-container :deep(.btn-new-user),
.main-container :deep(.btn-generate-report),
.main-container :deep(.btn-refresh),
.main-container :deep(.btn-primary) {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: .78rem;
  font-weight: 680;
  box-shadow: 0 5px 13px color-mix(in srgb, var(--accent) 19%, transparent);
  transition: background .16s ease, transform .16s ease, box-shadow .16s ease;
}

.main-container :deep(.btn-new-product:hover),
.main-container :deep(.btn-new-sale:hover),
.main-container :deep(.btn-new-user:hover),
.main-container :deep(.btn-generate-report:hover),
.main-container :deep(.btn-refresh:hover),
.main-container :deep(.btn-primary:hover) {
  transform: translateY(-1px);
  background: var(--app-accent-strong, #168f83);
  box-shadow: 0 7px 17px color-mix(in srgb, var(--accent) 22%, transparent);
}

.main-container :deep(.filters-section) {
  position: relative;
  z-index: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 14px 0 0;
  border-top: 1px solid var(--line);
}

.main-container :deep(.search-container) {
  flex: 1 1 280px;
  min-width: min(100%, 240px);
}

.main-container :deep(.search-wrapper),
.main-container :deep(.filter-wrapper),
.main-container :deep(.date-wrapper) {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
}

.main-container :deep(.search-icon),
.main-container :deep(.filter-icon),
.main-container :deep(.date-icon) {
  color: #91a1aa;
}

.main-container :deep(.search-input),
.main-container :deep(.category-select),
.main-container :deep(.date-filter),
.main-container :deep(.method-select),
.main-container :deep(.role-select),
.main-container :deep(.type-select),
.main-container :deep(.period-select),
.main-container :deep(.date-input) {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  color: var(--ink);
  font-size: .76rem;
  box-shadow: none;
}

.main-container :deep(.search-input) {
  border: 0;
  background: transparent;
  color: var(--ink);
}

.main-container :deep(.search-input::placeholder) {
  color: #98a7af;
  opacity: 1;
}

.main-container :deep(.search-input:focus),
.main-container :deep(.category-select:focus),
.main-container :deep(.date-filter:focus),
.main-container :deep(.method-select:focus),
.main-container :deep(.role-select:focus),
.main-container :deep(.date-input:focus) {
  border-color: color-mix(in srgb, var(--accent) 62%, white);
  outline: 0;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}

.main-container :deep(.dynamic-content > .loader),
.main-container :deep(.dashboard-content > .loader) {
  margin: 52px auto;
}

.main-container :deep(.dashboard-content),
.main-container :deep(.products-results),
.main-container :deep(.sales-results),
.main-container :deep(.users-table-container),
.main-container :deep(.activities-content),
.main-container :deep(.reports-content),
.main-container :deep(.report-results) {
  color: var(--ink);
}

.main-container :deep(.dashboard-content) {
  display: grid;
  gap: 16px;
}

.main-container :deep(.products-results),
.main-container :deep(.sales-results),
.main-container :deep(.users-table-container),
.main-container :deep(.activities-content),
.main-container :deep(.report-card),
.main-container :deep(.report-section),
.main-container :deep(.reports-table-container) {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 7px 20px rgba(22, 48, 62, .035);
}

.main-container :deep(.users-table-container),
.main-container :deep(.activities-content),
.main-container :deep(.report-card),
.main-container :deep(.report-section),
.main-container :deep(.reports-table-container) {
  padding: 18px;
}

.main-container :deep(.charts-section),
.main-container :deep(.top-products-section),
.main-container :deep(.top-sellers-section),
.main-container :deep(.restock-section),
.main-container :deep(.recent-activities-section) {
  margin: 0;
}

.main-container :deep(.section-header) {
  margin: 0 0 14px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--line);
}

.main-container :deep(.section-header h2),
.main-container :deep(.table-header h3),
.main-container :deep(.results-toolbar h2) {
  color: var(--ink);
  font-size: .92rem;
  font-weight: 720;
  letter-spacing: -.02em;
}

.main-container :deep(.section-header h2 i) {
  color: var(--accent);
  font-size: .9rem;
}

.main-container :deep(.section-caption),
.main-container :deep(.forecast-note) {
  color: var(--muted);
}

.main-container :deep(.charts-grid),
.main-container :deep(.top-products-grid),
.main-container :deep(.restock-grid) {
  gap: 14px;
}

.main-container :deep(.chart-card) {
  padding: 16px;
}

.main-container :deep(.chart-header h3) {
  color: var(--ink);
  font-size: .84rem;
}

.main-container :deep(.no-data-msg),
.main-container :deep(.insight-empty),
.main-container :deep(.no-products-msg),
.main-container :deep(.no-sales-msg),
.main-container :deep(.no-reports-msg) {
  border: 1px dashed var(--line);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--muted);
}

.main-container :deep(.product-rank-card),
.main-container :deep(.restock-card),
.main-container :deep(.sale-card) {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: none;
}

.main-container :deep(.product-rank-card:hover),
.main-container :deep(.sale-card:hover) {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 38%, var(--line));
  box-shadow: 0 10px 24px rgba(22, 48, 62, .08);
}

.main-container :deep(.product-name),
.main-container :deep(.seller-details strong),
.main-container :deep(.restock-copy h3) {
  color: var(--ink);
}

.main-container :deep(.products-results),
.main-container :deep(.sales-results) {
  overflow: hidden;
  padding: 0;
}

.main-container :deep(.results-toolbar),
.main-container :deep(.table-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.main-container :deep(.results-eyebrow) {
  color: var(--accent);
  font-size: .63rem;
  font-weight: 720;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.main-container :deep(.results-toolbar h2) {
  margin: 3px 0 0;
}

.main-container :deep(.results-count),
.main-container :deep(.table-summary) {
  color: var(--muted);
  font-size: .72rem;
}

.main-container :deep(.products-grid),
.main-container :deep(.sales-grid) {
  padding: 16px;
  gap: 14px;
}

.main-container :deep(.sales-table),
.main-container :deep(.table-wrapper),
.main-container :deep(.table-scroll),
.main-container :deep(.reports-table-wrapper) {
  overflow: auto;
  border: 0;
  border-radius: 0 0 14px 14px;
  background: var(--surface);
}

.main-container :deep(.sales-table table),
.main-container :deep(.users-table),
.main-container :deep(.reports-table),
.main-container :deep(.activities-table) {
  width: 100%;
  border-collapse: collapse;
  color: var(--ink);
}

.main-container :deep(.sales-table th),
.main-container :deep(.sales-table td),
.main-container :deep(.users-table th),
.main-container :deep(.users-table td),
.main-container :deep(.reports-table th),
.main-container :deep(.reports-table td),
.main-container :deep(.activities-table th),
.main-container :deep(.activities-table td) {
  padding: 12px 15px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: middle;
}

.main-container :deep(.sales-table th),
.main-container :deep(.users-table th),
.main-container :deep(.reports-table th),
.main-container :deep(.activities-table th) {
  background: var(--surface-soft);
  color: var(--muted);
  font-size: .64rem;
  font-weight: 700;
  letter-spacing: .035em;
  text-transform: uppercase;
}

.main-container :deep(.sales-table td),
.main-container :deep(.users-table td),
.main-container :deep(.reports-table td),
.main-container :deep(.activities-table td) {
  color: var(--ink);
  font-size: .74rem;
}

.main-container :deep(.sales-table tbody tr:hover),
.main-container :deep(.users-table tbody tr:hover),
.main-container :deep(.reports-table tbody tr:hover),
.main-container :deep(.activities-table tbody tr:hover) {
  background: var(--surface-soft);
}

.main-container :deep(.view-toggle),
.main-container :deep(.clear-filters-btn),
.main-container :deep(.section-link),
.main-container :deep(.text-button) {
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  color: var(--muted);
  box-shadow: none;
}

.main-container :deep(.view-toggle.active),
.main-container :deep(.section-link:hover),
.main-container :deep(.text-button:hover) {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
  background: var(--accent-soft);
  color: var(--accent);
}

.main-container .main-content :deep(.input-wrapper) { position: relative; display: block; }
.main-container .main-content :deep(.input-wrapper .input-icon) { position: absolute; top: 50%; left: 12px; z-index: 1; transform: translateY(-50%); pointer-events: none; }
.main-container .main-content :deep(.input-wrapper:has(textarea) .input-icon) { top: 15px; transform: none; }
.main-container .main-content :deep(.input-wrapper .form-input),
.main-container .main-content :deep(.input-wrapper .form-select) { padding-left: 38px; }
.main-container .main-content :deep(.input-wrapper .form-textarea) { padding: 10px 12px 10px 38px; }

.main-container .main-content :deep(.product-card) {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface);
  box-shadow: 0 4px 14px rgba(22, 50, 67, .035);
}

.main-container .main-content :deep(.product-card:hover) {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  box-shadow: 0 10px 24px rgba(22, 48, 62, .08);
}

.main-container .main-content :deep(.product-card-header) { height: 165px; background: var(--surface-soft); }
.main-container .main-content :deep(.product-card-header .product-image) { width: 100%; height: 100%; object-fit: cover; }
.main-container .main-content :deep(.product-card-body) { padding: 14px; background: var(--surface); color: var(--ink); }
.main-container .main-content :deep(.product-card-body h3),
.main-container .main-content :deep(.product-card-body .product-name) { color: var(--ink); font-size: .82rem; }
.main-container .main-content :deep(.product-card-body p),
.main-container .main-content :deep(.product-card-body .product-description) { color: var(--muted); font-size: .68rem; }
.main-container .main-content :deep(.product-pricing),
.main-container .main-content :deep(.product-stock-info) { border-color: var(--line); background: var(--surface-soft); }
.main-container .main-content :deep(.sale-card) { padding: 14px; color: var(--ink); }
.main-container .main-content :deep(.sale-card-header),
.main-container .main-content :deep(.sale-card-body) { color: var(--ink); }
.main-container .main-content :deep(.sale-card .info-row),
.main-container .main-content :deep(.sale-card .total-label) { color: var(--muted); }
.main-container .main-content :deep(.sale-card .total-amount) { color: var(--accent); }

.main-container :deep(.modal-overlay) {
  z-index: 260;
  padding: 18px;
  background: rgba(8, 24, 36, .56);
  backdrop-filter: blur(5px);
}

.main-container :deep(.modal-container) {
  width: min(100%, 920px);
  max-height: min(90vh, 860px);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 24px 70px rgba(5, 23, 35, .24);
}

.main-container :deep(.modal-header) {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 17px 20px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.main-container :deep(.modal-header h2),
.main-container :deep(.modal-title-section h2) {
  color: var(--ink);
  font-size: 1rem;
  font-weight: 730;
}

.main-container :deep(.modal-subtitle) {
  color: var(--muted);
  font-size: .73rem;
}

.main-container :deep(.modal-icon) {
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
}

.main-container :deep(.modal-body) {
  max-height: calc(90vh - 138px);
  overflow: auto;
  padding: 18px 20px;
  background: var(--surface);
}

.main-container :deep(.modal-footer) {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.main-container :deep(.form-section) {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.main-container :deep(.form-section > .section-header),
.main-container :deep(.form-section .section-header) {
  margin: 0;
  padding: 12px 15px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-soft);
}

.main-container :deep(.form-section .section-header h3) {
  margin: 0;
  color: var(--ink);
  font-size: .75rem;
  font-weight: 720;
  text-transform: uppercase;
}

.main-container :deep(.form-section .section-header i) {
  color: var(--accent);
}

.main-container :deep(.form-section .section-content),
.main-container :deep(.form-section .section-body) {
  padding: 15px;
}

.main-container :deep(.form-group label),
.main-container :deep(.form-section label) {
  color: var(--ink);
  font-size: .72rem;
  font-weight: 650;
}

.main-container :deep(.input-wrapper) {
  position: relative;
}

.main-container :deep(.input-icon) {
  color: #97a7af;
}

.main-container :deep(.form-input),
.main-container :deep(.form-select),
.main-container :deep(.form-textarea),
.main-container :deep(.modal-container input:not([type="checkbox"]):not([type="radio"])),
.main-container :deep(.modal-container select),
.main-container :deep(.modal-container textarea) {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  color: var(--ink);
  font-size: .76rem;
  box-shadow: none;
}

.main-container :deep(.modal-container textarea) {
  min-height: 92px;
  padding: 10px 12px;
}

.main-container :deep(.form-input:focus),
.main-container :deep(.form-select:focus),
.main-container :deep(.form-textarea:focus),
.main-container :deep(.modal-container input:focus),
.main-container :deep(.modal-container select:focus),
.main-container :deep(.modal-container textarea:focus) {
  border-color: color-mix(in srgb, var(--accent) 60%, white);
  outline: 0;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}

.main-container :deep(.modal-close-btn) {
  border: 0;
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--muted);
}

.main-container :deep(.modal-close-btn:hover) {
  background: var(--accent-soft);
  color: var(--accent);
}

.main-container :deep(.btn-secondary),
.main-container :deep(.modal-footer .btn-secondary),
.main-container :deep(.modal-footer .btn-cancel) {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  color: var(--ink);
  font-size: .76rem;
  font-weight: 650;
}

.main-container :deep(.modal-footer .btn-primary),
.main-container :deep(.modal-footer .btn-save),
.main-container :deep(.modal-footer .btn-submit) {
  min-height: 40px;
  border: 1px solid var(--accent);
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  font-size: .76rem;
  font-weight: 680;
}

@media (max-width: 760px) {
  .main-container.demo-shell { display: block; }
  .main-container :deep(.sidebar-backdrop) { display: none !important; }
  .main-container :deep(.sidebar.demo-sidebar.mobile-hidden) { display: none; transform: none; }
  .main-container .content-wrapper.demo-main :deep(.app-bar.demo-topbar) { height: 52px; padding: 0 16px; }

  .main-content {
    padding: 20px clamp(14px, 3.5vw, 28px) 32px;
  }

  .main-container :deep(.dashboard-header),
  .main-container :deep(.products-header),
  .main-container :deep(.sales-header),
  .main-container :deep(.reports-header),
  .main-container :deep(.users-header),
  .main-container :deep(.activities-header) {
    padding: 17px;
    border-radius: 13px;
  }

  .main-container :deep(.header-content) {
    align-items: flex-start;
  }

  .main-container :deep(.header-stats) {
    gap: 7px;
  }

  .main-container :deep(.stat-item) {
    min-width: 78px;
    padding: 8px 9px;
  }

  .main-container :deep(.header-actions) {
    width: 100%;
  }

  .main-container :deep(.header-actions button) {
    width: 100%;
    justify-content: center;
  }

  .main-container :deep(.users-table-container),
  .main-container :deep(.activities-content),
  .main-container :deep(.report-card),
  .main-container :deep(.report-section),
  .main-container :deep(.reports-table-container) {
    padding: 14px;
  }

  .main-container :deep(.modal-overlay) {
    padding: 10px;
  }

  .main-container :deep(.modal-container) {
    max-height: 94vh;
    border-radius: 13px;
  }

  .main-container :deep(.modal-body) {
    max-height: calc(94vh - 128px);
    padding: 14px;
  }
}

@media (max-width: 540px) {
  .main-content {
    padding: 17px 14px 28px;
  }

  .main-container :deep(.header-content),
  .main-container :deep(.header-left) {
    align-items: flex-start;
  }

  .main-container :deep(.header-content) {
    flex-direction: column;
  }

  .main-container :deep(.header-left) {
    width: 100%;
  }

  .main-container :deep(.header-text h1) {
    font-size: 1.27rem;
  }

  .main-container :deep(.filters-section) {
    align-items: stretch;
  }

  .main-container :deep(.search-container),
  .main-container :deep(.filter-container),
  .main-container :deep(.filter-wrapper),
  .main-container :deep(.date-container) {
    width: 100%;
    min-width: 0;
  }

  .main-container :deep(.page-heading) {
    align-items: stretch;
    flex-direction: column;
  }

  .main-container :deep(.metric-grid),
  .main-container :deep(.metric-grid.compact-metrics) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .main-container :deep(.metric-card) { padding: 12px; }
  .main-container :deep(.metric-card > strong) { font-size: 1.15rem; }
  .main-container :deep(.table-toolbar) { flex-wrap: wrap; }
  .main-container :deep(.search-box) { min-width: 100%; }
}

/* Mantén el mismo ancho útil y el mismo ritmo vertical que la demo. */
.main-container .main-content.demo-content {
  padding: 0;
}

.main-container .dashboard-inner {
  box-sizing: border-box;
  max-width: 1510px;
  padding: 23px clamp(18px, 3.5vw, 48px) 45px;
}

.main-container .main-content :deep(.dynamic-content) {
  display: grid;
  align-content: start;
  gap: 17px;
}

@media (max-width: 1024px) {
  .main-container .dashboard-inner {
    padding: 20px clamp(14px, 3.5vw, 28px) 32px;
  }
}

@media (max-width: 760px) {
  .main-container .dashboard-inner {
    padding: 17px 14px 32px;
  }
}

/* Ajustes de tablet y móvil para evitar controles apretados y scroll horizontal. */
@media (max-width: 1024px) {
  .main-container :deep(.metric-grid),
  .main-container :deep(.metric-grid.compact-metrics) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-container :deep(.dashboard-grid) {
    grid-template-columns: minmax(0, 1.35fr) minmax(220px, .9fr);
  }

  .main-container :deep(.products-grid),
  .main-container :deep(.sales-grid) {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 245px), 1fr));
  }

  .main-container .main-content :deep(.table-wrapper),
  .main-container .main-content :deep(.sales-table),
  .main-container .main-content :deep(.reports-table-wrapper),
  .main-container .main-content :deep(.table-scroll) {
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

@media (min-width: 761px) and (max-width: 900px) {
  .main-container .content-wrapper.demo-main :deep(.app-bar .user-name) {
    display: none;
  }

  .main-container .content-wrapper.demo-main :deep(.app-bar.demo-topbar) {
    padding-inline: 16px;
  }
}

@media (min-width: 761px) and (max-width: 1024px) {
  .main-container :deep(.sidebar.demo-sidebar) {
    width: 210px;
    flex-basis: 210px;
    padding-inline: 13px;
  }
}

@media (max-width: 760px) {
  .main-container .main-content :deep(.page-heading) {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }

  .main-container .main-content :deep(.page-heading > .primary-button),
  .main-container .main-content :deep(.page-heading > .secondary-button) {
    min-height: 38px;
  }

  .main-container :deep(.dashboard-grid) {
    grid-template-columns: minmax(0, 1fr);
  }

  .main-container :deep(.main-content .filters-panel .table-toolbar),
  .main-container .main-content :deep(.filters-panel .table-toolbar),
  .main-container .main-content :deep(.report-toolbar) {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .main-container .main-content :deep(.search-box),
  .main-container .main-content :deep(.sales-filters),
  .main-container .main-content :deep(.product-toolbar > .search-box),
  .main-container .main-content :deep(.activities-toolbar > .search-box) {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
  }

  .main-container .main-content :deep(.sales-filters > *),
  .main-container .main-content :deep(.sales-toolbar .view-controls),
  .main-container .main-content :deep(.product-toolbar .category-select),
  .main-container .main-content :deep(.activities-toolbar select),
  .main-container .main-content :deep(.users-toolbar select) {
    flex: 1 1 145px;
    min-width: 0;
    width: 100%;
  }

  .main-container .main-content :deep(.view-controls) {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .main-container .main-content :deep(.report-toolbar .date-container) {
    flex: 1 1 140px;
    min-width: 0;
  }

  .main-container .main-content :deep(.report-toolbar .date-input) {
    width: 100%;
    min-width: 0;
  }

  .main-container .main-content :deep(.report-toolbar .export-controls) {
    flex: 1 1 100%;
    margin-left: 0;
  }

  .main-container .main-content :deep(.report-toolbar .export-buttons) {
    flex-wrap: wrap;
  }

  .main-container .main-content :deep(.activity-item.activity-row) {
    align-items: flex-start;
  }

  .main-container .main-content :deep(.activity-item.activity-row .activity-header) {
    align-items: flex-start;
    flex-direction: column;
  }

  .main-container .main-content :deep(.activity-item.activity-row .activity-title) {
    white-space: normal;
  }

  .main-container .main-content :deep(.activity-item.activity-row .activity-timestamp) {
    display: none;
  }
}

@media (max-width: 480px) {
  .main-container .content-wrapper.demo-main :deep(.app-bar.demo-topbar) {
    padding-inline: 12px;
  }

  .main-container .content-wrapper.demo-main :deep(.breadcrumb > span),
  .main-container .content-wrapper.demo-main :deep(.breadcrumb-chevron) {
    display: none;
  }

  .main-container .content-wrapper.demo-main :deep(.topbar-right) {
    gap: 5px;
  }

  .main-container .main-content :deep(.metric-grid),
  .main-container .main-content :deep(.metric-grid.compact-metrics) {
    gap: 8px;
  }

  .main-container .main-content :deep(.metric-card) {
    padding: 11px;
  }

  .main-container .main-content :deep(.metric-card > strong) {
    overflow-wrap: anywhere;
    font-size: 1.05rem;
  }

  .main-container .main-content :deep(.table-toolbar),
  .main-container .main-content :deep(.results-toolbar),
  .main-container .main-content :deep(.table-header) {
    padding-inline: 12px;
  }

  .main-container .main-content :deep(.products-grid),
  .main-container .main-content :deep(.sales-grid) {
    grid-template-columns: minmax(0, 1fr);
    padding: 10px;
  }

  .main-container .main-content :deep(.activity-list-panel) {
    padding-inline: 12px;
  }
}

@media (max-width: 360px) {
  .main-container .main-content :deep(.metric-grid),
  .main-container .main-content :deep(.metric-grid.compact-metrics) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
