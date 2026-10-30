<template>
  <div class="dashboard-page">
    <div class="page-heading dashboard-page-heading">
      <div>
        <p class="eyebrow">{{ todayLabel }}</p>
        <h1>Resumen del negocio</h1>
        <p>Así marcha tu tienda. Aquí tienes lo importante de hoy.</p>
      </div>
      <div class="dashboard-heading-actions">
        <span class="connection-pill" :class="realTimeStatus"><i></i>{{ realTimeStatus === 'connected' ? 'En tiempo real' : realTimeStatus === 'connecting' ? 'Conectando' : 'Sin conexión en tiempo real' }}</span>
        <router-link to="/main/sales" class="primary-button"><i class="fas fa-plus"></i> Registrar venta</router-link>
      </div>
    </div>

    <div v-if="loading" class="dashboard-loading"><span class="loader"></span><span>Actualizando los datos del negocio…</span></div>

    <div v-else class="dashboard-content">
      <div v-if="dashboardWarnings.length" class="dashboard-warning" role="status">
        <i class="fas fa-circle-exclamation"></i>
        <span>{{ dashboardWarnings.join(' · ') }}</span>
        <button type="button" @click="refreshData" :disabled="isRefreshing">{{ isRefreshing ? 'Actualizando…' : 'Reintentar' }}</button>
      </div>
      <section class="metric-grid">
        <article class="metric-card"><div class="metric-top"><span>Ventas del mes</span><span class="metric-icon teal"><i class="fas fa-wallet"></i></span></div><strong>S/ {{ formatCurrency(resumenVentas.mes) }}</strong><small class="metric-foot">Ingresos registrados este mes</small></article>
        <article class="metric-card"><div class="metric-top"><span>Ventas de hoy</span><span class="metric-icon blue"><i class="fas fa-receipt"></i></span></div><strong>S/ {{ formatCurrency(resumenVentas.hoy) }}</strong><small class="metric-foot">Ingresos registrados hoy</small></article>
        <article class="metric-card"><div class="metric-top"><span>Usuarios activos</span><span class="metric-icon violet"><i class="fas fa-users"></i></span></div><strong>{{ resumenUsuarios.activos }}</strong><small class="metric-foot">Cuentas habilitadas</small></article>
        <article class="metric-card"><div class="metric-top"><span>Productos activos</span><span class="metric-icon amber"><i class="fas fa-box"></i></span></div><strong>{{ inventoryCount }}</strong><small class="metric-foot">{{ lowStockCount }} requieren revisar stock</small></article>
      </section>

      <section class="dashboard-grid">
        <article class="demo-panel chart-panel">
          <div class="panel-heading"><div><h2>Ventas de los últimos 7 días</h2><p>Ingresos diarios · soles</p></div><div class="chart-heading-actions"><strong class="chart-period-total">S/ {{ formatCurrency(weeklySalesTotal) }}</strong><button class="soft-select" type="button" @click="refreshData" :disabled="isRefreshing"><i class="fas fa-rotate" :class="{ 'fa-spin': isRefreshing }"></i><span>{{ isRefreshing ? 'Actualizando…' : 'Actualizar' }}</span></button></div></div>
          <div v-if="weeklySalesSeries.some(day => day.total > 0)" class="real-chart-wrap" role="img" aria-label="Gráfico de ingresos por día de los últimos siete días"><Bar :data="chartDataVentasPorDia" :options="barOptions" /></div>
          <div v-else class="dashboard-empty"><i class="fas fa-chart-column"></i><strong>{{ ventasPorDiaError ? 'No se pudo cargar el gráfico' : 'Sin ventas en los últimos 7 días' }}</strong><span>{{ ventasPorDiaError || 'Cuando se registren ventas, aparecerá aquí el movimiento diario.' }}</span></div>
        </article>

        <article class="demo-panel seller-highlight">
          <div class="panel-heading"><div><h2>Mejor vendedor</h2><p>Por monto vendido · ventas vigentes</p></div><i class="fas fa-ellipsis" aria-hidden="true"></i></div>
          <template v-if="topSellers.length">
            <div class="seller-feature"><span class="seller-crown"><i class="fas fa-crown"></i></span><div class="seller-photo">{{ getInitials(topSellers[0].nombre) }}</div><div class="seller-person"><strong>{{ topSellers[0].nombre }}</strong><span>{{ getRoleDisplayName(topSellers[0].rol) }}</span></div></div>
            <div class="seller-total"><strong>S/ {{ formatCurrency(topSellers[0].total_vendido) }}</strong><span>{{ topSellers[0].ventas_realizadas }} {{ topSellers[0].ventas_realizadas === 1 ? 'venta' : 'ventas' }}</span></div>
            <div v-if="topSellers.length > 1" class="seller-secondary-list"><div v-for="(seller, index) in topSellers.slice(1, 4)" :key="seller.id"><span>{{ String(index + 2).padStart(2, '0') }}</span><strong>{{ seller.nombre }}</strong><b>S/ {{ formatCurrency(seller.total_vendido) }}</b></div></div>
          </template>
          <div v-else class="dashboard-empty compact"><i class="fas fa-user-tie"></i><strong>{{ dashboardErrors.insights ? 'No se pudo cargar el ranking' : 'Aún no hay ventas atribuidas' }}</strong><span>{{ dashboardErrors.insights || 'El ranking se actualizará al registrar ventas.' }}</span></div>
        </article>
      </section>

      <section class="demo-panel payment-mix-panel">
        <div class="panel-heading"><div><h2>Medios de pago</h2><p>Distribución de ingresos de ventas vigentes</p></div><span class="chart-context-pill">{{ paymentStats.length }} {{ paymentStats.length === 1 ? 'medio' : 'medios' }}</span></div>
        <div v-if="paymentStats.length" class="payment-chart-layout">
          <div class="payment-chart-wrap">
            <Doughnut :data="chartDataMetodosPago" :options="doughnutOptions" />
            <div class="payment-chart-center"><span>Total cobrado</span><strong>S/ {{ formatCurrency(paymentTotal) }}</strong></div>
          </div>
          <div class="payment-legend" aria-label="Detalle de ingresos por medio de pago">
            <div v-for="method in paymentStats" :key="method.key" class="payment-legend-row">
              <span class="payment-legend-dot" :style="{ '--legend-color': method.color }"></span>
              <span class="payment-legend-name">{{ method.label }}</span>
              <span class="payment-legend-share">{{ method.percent }}%</span>
              <strong>S/ {{ formatCurrency(method.total) }}</strong>
              <span class="payment-legend-track"><i :style="{ width: `${method.percent}%`, backgroundColor: method.color }"></i></span>
            </div>
          </div>
        </div>
        <div v-else class="dashboard-empty compact"><i class="fas fa-credit-card"></i><strong>Sin pagos registrados</strong><span>El resumen por medio de pago se completará con las ventas vigentes.</span></div>
      </section>

      <section class="demo-panel dashboard-list-panel">
        <div class="panel-heading"><div><h2>Productos más vendidos</h2><p>Rendimiento según ventas registradas</p></div><router-link to="/main/products" class="text-button">Ver inventario <i class="fas fa-arrow-right"></i></router-link></div>
        <div v-if="topProducts.length" class="best-sellers">
          <article v-for="(product, index) in topProducts.slice(0, 5)" :key="product.id" class="best-seller-row">
            <span class="rank-pill">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="product-thumb"><img :src="product.image || defaultProductImg" :alt="product.name" @error="$event.target.src = defaultProductImg" /></span>
            <span class="best-product-name"><strong>{{ product.name }}</strong><small>{{ product.category || 'Sin categoría' }}</small></span>
            <span class="sold-count">{{ product.cantidad_vendida }} <small>vendidos</small></span>
            <div class="sold-bar"><i :style="{ width: `${Math.max(4, Number(product.cantidad_vendida || 0) / Number(topProducts[0].cantidad_vendida || 1) * 100)}%` }"></i></div>
            <strong class="sold-income">S/ {{ formatCurrency(product.total_ingresos) }}</strong>
          </article>
        </div>
        <div v-else class="dashboard-empty"><i class="fas fa-box-open"></i><strong>{{ dashboardErrors.products ? 'No se pudo cargar el ranking' : 'No hay productos vendidos todavía' }}</strong><span>{{ dashboardErrors.products || 'El ranking aparecerá cuando se registren ventas.' }}</span></div>
      </section>

      <section class="demo-panel restock-panel">
        <div class="panel-heading"><div><h2><i class="fas fa-wand-magic-sparkles heading-accent"></i> Reposición sugerida</h2><p>Pronóstico estacional calculado a partir del historial real</p></div><span class="forecast-badge">{{ upcomingMonths.length ? upcomingMonths.join(' · ') : 'Patrón estacional' }}</span></div>
        <div v-if="restockRecommendations.length" class="restock-list">
          <article v-for="item in restockRecommendations" :key="item.id" class="restock-row">
            <span class="product-thumb coral"><img :src="resolveProductImage(item.image)" :alt="item.name" @error="$event.target.src = defaultProductImg" /></span>
            <div class="restock-name"><strong>{{ item.name }}</strong><small>Mayor demanda prevista en {{ item.peak_month }} · historial de {{ historyMonths }} meses</small></div>
            <span class="stock-current"><small>Stock</small><b>{{ item.stock }} un.</b></span>
            <span class="stock-demand"><small>Demanda media</small><b>{{ item.average_units }} un.</b></span>
            <span class="buy-suggest"><small>Reponer</small><b>{{ item.recommended_units }} un.</b></span>
            <router-link to="/main/products" class="icon-button" title="Ir al inventario"><i class="fas fa-arrow-right"></i></router-link>
          </article>
        </div>
        <div v-else class="dashboard-empty compact"><i class="fas fa-chart-line"></i><strong>{{ dashboardErrors.insights ? 'No se pudo calcular la reposición' : 'Sin una tendencia estacional confirmada' }}</strong><span>{{ dashboardErrors.insights || 'Se necesita historial suficiente para sugerir compras con confianza.' }}</span></div>
        <p v-if="!dashboardErrors.insights" class="restock-footnote"><i class="fas fa-circle-info"></i> La recomendación usa meses equivalentes de años anteriores y considera el stock mínimo configurado.</p>
      </section>

      <section class="demo-panel recent-panel">
        <div class="panel-heading"><div><h2>Actividad reciente</h2><p>Los últimos movimientos del negocio</p></div><router-link to="/main/actividades" class="text-button">Ver actividad <i class="fas fa-arrow-right"></i></router-link></div>
        <div v-if="recentActivities.length" class="activity-list"><article v-for="activity in recentActivities.slice(0, 5)" :key="activity.id" class="activity-row"><span class="activity-mark tone-teal"><i :class="getActivityIcon(activity.tipo)"></i></span><span class="activity-copy"><strong>{{ activity.descripcion }}</strong><small>{{ activity.usuario || 'Sistema' }} · {{ formatTimeAgo(activity.fecha) }}</small></span><span class="activity-amount">{{ getActivityTypeName(activity.tipo) }}</span></article></div>
        <div v-else class="dashboard-empty compact"><i class="fas fa-clock-rotate-left"></i><strong>{{ dashboardErrors.activities ? 'No se pudo cargar la actividad' : 'Sin actividad registrada' }}</strong><span>{{ dashboardErrors.activities || 'Las acciones recientes aparecerán aquí.' }}</span></div>
      </section>
    </div>

    <!-- Notificaciones -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <i :class="notification.icon"></i>
      <span>{{ notification.message }}</span>
    </div>

    <div class="dashboard-background-decor"></div>
  </div>
</template>

<script>
import api from '@/services/api';
import realTimeService from '@/services/realTimeService';
import defaultProductImage from '@/assets/images/default-product.png';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';

// Registrar todos los componentes necesarios para Chart.js
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale
);

export default {
  name: 'Dashboard',
  components: { Bar, Doughnut },
  data() {
    return {
      // Estado de carga
      loading: true,
      isRefreshing: false,
      hasLoadedDashboard: false,
      // Estado de tiempo real
      realTimeConnected: false,
      realTimeStatus: 'disconnected',
      realTimeType: null,
      lastUpdate: null,
      realtimeRefreshTimer: null,
      // Datos existentes
      resumenVentas: { hoy: 0, mes: 0 },
      resumenUsuarios: { activos: 0 },
      inventoryProducts: [],
      metodosPago: [],
      ventasPorDia: [],
      ventasPorDiaError: null, // Para rastrear errores específicos de ventas por día
      summaryError: '',
      inventoryError: '',
      dashboardErrors: { products: '', insights: '', activities: '' },
      // Nuevos datos
      topProducts: [],
      topSellers: [],
      restockRecommendations: [],
      historyMonths: 36,
      upcomingMonths: [],
      recentActivities: [],
      // Imagen por defecto
      defaultProductImg: defaultProductImage,
      // Notificaciones
      notification: {
        show: false,
        message: '',
        type: 'success',
        icon: 'fas fa-check-circle'
      },
      notificationTimer: null,
      // Opciones de gráficos mejoradas
      doughnutOptions: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        animation: { duration: 650 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#102331',
            titleColor: '#f5fbff',
            bodyColor: '#d0e0e8',
            borderColor: '#355465',
            borderWidth: 1,
            cornerRadius: 10,
            displayColors: true,
            callbacks: {
              label(context) {
                const total = context.dataset.data.reduce((sum, value) => sum + Number(value || 0), 0);
                const percent = total ? (Number(context.parsed || 0) / total * 100).toFixed(1) : '0.0';
                return ` S/ ${Number(context.parsed || 0).toFixed(2)} · ${percent}%`;
              }
            }
          }
        },
        elements: {
          arc: {
            borderWidth: 4,
            borderColor: '#ffffff',
            hoverOffset: 7
          }
        }
      },
      barOptions: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#102331',
            titleColor: '#f5fbff',
            bodyColor: '#d0e0e8',
            borderColor: '#19a99c',
            borderWidth: 1,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                return `Ventas: S/ ${Number(context.parsed.y).toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            ticks: { 
              color: '#748b99',
              font: { size: 10, weight: '600' },
              maxRotation: 0,
              autoSkip: false
            },
            grid: { 
              color: 'rgba(115, 145, 160, 0.12)',
              drawBorder: false,
              display: false
            }
          },
          y: {
            type: 'linear',
            beginAtZero: true,
            ticks: { 
              color: '#748b99',
              font: { size: 10, weight: '500' },
              callback: function(value) {
                const amount = Number(value) || 0;
                return amount >= 1000 ? `S/ ${(amount / 1000).toFixed(1)}k` : `S/ ${amount.toFixed(0)}`;
              }
            },
            grid: { 
              color: 'rgba(115, 145, 160, 0.14)',
              drawBorder: false
            }
          }
        },
        elements: {
          bar: {
            borderRadius: {
              topLeft: 6,
              topRight: 6,
              bottomLeft: 0,
              bottomRight: 0
            },
            borderSkipped: false,
          }
        }
      }
    };
  },
  computed: {
    dashboardWarnings() {
      return [this.summaryError, this.inventoryError].filter(Boolean);
    },
    todayLabel() {
      return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
        .format(new Date()).toLocaleUpperCase('es-PE');
    },
    inventoryCount() {
      return this.inventoryProducts.filter(product => product.activo === undefined || Number(product.activo) !== 0).length;
    },
    lowStockCount() {
      return this.inventoryProducts.filter(product => (product.activo === undefined || Number(product.activo) !== 0) && (Number(product.low_stock) === 1 || product.low_stock === true || Number(product.stock) <= Number(product.stock_min || 0))).length;
    },
    weeklySalesSeries() {
      const now = new Date();
      const totalsByDate = new Map();
      for (const sale of this.ventasPorDia || []) {
        const key = String(sale.fecha || '').slice(0, 10);
        if (key) totalsByDate.set(key, (totalsByDate.get(key) || 0) + (Number(sale.total) || 0));
      }
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
        const key = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
        return { key, label: new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(day).replace('.', ''), total: totalsByDate.get(key) || 0 };
      });
    },
    weeklySalesTotal() {
      return this.weeklySalesSeries.reduce((total, day) => total + day.total, 0);
    },
    paymentStats() {
      const palette = ['#15a99b', '#6485f3', '#b47ae6', '#f0a64c', '#4bb8d6', '#e27791'];
      const labels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', yape: 'Yape', plin: 'Plin' };
      const methods = (this.metodosPago || [])
        .map((method, index) => ({
          key: String(method.metodo_pago || 'otro').toLowerCase(),
          label: labels[String(method.metodo_pago || '').toLowerCase()] || method.metodo_pago || 'Otro',
          total: Number(method.total) || 0,
          color: palette[index % palette.length]
        }))
        .filter(method => method.total > 0)
        .sort((a, b) => b.total - a.total);
      const total = methods.reduce((sum, method) => sum + method.total, 0);
      return methods.map(method => ({ ...method, percent: total ? Number((method.total / total * 100).toFixed(1)) : 0 }));
    },
    paymentTotal() {
      return this.paymentStats.reduce((total, method) => total + method.total, 0);
    },
    chartDataMetodosPago() {
      return {
        labels: this.paymentStats.map(method => method.label),
        datasets: [{
          data: this.paymentStats.map(method => method.total),
          backgroundColor: this.paymentStats.map(method => method.color),
          borderWidth: 0,
          hoverOffset: 6
        }]
      };
    },
    chartDataVentasPorDia() {
      return {
        labels: this.weeklySalesSeries.map(day => day.label),
        datasets: [{
          label: 'Ingresos (S/)',
          data: this.weeklySalesSeries.map(day => day.total),
          backgroundColor: context => {
            const values = context.dataset.data || [];
            const peak = Math.max(0, ...values);
            return Number(context.raw) === peak ? '#647ff0' : '#16aa9c';
          },
          borderRadius: 8,
          barPercentage: 0.58,
          categoryPercentage: 0.72,
          maxBarThickness: 48,
          borderSkipped: false,
        }]
      };
    }
  },
  async mounted() {
    this.$emit('set-title', 'Dashboard');
    
    // Inicializar servicio de tiempo real
    await this.initializeRealTime();
    
    // Cargar datos iniciales
    await this.loadAllData();
  },
  
  async beforeUnmount() {
    // Limpiar listeners y conexiones del tiempo real
    this.cleanupRealTime();
    clearTimeout(this.notificationTimer);
  },
  methods: {
    // ======= MÉTODOS DE TIEMPO REAL =======
    async initializeRealTime() {
      try {
        // Configurar listeners antes de inicializar
        realTimeService.addListener('data_changed', this.handleRealtimeChange);
        realTimeService.addListener('connection', this.handleConnectionStatus);
        
        // Inicializar el servicio
        await realTimeService.initialize();
        
      } catch (error) {
        console.warn('⚠️ Error inicializando tiempo real:', error);
        this.showNotification('Tiempo real no disponible, usando modo manual', 'warning', 'fas fa-exclamation-triangle');
      }
    },
    
    cleanupRealTime() {
      realTimeService.removeListener('data_changed', this.handleRealtimeChange);
      realTimeService.removeListener('connection', this.handleConnectionStatus);
      clearTimeout(this.realtimeRefreshTimer);
    },
    
    handleConnectionStatus(data) {
      this.realTimeStatus = data.status;
      this.realTimeType = data.type;
      this.realTimeConnected = data.status === 'connected';
      
      if (data.status === 'error') {
        console.warn('⚠️ Error de conexión tiempo real:', data.error);
      }
    },

    handleRealtimeChange(change = {}) {
      const entities = change.entities || [];
      if (!entities.length || ['sales', 'inventory', 'products', 'activities', 'users'].some(entity => entities.includes(entity))) {
        clearTimeout(this.realtimeRefreshTimer);
        this.realtimeRefreshTimer = setTimeout(() => {
          this.lastUpdate = new Date();
          this.loadAllData({ notify: false });
        }, 180);
      }
    },
    
    handleSalesUpdate(data) {
      this.lastUpdate = new Date();
      
      // Actualizar datos según el tipo de actualización
      if (data.type === 'summary') {
        this.resumenVentas = { ...this.resumenVentas, ...data.data };
      } else if (data.type === 'daily-sales') {
        this.ventasPorDia = this.processVentasPorDia(data.data);
      } else if (data.type === 'payment-methods') {
        this.metodosPago = data.data || [];
      }
      
      // Mostrar notificación de actualización
      this.showNotification('Datos de ventas actualizados', 'info', 'fas fa-chart-line');
    },
    
    handleActivitiesUpdate(data) {
      this.lastUpdate = new Date();
      
      if (data.data && Array.isArray(data.data)) {
        // Si es una nueva actividad, añadirla al principio
        if (data.type === 'new-activity') {
          this.recentActivities = [data.data, ...this.recentActivities.slice(0, 4)];
        } else {
          // Si es una actualización completa
          this.recentActivities = data.data.slice(0, 5);
        }
      }
      
      this.showNotification('Nueva actividad registrada', 'info', 'fas fa-bell');
    },
    
    handleProductsUpdate(data) {
      this.lastUpdate = new Date();
      
      if (data.data && Array.isArray(data.data)) {
        this.topProducts = data.data.slice(0, 5).map(product => ({
          ...product,
          image: this.resolveProductImage(product.image)
        }));
      }
      
      this.showNotification('Ranking de productos actualizado', 'info', 'fas fa-trophy');
    },

    // ======= MÉTODOS DE CARGA DE DATOS =======
    async loadAllData({ notify = true } = {}) {
      const initialLoad = !this.hasLoadedDashboard;
      this.isRefreshing = true;
      this.loading = initialLoad;
      try {
        await Promise.all([
          this.loadSummaryData(),
          this.loadInventorySummary(),
          this.loadTopProducts(),
          this.loadDashboardInsights(),
          this.loadRecentActivities()
        ]);
        this.lastUpdate = new Date();
        this.hasLoadedDashboard = true;
        if (notify) this.showNotification('Dashboard actualizado correctamente', 'success');
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        this.showNotification('Error al cargar datos del dashboard', 'error', 'fas fa-exclamation-triangle');
      } finally {
        this.loading = false;
        this.isRefreshing = false;
      }
    },

    async loadSummaryData() {
      const [summaryResult, usersResult, paymentsResult, dailyResult] = await Promise.allSettled([
        api.get('/sales/resumen'),
        api.get('/users/stats/activos'),
        api.get('/sales/metodos-pago'),
        api.get('/sales/ventas-por-dia')
      ]);
      const summaryFailures = [];

      if (summaryResult.status === 'fulfilled') {
        this.resumenVentas = summaryResult.value.data || { hoy: 0, mes: 0 };
      } else {
        console.error('Error cargando métricas de ventas:', summaryResult.reason);
        summaryFailures.push('ventas');
      }

      if (usersResult.status === 'fulfilled') {
        this.resumenUsuarios = usersResult.value.data || { activos: 0 };
      } else {
        console.error('Error cargando usuarios activos:', usersResult.reason);
        summaryFailures.push('usuarios');
      }

      if (paymentsResult.status === 'fulfilled') {
        this.metodosPago = Array.isArray(paymentsResult.value.data) ? paymentsResult.value.data : [];
      } else {
        console.error('Error cargando medios de pago:', paymentsResult.reason);
        summaryFailures.push('medios de pago');
      }
      this.summaryError = summaryFailures.length
        ? `No se pudieron actualizar: ${summaryFailures.join(', ')}.`
        : '';

      if (dailyResult.status === 'fulfilled') {
        this.ventasPorDia = this.processVentasPorDia(dailyResult.value.data);
        this.ventasPorDiaError = null;
      } else {
        console.error('Error cargando ventas por día:', dailyResult.reason);
        this.ventasPorDiaError = 'No fue posible consultar los ingresos diarios. Intenta actualizar el panel.';
      }
    },

    async loadInventorySummary() {
      try {
        const response = await api.get('/products');
        const products = Array.isArray(response.data) ? response.data : response.data?.products;
        this.inventoryProducts = Array.isArray(products) ? products : [];
        this.inventoryError = '';
      } catch (error) {
        console.error('Error cargando el inventario del dashboard:', error);
        this.inventoryError = 'No se pudo actualizar el resumen de inventario.';
      }
    },

    async loadTopProducts() {
      try {
        const response = await api.get('/sales/top-products?limit=5');
        
        // Verificar la estructura de la respuesta
        let products = [];
        
        if (response.data && Array.isArray(response.data)) {
          products = response.data;
        } else if (response.data && response.data.productos && Array.isArray(response.data.productos)) {
          products = response.data.productos;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          products = response.data.data;
        } else {
          console.warn('Estructura de respuesta inesperada para productos más vendidos:', response.data);
          products = [];
        }

        if (products.length > 0) {
          this.topProducts = products.map(product => ({
            ...product,
            image: this.resolveProductImage(product.image)
          }));
        } else {
          this.topProducts = [];
        }
        this.dashboardErrors.products = '';
      } catch (error) {
        console.error('Error cargando productos más vendidos:', error);
        this.dashboardErrors.products = 'Intenta actualizar para volver a consultar los productos vendidos.';
      }
    },

    async loadDashboardInsights() {
      try {
        const response = await api.get('/sales/dashboard-insights');
        const data = response.data || {};
        this.topSellers = Array.isArray(data.topSellers) ? data.topSellers : [];
        this.restockRecommendations = Array.isArray(data.restockRecommendations)
          ? data.restockRecommendations
          : [];
        this.historyMonths = Number(data.historyMonths) || 36;
        this.upcomingMonths = Array.isArray(data.upcomingMonths) ? data.upcomingMonths : [];
        this.dashboardErrors.insights = '';
      } catch (error) {
        console.error('Error cargando indicadores estacionales:', error);
        this.dashboardErrors.insights = 'Intenta actualizar para volver a consultar los indicadores.';
      }
    },

    getInitials(name = '') {
      return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'U';
    },

    getRoleDisplayName(role) {
      const roles = { admin: 'Administrador', supervisor: 'Supervisor', cajero: 'Cajero', almacenero: 'Almacenero' };
      return roles[role] || role || 'Usuario';
    },

    resolveProductImage(image) {
      if (!image) return this.defaultProductImg;
      const imagePath = String(image);
      if (imagePath.startsWith('/uploads/')) return `${import.meta.env.VITE_API_URL || ''}${imagePath}`;
      return imagePath;
    },

    async loadRecentActivities() {
      try {
        const response = await api.get('/actividades/recientes?limit=5');
        // Verificar la estructura de la respuesta
        let activities = [];
        
        if (response.data && Array.isArray(response.data)) {
          // Si la respuesta es un array directo
          activities = response.data;
        } else if (response.data && response.data.actividades && Array.isArray(response.data.actividades)) {
          // Si la respuesta tiene la estructura {actividades: Array}
          activities = response.data.actividades;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // Si la respuesta tiene la estructura {data: Array}
          activities = response.data.data;
        } else {
          console.warn('Estructura de respuesta inesperada para actividades recientes:', response.data);
          activities = [];
        }

        this.recentActivities = activities;
        this.dashboardErrors.activities = '';
      } catch (error) {
        console.error('Error cargando actividades recientes:', error);
        this.dashboardErrors.activities = 'Intenta actualizar para volver a consultar la actividad.';
      }
    },

    async refreshData() {
      await this.loadAllData();
    },

    formatCurrency(amount) {
      const value = Number(amount);
      return (Number.isFinite(value) ? value : 0).toFixed(2);
    },

    formatTimeAgo(dateString) {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
      const now = new Date();
      const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

      if (diffInSeconds < 60) {
        return 'Hace unos momentos';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `Hace ${days} día${days > 1 ? 's' : ''}`;
      }
    },

    getActivityIcon(tipo) {
      const icons = {
        'venta': 'fas fa-shopping-cart',
        'producto': 'fas fa-box',
        'usuario': 'fas fa-user',
        'login': 'fas fa-sign-in-alt',
        'logout': 'fas fa-sign-out-alt',
        'sistema': 'fas fa-cog',
        'inventario': 'fas fa-warehouse',
        'reporte': 'fas fa-chart-bar'
      };
      return icons[tipo] || 'fas fa-info-circle';
    },

    getActivityTypeName(tipo) {
      const types = {
        'venta': 'Venta',
        'producto': 'Producto',
        'usuario': 'Usuario',
        'login': 'Inicio',
        'logout': 'Cierre',
        'sistema': 'Sistema',
        'inventario': 'Inventario',
        'reporte': 'Reporte'
      };
      return types[tipo] || 'Actividad';
    },

    showNotification(message, type = 'success', icon = 'fas fa-check-circle') {
      clearTimeout(this.notificationTimer);
      this.notification = {
        show: true,
        message,
        type,
        icon
      };
      
      this.notificationTimer = setTimeout(() => {
        this.notification.show = false;
      }, 4000);
    },

    // Método mejorado para procesar ventas por día
    processVentasPorDia(data) {
      if (!data) {
        return [];
      }
      
      // Caso 1: Es directamente un array
      if (Array.isArray(data)) {
        return data;
      }
      
      // Caso 2: Tiene propiedad 'data' que es un array
      if (data.data && Array.isArray(data.data)) {
        return data.data;
      }
      
      // Caso 3: Tiene propiedad 'ventas' que es un array
      if (data.ventas && Array.isArray(data.ventas)) {
        return data.ventas;
      }
      
      // Caso 4: Buscar cualquier propiedad que sea un array
      const possibleKeys = ['results', 'items', 'sales', 'dailySales', 'ventasDiarias'];
      for (const key of possibleKeys) {
        if (data[key] && Array.isArray(data[key])) {
          return data[key];
        }
      }
      
      // Caso 5: Es un objeto con datos de un solo día
      if (typeof data === 'object' && data.fecha && data.total !== undefined) {
        return [data];
      }
      
      return [];
    },

  }
};
</script>

<style scoped>
.dashboard-page {
  padding: min(2.5rem, 4vw) min(1.5rem, 3vw) min(6rem, 8vw) min(1.5rem, 3vw);
  font-family: 'Inter', Arial, sans-serif;
  background: #f6f7fb;
  min-height: 100vh;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
  box-sizing: border-box;
}

/* Estilos personalizados para scrollbar en navegadores webkit */
.dashboard-page::-webkit-scrollbar {
  width: 8px;
}

.dashboard-page::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.dashboard-page::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.dashboard-page::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

/* Cabecera del Dashboard */
.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.dashboard-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  gap: 1.5rem;
  flex: 1;
}

.header-icon {
  background: rgba(255,255,255,0.2);
  width: 60px;
  height: 60px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.3);
}

.header-icon i {
  font-size: 1.8rem;
  color: white;
}

.header-text h1 {
  color: white;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-subtitle {
  color: rgba(255,255,255,0.9);
  font-size: 1.1rem;
  margin: 0 0 1.5rem 0;
}

.header-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  min-width: 100px;
}

.stat-number {
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.stat-label {
  color: rgba(255,255,255,0.8);
  font-size: 0.9rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

/* Indicador de tiempo real */
.real-time-indicator {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
  transition: all 0.3s ease;
}

.real-time-indicator.connected {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
}

.real-time-indicator.connecting {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.4);
}

.real-time-indicator.disconnected {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6b7280;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

.real-time-indicator.connected .status-dot {
  background: #10b981;
}

.real-time-indicator.connecting .status-dot {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.real-time-indicator.disconnected .status-dot {
  background: #ef4444;
  animation: none;
}

.status-info {
  flex: 1;
  min-width: 0;
}

.status-label {
  color: rgba(255,255,255,0.8);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.125rem;
}

.status-text {
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
}

.connection-type {
  font-size: 0.75rem;
  opacity: 0.8;
  font-weight: 400;
}

.last-update {
  color: rgba(255,255,255,0.7);
  font-size: 0.7rem;
  margin-top: 0.125rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.btn-refresh {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-refresh:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Contenido principal */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Secciones */
.charts-section,
.top-products-section,
.recent-activities-section {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #f1f5f9;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 1rem;
}

.section-header h2 {
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-header h2 i {
  color: #667eea;
  font-size: 1.3rem;
}

.section-link {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  text-decoration: none;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.section-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Gráficos */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.chart-card {
  background: #f8fafc;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h3 {
  color: #374151;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.chart-info i {
  color: #9ca3af;
  cursor: help;
}

.chart-wrapper {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Productos más vendidos */
.top-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.product-rank-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 1.5rem;
  border: 2px solid #f1f5f9;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.product-rank-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.rank-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  border: 3px solid #fbbf24;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #e5e7eb);
  border: 3px solid #9ca3af;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #d97706);
  border: 3px solid #b45309;
}

.rank-number {
  font-size: 1.2rem;
  position: relative;
  z-index: 2;
}

.rank-badge i {
  position: absolute;
  font-size: 0.8rem;
  top: 8px;
  color: rgba(255,255,255,0.8);
}

.product-info {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-top: 0.5rem;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
  border: 2px solid #e5e7eb;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-details {
  flex: 1;
}

.product-name {
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.product-category {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
}

.product-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 500;
}

.stat-value {
  color: #1f2937;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Actividades recientes */
.activities-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.activity-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateX(5px);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-description {
  color: #1f2937;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.activity-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.activity-type {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #e5e7eb;
  color: #374151;
}

.activity-type.type-venta {
  background: #dcfce7;
  color: #166534;
}

.activity-type.type-producto {
  background: #ddd6fe;
  color: #5b21b6;
}

.activity-type.type-usuario {
  background: #fef3c7;
  color: #92400e;
}

.activity-type.type-sistema {
  background: #e0f2fe;
  color: #0369a1;
}

/* Estados sin datos */
.no-data-msg {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.no-data-msg i {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
  color: #d1d5db;
}

.no-data-msg p {
  font-size: 1.1rem;
  margin: 0;
}

/* Loader */
.loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loader::after {
  content: '';
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Notificaciones */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

.notification.success {
  background: linear-gradient(135deg, #10b981, #059669);
}

.notification.info {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.notification.warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Decoración de fondo */
.dashboard-background-decor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

/* Media queries para responsividad */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .top-products-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 1rem 1rem 4rem 1rem;
  }
  
  .dashboard-header {
    padding: 1.5rem;
    border-radius: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-left {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-stats {
    gap: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }
  
  .real-time-indicator {
    min-width: auto;
    width: 100%;
    justify-content: center;
  }
  
  .charts-section,
  .top-products-section,
  .recent-activities-section {
    padding: 1.5rem;
    border-radius: 16px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .top-products-grid {
    grid-template-columns: 1fr;
  }
  
  .product-rank-card {
    padding: 1rem;
  }
  
  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .activity-meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}

/* Media queries para responsividad del scroll */
@media (min-width: 1024px) {
  .dashboard-page {
    padding: 2.5rem 1.5rem 6rem 1.5rem !important;
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 1rem 1rem 5rem 1rem !important;
  }
}

@media (max-width: 480px) {
  .dashboard-page {
    padding: 0.5rem 0.5rem 3.5rem 0.5rem !important;
  }
}

@media (max-width: 360px) {
  .dashboard-page {
    padding: 0.75rem 0.25rem 3rem 0.25rem !important;
  }
}

/* Detalles de errores técnicos */
.error-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #dc2626;
  margin-top: 1rem;
}

.error-details i {
  font-size: 1rem !important;
  color: #dc2626 !important;
  margin: 0 !important;
}

/* Dashboard real con la misma composición que la vista de demostración. */
.dashboard-page {
  min-height: calc(100vh - 110px);
  max-height: none;
  overflow: visible;
  padding: 0 !important;
  background: transparent !important;
  color: var(--app-ink, #172b3b);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.dashboard-page-heading { min-height: 62px; }
.dashboard-page .page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dashboard-page .eyebrow { margin: 0 0 5px; color: #148a83; font-size: .62rem; font-weight: 760; letter-spacing: .12em; }
.dashboard-page .page-heading h1 { margin: 0; color: var(--app-ink, #152b3a); font-size: 1.55rem; font-weight: 730; letter-spacing: -.05em; line-height: 1.2; }
.dashboard-page .page-heading p:not(.eyebrow) { margin: 6px 0 0; color: var(--app-muted, #778897); font-size: .76rem; }
.dashboard-heading-actions { display: flex; align-items: center; gap: 11px; }
.connection-pill { display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid var(--app-border, #e5ecee); border-radius: 999px; background: var(--app-surface, #fff); color: var(--app-muted, #738496); font-size: .66rem; font-weight: 650; white-space: nowrap; }
.connection-pill i { width: 7px; height: 7px; border-radius: 50%; background: #a8b6bd; }
.connection-pill.connected i { background: #3fc8a9; box-shadow: 0 0 0 3px rgba(63, 200, 169, .12); }
.connection-pill.connecting i { background: #e3a84c; }
.dashboard-page .primary-button { display: inline-flex; min-height: 39px; align-items: center; justify-content: center; gap: 8px; padding: 0 13px; border: 1px solid #078f89; border-radius: 9px; background: #078f89; color: #fff; font-size: .72rem; font-weight: 690; text-decoration: none; }
.dashboard-loading { display: flex; min-height: 260px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--app-muted, #738496); font-size: .76rem; }
.dashboard-page .dashboard-content { display: grid; gap: 17px; }
.dashboard-page .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.dashboard-page .metric-card { min-width: 0; padding: 15px 16px; border: 1px solid var(--app-border, #e5ecee); border-radius: 13px; background: var(--app-surface, #fff); box-shadow: 0 4px 14px rgba(22, 50, 67, .025); }
.dashboard-page .metric-top { display: flex; align-items: center; justify-content: space-between; color: var(--app-muted, #718291); font-size: .69rem; }
.dashboard-page .metric-icon { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 9px; font-size: .75rem; }
.dashboard-page .metric-icon.teal { background: #e8f6f3; color: #128e84; }
.dashboard-page .metric-icon.blue { background: #edf3fc; color: #5a7fbd; }
.dashboard-page .metric-icon.violet { background: #f3effb; color: #8464b6; }
.dashboard-page .metric-icon.amber { background: #fff5e8; color: #ce9140; }
.dashboard-page .metric-card > strong { display: block; margin-top: 8px; color: var(--app-ink, #172e3d); font-size: 1.37rem; font-weight: 730; letter-spacing: -.045em; }
.dashboard-page .metric-foot { display: block; margin-top: 8px; color: var(--app-muted, #8896a2); font-size: .67rem; }
.dashboard-page .dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(250px, .9fr); gap: 14px; }
.dashboard-page .demo-panel { min-width: 0; padding: 17px; border: 1px solid var(--app-border, #e5ecee); border-radius: 14px; background: var(--app-surface, #fff); box-shadow: 0 5px 17px rgba(22, 50, 67, .025); }
.dashboard-page .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dashboard-page .panel-heading h2 { margin: 0; color: var(--app-ink, #1a3040); font-size: .84rem; font-weight: 710; letter-spacing: -.02em; }
.dashboard-page .panel-heading p { margin: 3px 0 0; color: var(--app-muted, #8795a0); font-size: .68rem; }
.dashboard-page .soft-select { display: flex; align-items: center; gap: 8px; min-height: 31px; padding: 0 9px; border: 1px solid var(--app-border, #e5ecee); border-radius: 8px; background: var(--app-surface, #fff); color: var(--app-muted, #687b89); font-size: .65rem; }
.dashboard-page .real-chart-wrap { height: 228px; margin-top: 12px; }
.dashboard-page .real-chart-wrap canvas { max-height: 100%; }
.dashboard-empty { display: flex; min-height: 210px; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 18px; border: 1px dashed var(--app-border, #e5ecee); border-radius: 11px; background: var(--app-surface-soft, #f7f9fa); color: var(--app-muted, #8795a0); text-align: center; }
.dashboard-empty > i { margin-bottom: 4px; color: #8fb8b4; font-size: 1.2rem; }
.dashboard-empty strong { color: var(--app-ink, #435866); font-size: .75rem; }
.dashboard-empty span { max-width: 360px; font-size: .67rem; }
.dashboard-empty.compact { min-height: 128px; }
.dashboard-page .seller-feature { display: flex; align-items: center; gap: 10px; margin-top: 21px; }
.dashboard-page .seller-crown { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 8px; background: #fff4df; color: #d29432; font-size: .7rem; }
.dashboard-page .seller-photo { display: grid; width: 39px; height: 39px; flex: 0 0 39px; place-items: center; border: 1px solid #d9ebe7; border-radius: 50%; background: #eaf6f3; color: #167c75; font-size: .7rem; font-weight: 750; }
.dashboard-page .seller-person { display: grid; gap: 3px; }
.dashboard-page .seller-person strong { color: var(--app-ink, #304654); font-size: .75rem; }
.dashboard-page .seller-person span { color: var(--app-muted, #8b99a2); font-size: .64rem; }
.dashboard-page .seller-total { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-top: 19px; padding-bottom: 14px; border-bottom: 1px solid var(--app-border, #edf0f0); }
.dashboard-page .seller-total strong { color: var(--app-ink, #193b48); font-size: 1.3rem; letter-spacing: -.04em; }
.dashboard-page .seller-total span { color: #168d78; font-size: .66rem; font-weight: 650; }
.dashboard-page .seller-secondary-list { display: grid; gap: 0; }
.dashboard-page .seller-secondary-list > div { display: flex; min-height: 35px; align-items: center; gap: 8px; border-bottom: 1px solid var(--app-border, #eff2f3); }
.dashboard-page .seller-secondary-list > div > span { color: #9aa8af; font-size: .62rem; }
.dashboard-page .seller-secondary-list strong { flex: 1; color: var(--app-ink, #4d626e); font-size: .66rem; }
.dashboard-page .seller-secondary-list b { color: var(--app-ink, #526b77); font-size: .65rem; }
.dashboard-page .dashboard-list-panel { padding: 17px; }
.dashboard-page .text-button { display: inline-flex; align-items: center; gap: 7px; padding: 6px 8px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: #177c79; font-size: .66rem; font-weight: 680; text-decoration: none; }
.dashboard-page .best-sellers { margin-top: 10px; }
.dashboard-page .best-seller-row { display: grid; min-height: 58px; grid-template-columns: 26px 37px minmax(130px, 1fr) 78px minmax(80px, .55fr) 90px; align-items: center; gap: 10px; border-top: 1px solid var(--app-border, #eff2f3); }
.dashboard-page .rank-pill { color: #91a0a7; font-size: .66rem; font-weight: 700; }
.dashboard-page .product-thumb { display: grid; width: 36px; height: 36px; overflow: hidden; place-items: center; border: 1px solid var(--app-border, #e9eeee); border-radius: 9px; background: var(--app-surface-soft, #f5f8f8); }
.dashboard-page .product-thumb img { width: 100%; height: 100%; object-fit: cover; }
.dashboard-page .best-product-name { display: grid; gap: 3px; min-width: 0; }
.dashboard-page .best-product-name strong { overflow: hidden; color: var(--app-ink, #344c59); font-size: .69rem; text-overflow: ellipsis; white-space: nowrap; }
.dashboard-page .best-product-name small { color: var(--app-muted, #91a0a7); font-size: .61rem; }
.dashboard-page .sold-count { color: #3b5966; font-size: .69rem; font-weight: 700; text-align: right; }
.dashboard-page .sold-count small { color: var(--app-muted, #8b99a2); font-size: .6rem; font-weight: 500; }
.dashboard-page .sold-bar { height: 5px; overflow: hidden; border-radius: 99px; background: #edf2f2; }
.dashboard-page .sold-bar i { display: block; height: 100%; border-radius: inherit; background: #36aa9c; }
.dashboard-page .sold-income { color: #59717c; font-size: .67rem; text-align: right; }
.dashboard-page .heading-accent { color: #138f86; }
.dashboard-page .forecast-badge { padding: 5px 9px; border: 1px solid #dcece8; border-radius: 7px; background: #eff8f5; color: #25877d; font-size: .62rem; font-weight: 680; }
.dashboard-page .restock-list { display: grid; gap: 8px; margin-top: 13px; }
.dashboard-page .restock-row { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--app-border, #edf0f0); border-radius: 11px; background: var(--app-surface-soft, #fbfcfc); }
.dashboard-page .restock-row .product-thumb { flex: 0 0 36px; }
.dashboard-page .restock-name { display: grid; flex: 1; gap: 4px; min-width: 120px; }
.dashboard-page .restock-name strong { color: var(--app-ink, #304754); font-size: .72rem; }
.dashboard-page .restock-name small { color: var(--app-muted, #84939e); font-size: .63rem; }
.dashboard-page .stock-current,.dashboard-page .stock-demand,.dashboard-page .buy-suggest { display: grid; gap: 3px; min-width: 72px; }
.dashboard-page .stock-current small,.dashboard-page .stock-demand small,.dashboard-page .buy-suggest small { color: var(--app-muted, #8796a1); font-size: .6rem; }
.dashboard-page .stock-current b,.dashboard-page .stock-demand b { color: var(--app-ink, #3b5360); font-size: .69rem; }
.dashboard-page .buy-suggest { padding-left: 12px; border-left: 1px solid var(--app-border, #e6eceb); }
.dashboard-page .buy-suggest b { color: #138679; font-size: .7rem; }
.dashboard-page .icon-button { display: grid; width: 29px; height: 29px; flex: 0 0 29px; place-items: center; border: 1px solid var(--app-border, #e5edeb); border-radius: 8px; background: var(--app-surface, #fff); color: #59727c; font-size: .67rem; text-decoration: none; }
.dashboard-page .restock-footnote { display: flex; align-items: center; gap: 7px; margin: 10px 2px 0; color: var(--app-muted, #92a0a8); font-size: .61rem; }
.dashboard-page .activity-list { margin-top: 9px; }
.dashboard-page .activity-row { display: flex; align-items: center; gap: 10px; min-height: 51px; border-top: 1px solid var(--app-border, #eff2f3); }
.dashboard-page .activity-mark { display: grid; width: 29px; height: 29px; flex: 0 0 29px; place-items: center; border-radius: 9px; background: #e8f6f2; color: #168a7f; font-size: .68rem; }
.dashboard-page .activity-copy { display: grid; flex: 1; gap: 3px; min-width: 0; }
.dashboard-page .activity-copy strong { overflow: hidden; color: var(--app-ink, #3a515f); font-size: .67rem; font-weight: 640; text-overflow: ellipsis; white-space: nowrap; }
.dashboard-page .activity-copy small { color: var(--app-muted, #8d9aa3); font-size: .61rem; }
.dashboard-page .activity-amount { color: #637984; font-size: .66rem; font-weight: 650; white-space: nowrap; }

@media (max-width: 1120px) {
  .dashboard-page .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-page .dashboard-grid { grid-template-columns: minmax(0, 1.6fr) minmax(220px, .9fr); }
  .dashboard-page .best-seller-row { grid-template-columns: 23px 36px minmax(110px, 1fr) 60px 80px; }
  .dashboard-page .sold-bar { display: none; }
}

@media (max-width: 760px) {
  .dashboard-page .page-heading { align-items: flex-start; }
  .dashboard-page .dashboard-grid { grid-template-columns: minmax(0, 1fr); }
  .dashboard-heading-actions { align-items: flex-end; flex-direction: column; }
  .dashboard-page .best-seller-row { grid-template-columns: 20px 34px minmax(100px, 1fr) 65px; gap: 7px; }
  .dashboard-page .sold-income { display: none; }
  .dashboard-page .restock-row { flex-wrap: wrap; }
  .dashboard-page .restock-name { flex-basis: calc(100% - 60px); }
  .dashboard-page .stock-current,.dashboard-page .stock-demand,.dashboard-page .buy-suggest { flex: 1; }
}

@media (max-width: 480px) {
  .dashboard-page .page-heading { align-items: stretch; flex-direction: column; }
  .dashboard-heading-actions { align-items: stretch; flex-direction: row; justify-content: space-between; }
  .connection-pill { padding: 6px 8px; font-size: .58rem; }
  .dashboard-page .metric-grid { gap: 8px; }
  .dashboard-page .metric-card { padding: 12px; }
  .dashboard-page .metric-card > strong { font-size: 1.15rem; }
  .dashboard-page .dashboard-grid { grid-template-columns: minmax(0, 1fr); }
  .dashboard-page .best-seller-row { grid-template-columns: 18px 31px minmax(85px, 1fr) 55px; gap: 6px; }
  .dashboard-page .product-thumb { width: 31px; height: 31px; }
  .dashboard-page .best-product-name strong { font-size: .63rem; }
  .dashboard-page .sold-count { font-size: .64rem; }
  .dashboard-page .sold-count small { display: block; }
  .dashboard-page .demo-panel { padding: 12px; }
  .dashboard-page .panel-heading h2 { font-size: .79rem; }
}
</style>
