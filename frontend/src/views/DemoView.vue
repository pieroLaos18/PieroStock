<template>
  <div class="demo-shell">
    <aside class="demo-sidebar">
      <router-link v-if="!standalone" to="/login" class="demo-brand">
        <span class="demo-brand-mark"><i class="fas fa-cube"></i></span>
        <span
          ><strong>ERP ligero</strong><small>Ventas e inventario</small></span
        >
      </router-link>
      <div v-else class="demo-brand" aria-label="ERP ligero, demo pública">
        <span class="demo-brand-mark"><i class="fas fa-cube"></i></span>
        <span
          ><strong>ERP ligero</strong><small>Ventas e inventario</small></span
        >
      </div>

      <div class="demo-workspace">
        <span class="workspace-dot"></span><span>Mi negocio</span
        ><i class="fas fa-chevron-down"></i>
      </div>
      <p class="demo-nav-label">MENÚ PRINCIPAL</p>
      <nav class="demo-nav" aria-label="Secciones de demostración">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          :class="{ active: activeSection === item.id }"
          @click="activeSection = item.id"
        >
          <i :class="item.icon"></i><span>{{ item.label }}</span>
          <span
            v-if="item.id === 'products' && lowStockCount"
            class="nav-count"
            >{{ lowStockCount }}</span
          >
        </button>
      </nav>

      <div class="sidebar-bottom">
        <div class="demo-user-avatar">PA</div>
        <div class="demo-user-info">
          <strong>Piero Alexander</strong><span>Administrador</span>
        </div>
        <i class="fas fa-ellipsis-h"></i>
      </div>
    </aside>

    <main class="demo-main">
      <header class="demo-topbar">
        <div class="breadcrumb">
          <span>Mi negocio</span><i class="fas fa-chevron-right"></i
          ><strong>{{ currentTitle }}</strong>
        </div>
        <div class="topbar-right">
          <span class="demo-status"><i></i> Demo interactiva</span
          ><button
            v-if="!standalone"
            type="button"
            class="demo-theme-button"
            :aria-label="
              $root.theme === 'dark'
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro'
            "
            :title="
              $root.theme === 'dark'
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro'
            "
            @click="$root.toggleTheme()"
          >
            <i
              :class="$root.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'"
              aria-hidden="true"
            ></i></button
          ><router-link v-if="!standalone" to="/login" class="real-login-link"
            >Iniciar sesión <i class="fas fa-arrow-up-right-from-square"></i
          ></router-link>
        </div>
      </header>

      <div class="demo-notice">
        <i class="fas fa-circle-info"></i
        ><span
          >Estás explorando datos ficticios. Las acciones de esta demo no
          afectan ninguna cuenta ni base de datos.</span
        ><button type="button" @click="resetDemo">
          <i class="fas fa-rotate-left"></i> Reiniciar demo
        </button>
      </div>

      <div class="demo-content">
        <template v-if="activeSection === 'dashboard'">
          <div class="page-heading">
            <div>
              <p class="eyebrow">MIÉRCOLES, 29 DE OCTUBRE</p>
              <h1>Resumen del negocio</h1>
              <p>Así marcha tu tienda. Aquí tienes lo importante de hoy.</p>
            </div>
            <button class="primary-button" @click="openSale">
              <i class="fas fa-plus"></i> Registrar venta
            </button>
          </div>

          <section class="metric-grid">
            <article class="metric-card">
              <div class="metric-top">
                <span>Ventas del mes</span
                ><span class="metric-icon teal"
                  ><i class="fas fa-wallet"></i
                ></span>
              </div>
              <strong>S/ {{ money(monthSales) }}</strong
              ><small class="trend up"
                ><i class="fas fa-arrow-trend-up"></i> 12.8%
                <span>vs. mes anterior</span></small
              >
            </article>
            <article class="metric-card">
              <div class="metric-top">
                <span>Transacciones</span
                ><span class="metric-icon blue"
                  ><i class="fas fa-receipt"></i
                ></span>
              </div>
              <strong>{{ salesCount }}</strong
              ><small class="metric-foot"
                >{{ salesToday }} registradas hoy</small
              >
            </article>
            <article class="metric-card">
              <div class="metric-top">
                <span>Productos activos</span
                ><span class="metric-icon violet"
                  ><i class="fas fa-box"></i
                ></span>
              </div>
              <strong>{{ products.length }}</strong
              ><small class="metric-foot"
                >{{ lowStockCount }} requieren revisión de stock</small
              >
            </article>
            <article class="metric-card">
              <div class="metric-top">
                <span>Ticket promedio</span
                ><span class="metric-icon amber"
                  ><i class="fas fa-chart-simple"></i
                ></span>
              </div>
              <strong>S/ {{ money(averageTicket) }}</strong
              ><small class="metric-foot">En el periodo seleccionado</small>
            </article>
          </section>

          <section class="dashboard-grid">
            <article class="demo-panel chart-panel">
              <div class="panel-heading">
                <div>
                  <h2>Ventas de la semana</h2>
                  <p>Ingresos diarios · soles</p>
                </div>
                <button class="soft-select" type="button">
                  Últimos 7 días <i class="fas fa-chevron-down"></i>
                </button>
              </div>
              <div class="chart-legend">
                <span><i></i> Ventas</span><b>S/ 4,860.00</b
                ><small>Esta semana</small>
              </div>
              <div class="bar-chart">
                <div
                  v-for="day in weekSales"
                  :key="day.label"
                  class="bar-column"
                >
                  <div class="bar-value">
                    {{ day.value ? `S/ ${day.value}` : "" }}
                  </div>
                  <div class="bar-track">
                    <span
                      :style="{
                        height: `${Math.max(4, (day.value / weekMax) * 100)}%`,
                      }"
                      :class="{ today: day.today }"
                    ></span>
                  </div>
                  <small>{{ day.label }}</small>
                </div>
              </div>
            </article>

            <article class="demo-panel seller-highlight">
              <div class="panel-heading">
                <div>
                  <h2>Mejor vendedor</h2>
                  <p>Por monto vendido este mes</p>
                </div>
                <i class="fas fa-ellipsis"></i>
              </div>
              <div class="seller-feature">
                <span class="seller-crown"><i class="fas fa-crown"></i></span>
                <div class="seller-photo">MC</div>
                <div>
                  <strong>María Cárdenas</strong><span>Asesora de ventas</span>
                </div>
              </div>
              <div class="seller-total">
                <strong>S/ 8,420.50</strong
                ><span><i class="fas fa-arrow-trend-up"></i> 18% este mes</span>
              </div>
              <div class="seller-progress">
                <div><span>Meta mensual</span><b>84%</b></div>
                <span class="progress-track"><i></i></span>
              </div>
            </article>
          </section>

          <section class="demo-panel">
            <div class="panel-heading">
              <div>
                <h2>Productos más vendidos</h2>
                <p>Los favoritos de tus clientes</p>
              </div>
              <button class="text-button" @click="activeSection = 'products'">
                Ver inventario <i class="fas fa-arrow-right"></i>
              </button>
            </div>
            <div class="best-sellers">
              <article
                v-for="(product, index) in bestProducts"
                :key="product.id"
                class="best-seller-row"
              >
                <span class="rank-pill">0{{ index + 1 }}</span
                ><span class="product-thumb" :class="product.color"
                  ><i :class="product.icon"></i></span
                ><span class="best-product-name"
                  ><strong>{{ product.name }}</strong
                  ><small>{{ product.category }}</small></span
                ><span class="sold-count"
                  >{{ product.sold }} <small>vendidos</small></span
                >
                <div class="sold-bar">
                  <i
                    :style="{
                      width: `${(product.sold / bestProducts[0].sold) * 100}%`,
                    }"
                  ></i>
                </div>
                <strong class="sold-income"
                  >S/ {{ money(product.sold * product.price) }}</strong
                >
              </article>
            </div>
          </section>

          <section class="demo-panel restock-panel">
            <div class="panel-heading">
              <div>
                <h2>
                  <i class="fas fa-wand-magic-sparkles heading-accent"></i>
                  Reposición sugerida
                </h2>
                <p>
                  Demanda estimada para la próxima temporada según el historial
                </p>
              </div>
              <span class="forecast-badge">Patrón estacional</span>
            </div>
            <div class="restock-row">
              <span class="product-thumb coral"
                ><i class="fas fa-sun"></i
              ></span>
              <div class="restock-name">
                <strong>Protector solar SPF 50</strong
                ><small>Mayor demanda en verano · pico en enero</small>
              </div>
              <span class="stock-current"><small>Stock</small><b>8 un.</b></span
              ><span class="stock-demand"
                ><small>Media histórica</small><b>32 un.</b></span
              ><span class="buy-suggest"
                ><small>Reponer</small><b>24 un.</b></span
              ><button
                class="icon-button"
                title="Ver producto"
                @click="activeSection = 'products'"
              >
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
            <div class="restock-footnote">
              <i class="fas fa-circle-info"></i> Las sugerencias se basan en
              ventas de meses equivalentes; el historial de ejemplo es ficticio.
            </div>
          </section>

          <section class="demo-panel recent-panel">
            <div class="panel-heading">
              <div>
                <h2>Actividad reciente</h2>
                <p>Los últimos movimientos del negocio</p>
              </div>
              <button class="text-button" @click="activeSection = 'activity'">
                Ver actividad <i class="fas fa-arrow-right"></i>
              </button>
            </div>
            <div class="activity-list">
              <article
                v-for="activity in activities.slice(0, 4)"
                :key="activity.id"
                class="activity-row"
              >
                <span class="activity-mark" :class="activity.tone"
                  ><i :class="activity.icon"></i></span
                ><span class="activity-copy"
                  ><strong>{{ activity.title }}</strong
                  ><small
                    >{{ activity.user }} · {{ activity.time }}</small
                  ></span
                ><span class="activity-amount">{{ activity.amount }}</span>
              </article>
            </div>
          </section>
        </template>

        <template v-else-if="activeSection === 'products'">
          <div class="page-heading">
            <div>
              <p class="eyebrow">INVENTARIO</p>
              <h1>Productos</h1>
              <p>Administra tu catálogo, existencias y entradas por lote.</p>
            </div>
            <button class="primary-button" @click="showProductForm = true">
              <i class="fas fa-plus"></i> Nuevo producto
            </button>
          </div>
          <section class="metric-grid compact-metrics">
            <article class="metric-card">
              <span>Productos</span><strong>{{ products.length }}</strong
              ><small class="metric-foot">En el catálogo</small>
            </article>
            <article class="metric-card">
              <span>Valor del inventario</span
              ><strong
                >S/
                {{
                  money(products.reduce((sum, p) => sum + p.stock * p.price, 0))
                }}</strong
              ><small class="metric-foot">A precio de venta</small>
            </article>
            <article class="metric-card">
              <span>Stock bajo</span><strong>{{ lowStockCount }}</strong
              ><small class="metric-foot">Debajo del mínimo definido</small>
            </article>
          </section>
          <section class="demo-panel table-panel">
            <div class="table-toolbar">
              <div class="search-box">
                <i class="fas fa-search"></i
                ><input
                  v-model="productSearch"
                  placeholder="Buscar por nombre o categoría"
                />
              </div>
              <select v-model="stockFilter">
                <option value="all">Todos los productos</option>
                <option value="low">Stock bajo</option>
              </select>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock disponible</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="product in filteredProducts" :key="product.id">
                    <td>
                      <div class="table-product">
                        <span class="product-thumb" :class="product.color"
                          ><i :class="product.icon"></i></span
                        ><span
                          ><b>{{ product.name }}</b
                          ><small
                            >SKU-{{
                              String(product.id).padStart(4, "0")
                            }}</small
                          ></span
                        >
                      </div>
                    </td>
                    <td>{{ product.category }}</td>
                    <td>S/ {{ money(product.price) }}</td>
                    <td>
                      <b>{{ product.stock }}</b>
                      <small>{{ product.unit }}</small>
                    </td>
                    <td>
                      <span
                        class="status-pill"
                        :class="
                          product.stock <= product.minimum
                            ? 'warning'
                            : 'healthy'
                        "
                        ><i></i
                        >{{
                          product.stock <= product.minimum
                            ? "Reponer pronto"
                            : "Disponible"
                        }}</span
                      >
                    </td>
                    <td>
                      <button
                        class="small-action"
                        @click="openReceipt(product)"
                      >
                        <i class="fas fa-truck-fast"></i> Registrar entrada
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!filteredProducts.length">
                    <td colspan="6" class="table-empty">
                      No hay productos con esos filtros.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <template v-else-if="activeSection === 'sales'">
          <div class="page-heading">
            <div>
              <p class="eyebrow">MOVIMIENTOS</p>
              <h1>Ventas</h1>
              <p>
                Consulta las transacciones del equipo o registra una nueva
                venta.
              </p>
            </div>
            <button class="primary-button" @click="openSale">
              <i class="fas fa-plus"></i> Registrar venta
            </button>
          </div>
          <section class="metric-grid compact-metrics">
            <article class="metric-card">
              <span>Ventas del mes</span
              ><strong>S/ {{ money(monthSales) }}</strong
              ><small class="trend up"
                >+12.8% <span>vs. mes anterior</span></small
              >
            </article>
            <article class="metric-card">
              <span>Transacciones</span><strong>{{ salesCount }}</strong
              ><small class="metric-foot"
                >Incluye tus cambios de esta sesión</small
              >
            </article>
            <article class="metric-card">
              <span>Ticket promedio</span
              ><strong>S/ {{ money(averageTicket) }}</strong
              ><small class="metric-foot">En el periodo seleccionado</small>
            </article>
          </section>
          <section class="demo-panel table-panel">
            <div class="table-toolbar">
              <h2>Transacciones recientes</h2>
              <select>
                <option>Este mes</option>
                <option>Esta semana</option>
              </select>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>N.º de venta</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Fecha</th>
                    <th>Método de pago</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sale in sales" :key="sale.id">
                    <td>
                      <b class="sale-id">{{ sale.id }}</b>
                    </td>
                    <td>{{ sale.client }}</td>
                    <td>{{ sale.seller }}</td>
                    <td>{{ sale.date }}</td>
                    <td>
                      <span class="payment-type"
                        ><i
                          :class="
                            sale.method === 'Tarjeta'
                              ? 'fas fa-credit-card'
                              : 'fas fa-money-bill-wave'
                          "
                        ></i
                        >{{ sale.method }}</span
                      >
                    </td>
                    <td>
                      <b>S/ {{ money(sale.total) }}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <template v-else-if="activeSection === 'reports'">
          <div class="page-heading">
            <div>
              <p class="eyebrow">ANÁLISIS</p>
              <h1>Reportes</h1>
              <p>
                Una vista clara de ingresos, productos y actividad comercial.
              </p>
            </div>
            <button
              class="secondary-button"
              @click="showToast('Reporte de demostración listo para exportar')"
            >
              <i class="fas fa-download"></i> Exportar reporte
            </button>
          </div>
          <section class="metric-grid">
            <article class="metric-card">
              <span>Ingresos brutos</span
              ><strong>S/ {{ money(monthSales) }}</strong
              ><small class="trend up"
                >+12.8% <span>vs. mes anterior</span></small
              >
            </article>
            <article class="metric-card">
              <span>Unidades vendidas</span
              ><strong>{{
                bestProducts.reduce((sum, p) => sum + p.sold, 0)
              }}</strong
              ><small class="metric-foot">Top productos del periodo</small>
            </article>
            <article class="metric-card">
              <span>Mejor vendedor</span
              ><strong class="name-metric">María Cárdenas</strong
              ><small class="metric-foot">S/ 8,420.50 en ventas</small>
            </article>
          </section>
          <section class="demo-panel report-panel">
            <div class="panel-heading">
              <div>
                <h2>Ingresos por semana</h2>
                <p>Comparativo de las últimas cuatro semanas</p>
              </div>
              <span class="forecast-badge">Octubre 2026</span>
            </div>
            <div class="report-bars">
              <div
                v-for="(week, index) in reportWeeks"
                :key="week.label"
                class="report-week"
              >
                <div class="week-bar-group">
                  <span
                    :style="{ height: `${(week.current / reportMax) * 100}%` }"
                  ></span
                  ><span
                    :style="{ height: `${(week.previous / reportMax) * 100}%` }"
                  ></span>
                </div>
                <b>{{ week.label }}</b
                ><small>S/ {{ money(week.current) }}</small>
              </div>
            </div>
            <div class="chart-key">
              <span><i class="current-key"></i> Este mes</span
              ><span><i class="previous-key"></i> Mes anterior</span>
            </div>
          </section>
          <p class="demo-disclaimer">
            Esta vista contiene datos de ejemplo. En el sistema conectado, los
            reportes se calculan a partir de ventas reales.
          </p>
        </template>

        <template v-else-if="activeSection === 'users'">
          <div class="page-heading">
            <div>
              <p class="eyebrow">EQUIPO</p>
              <h1>Usuarios</h1>
              <p>Personas y roles que colaboran en tu negocio.</p>
            </div>
            <button
              class="primary-button"
              @click="
                showToast(
                  'En la aplicación completa puedes invitar usuarios desde esta sección',
                )
              "
            >
              <i class="fas fa-user-plus"></i> Invitar usuario
            </button>
          </div>
          <section class="demo-panel table-panel">
            <div class="table-toolbar">
              <h2>
                Equipo de trabajo
                <span class="count-chip">{{ demoUsers.length }} usuarios</span>
              </h2>
              <span class="demo-status"><i></i> 3 en línea</span>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Ventas del mes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in demoUsers" :key="user.name">
                    <td>
                      <div class="table-product">
                        <span class="demo-user-avatar" :class="user.color">{{
                          user.initials
                        }}</span
                        ><span
                          ><b>{{ user.name }}</b
                          ><small>{{ user.email }}</small></span
                        >
                      </div>
                    </td>
                    <td>
                      <span class="role-chip">{{ user.role }}</span>
                    </td>
                    <td>{{ user.sales }}</td>
                    <td>
                      <span class="status-pill healthy"><i></i>Activo</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <template v-else>
          <div class="page-heading">
            <div>
              <p class="eyebrow">TRAZABILIDAD</p>
              <h1>Actividad</h1>
              <p>Acciones del equipo registradas cronológicamente.</p>
            </div>
            <button
              class="secondary-button"
              @click="
                showToast('La actividad de demostración está actualizada')
              "
            >
              <i class="fas fa-rotate"></i> Actualizar
            </button>
          </div>
          <section class="demo-panel activity-page-panel">
            <article
              v-for="activity in activities"
              :key="activity.id"
              class="activity-row"
            >
              <span class="activity-mark" :class="activity.tone"
                ><i :class="activity.icon"></i></span
              ><span class="activity-copy"
                ><strong>{{ activity.title }}</strong
                ><small>{{ activity.user }} · {{ activity.time }}</small></span
              ><span class="activity-amount">{{ activity.amount }}</span>
            </article>
          </section>
        </template>
      </div>
    </main>

    <div
      v-if="activeModal"
      class="demo-modal-backdrop"
      @click.self="activeModal = ''"
    >
      <form
        v-if="activeModal === 'sale'"
        class="demo-modal"
        @submit.prevent="registerSale"
      >
        <header>
          <span class="modal-icon"><i class="fas fa-receipt"></i></span>
          <div>
            <h2>Nueva venta de demostración</h2>
            <p>Los cambios solo duran en esta sesión.</p>
          </div>
          <button
            type="button"
            class="modal-close"
            aria-label="Cerrar"
            @click="activeModal = ''"
          >
            <i class="fas fa-times"></i>
          </button>
        </header>
        <label
          >Cliente<input
            v-model.trim="saleForm.client"
            placeholder="Nombre del cliente"
            required
        /></label>
        <div class="modal-form-row">
          <label
            >Producto<select v-model.number="saleForm.productId">
              <option
                v-for="product in products"
                :key="product.id"
                :value="product.id"
              >
                {{ product.name }} · S/ {{ money(product.price) }}
              </option>
            </select></label
          ><label
            >Cantidad<input
              v-model.number="saleForm.quantity"
              type="number"
              min="1"
              required
          /></label>
        </div>
        <label
          >Método de pago<select v-model="saleForm.method">
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Yape / Plin</option>
          </select></label
        >
        <div class="modal-total">
          <span>Total de la venta</span
          ><strong>S/ {{ money(selectedSaleTotal) }}</strong>
        </div>
        <footer>
          <button
            type="button"
            class="secondary-button"
            @click="activeModal = ''"
          >
            Cancelar</button
          ><button type="submit" class="primary-button">
            <i class="fas fa-check"></i> Confirmar venta
          </button>
        </footer>
      </form>
      <form
        v-else-if="activeModal === 'receipt'"
        class="demo-modal"
        @submit.prevent="registerReceipt"
      >
        <header>
          <span class="modal-icon"><i class="fas fa-truck-fast"></i></span>
          <div>
            <h2>Registrar entrada</h2>
            <p>
              {{ selectedProduct?.name }} · el lote nuevo queda al final del
              FIFO
            </p>
          </div>
          <button
            type="button"
            class="modal-close"
            aria-label="Cerrar"
            @click="activeModal = ''"
          >
            <i class="fas fa-times"></i>
          </button>
        </header>
        <div class="batch-callout">
          <i class="fas fa-layer-group"></i
          ><span
            >Las ventas consumirán primero las unidades del lote más
            antiguo.</span
          >
        </div>
        <label
          >Código del lote<input
            v-model.trim="receiptForm.code"
            placeholder="Ej. LOTE-2026-015"
            required
        /></label>
        <div class="modal-form-row">
          <label
            >Cantidad recibida<input
              v-model.number="receiptForm.quantity"
              type="number"
              min="1"
              required /></label
          ><label
            >Proveedor<input
              v-model.trim="receiptForm.supplier"
              placeholder="Proveedor"
          /></label>
        </div>
        <footer>
          <button
            type="button"
            class="secondary-button"
            @click="activeModal = ''"
          >
            Cancelar</button
          ><button type="submit" class="primary-button">
            <i class="fas fa-check"></i> Registrar entrada
          </button>
        </footer>
      </form>
      <form v-else class="demo-modal" @submit.prevent="registerProduct">
        <header>
          <span class="modal-icon"><i class="fas fa-box"></i></span>
          <div>
            <h2>Nuevo producto</h2>
            <p>Añádelo al catálogo de prueba.</p>
          </div>
          <button
            type="button"
            class="modal-close"
            aria-label="Cerrar"
            @click="activeModal = ''"
          >
            <i class="fas fa-times"></i>
          </button>
        </header>
        <label
          >Nombre<input
            v-model.trim="productForm.name"
            placeholder="Ej. Mochila urbana"
            required
        /></label>
        <div class="modal-form-row">
          <label
            >Categoría<input
              v-model.trim="productForm.category"
              placeholder="Accesorios"
              required /></label
          ><label
            >Precio de venta<input
              v-model.number="productForm.price"
              type="number"
              min="0.01"
              step="0.01"
              required
          /></label>
        </div>
        <div class="modal-form-row">
          <label
            >Stock inicial<input
              v-model.number="productForm.stock"
              type="number"
              min="0"
              required /></label
          ><label
            >Stock mínimo<input
              v-model.number="productForm.minimum"
              type="number"
              min="0"
              required
          /></label>
        </div>
        <footer>
          <button
            type="button"
            class="secondary-button"
            @click="activeModal = ''"
          >
            Cancelar</button
          ><button type="submit" class="primary-button">
            <i class="fas fa-check"></i> Crear producto
          </button>
        </footer>
      </form>
    </div>

    <transition name="demo-toast"
      ><div v-if="toast" class="demo-toast">
        <i class="fas fa-circle-check"></i>{{ toast }}
      </div></transition
    >
  </div>
</template>

<script>
const makeProducts = () => [
  {
    id: 1,
    name: "Café de altura 500 g",
    category: "Abarrotes",
    price: 28.5,
    stock: 42,
    minimum: 12,
    unit: "un.",
    color: "coffee",
    icon: "fas fa-mug-hot",
    sold: 86,
  },
  {
    id: 2,
    name: "Aceite de oliva 1 L",
    category: "Abarrotes",
    price: 39.9,
    stock: 18,
    minimum: 10,
    unit: "un.",
    color: "olive",
    icon: "fas fa-bottle-droplet",
    sold: 63,
  },
  {
    id: 3,
    name: "Taza cerámica artesanal",
    category: "Hogar",
    price: 32,
    stock: 7,
    minimum: 8,
    unit: "un.",
    color: "coral",
    icon: "fas fa-mug-saucer",
    sold: 48,
  },
  {
    id: 4,
    name: "Miel de abeja 350 g",
    category: "Abarrotes",
    price: 24,
    stock: 26,
    minimum: 10,
    unit: "un.",
    color: "amber",
    icon: "fas fa-jar",
    sold: 41,
  },
  {
    id: 5,
    name: "Cuaderno kraft A5",
    category: "Papelería",
    price: 16.5,
    stock: 5,
    minimum: 10,
    unit: "un.",
    color: "blue",
    icon: "fas fa-book",
    sold: 32,
  },
  {
    id: 6,
    name: "Protector solar SPF 50",
    category: "Cuidado personal",
    price: 48,
    stock: 8,
    minimum: 10,
    unit: "un.",
    color: "violet",
    icon: "fas fa-sun",
    sold: 29,
  },
];
const makeSales = () => [
  {
    id: "V-1048",
    client: "Lucía Fernández",
    seller: "María Cárdenas",
    date: "29 oct. 2026, 10:42",
    method: "Tarjeta",
    total: 128.5,
  },
  {
    id: "V-1047",
    client: "Diego Salazar",
    seller: "Piero Alexander",
    date: "29 oct. 2026, 10:18",
    method: "Efectivo",
    total: 84,
  },
  {
    id: "V-1046",
    client: "Andrea Rojas",
    seller: "María Cárdenas",
    date: "29 oct. 2026, 09:56",
    method: "Yape / Plin",
    total: 192.4,
  },
  {
    id: "V-1045",
    client: "Carlos Medina",
    seller: "Jorge Paredes",
    date: "28 oct. 2026, 17:35",
    method: "Tarjeta",
    total: 63.5,
  },
  {
    id: "V-1044",
    client: "Sin nombre",
    seller: "Piero Alexander",
    date: "28 oct. 2026, 16:52",
    method: "Efectivo",
    total: 112,
  },
];
const makeActivities = () => [
  {
    id: 1,
    title: "Registró la venta V-1048",
    user: "María Cárdenas",
    time: "Hace 8 min",
    amount: "+ S/ 128.50",
    icon: "fas fa-cart-shopping",
    tone: "tone-teal",
  },
  {
    id: 2,
    title: "Registró una entrada · lote LOTE-2026-014",
    user: "Jorge Paredes",
    time: "Hace 24 min",
    amount: "+ 24 un.",
    icon: "fas fa-truck-fast",
    tone: "tone-blue",
  },
  {
    id: 3,
    title: "Inició sesión",
    user: "Piero Alexander",
    time: "Hace 1 h",
    amount: "",
    icon: "fas fa-right-to-bracket",
    tone: "tone-violet",
  },
  {
    id: 4,
    title: "Actualizó el precio de Miel de abeja 350 g",
    user: "Piero Alexander",
    time: "Hace 2 h",
    amount: "",
    icon: "fas fa-pen",
    tone: "tone-amber",
  },
  {
    id: 5,
    title: "Registró la venta V-1045",
    user: "Jorge Paredes",
    time: "Ayer, 17:35",
    amount: "+ S/ 63.50",
    icon: "fas fa-cart-shopping",
    tone: "tone-teal",
  },
];

export default {
  name: "DemoView",
  props: {
    standalone: { type: Boolean, default: false },
  },
  data() {
    return {
      activeSection: "dashboard",
      activeModal: "",
      toast: "",
      toastTimer: null,
      productSearch: "",
      stockFilter: "all",
      products: makeProducts(),
      sales: makeSales(),
      activities: makeActivities(),
      weekSales: [
        { label: "Jue", value: 420 },
        { label: "Vie", value: 680 },
        { label: "Sáb", value: 520 },
        { label: "Dom", value: 260 },
        { label: "Lun", value: 740 },
        { label: "Mar", value: 610 },
        { label: "Mié", value: 880, today: true },
      ],
      reportWeeks: [
        { label: "1–7 oct.", current: 3750, previous: 3200 },
        { label: "8–14 oct.", current: 4120, previous: 3580 },
        { label: "15–21 oct.", current: 4680, previous: 3900 },
        { label: "22–29 oct.", current: 4860, previous: 4200 },
      ],
      demoUsers: [
        {
          name: "Piero Alexander",
          email: "piero@ejemplo.com",
          role: "Administrador",
          sales: "S/ 3,815.00",
          initials: "PA",
          color: "",
        },
        {
          name: "María Cárdenas",
          email: "maria@ejemplo.com",
          role: "Cajera",
          sales: "S/ 8,420.50",
          initials: "MC",
          color: "avatar-coral",
        },
        {
          name: "Jorge Paredes",
          email: "jorge@ejemplo.com",
          role: "Supervisor",
          sales: "S/ 6,120.00",
          initials: "JP",
          color: "avatar-blue",
        },
        {
          name: "Valeria Soto",
          email: "valeria@ejemplo.com",
          role: "Almacenera",
          sales: "—",
          initials: "VS",
          color: "avatar-violet",
        },
      ],
      saleForm: { client: "", productId: 1, quantity: 1, method: "Efectivo" },
      productForm: { name: "", category: "", price: 0, stock: 0, minimum: 0 },
      receiptForm: { code: "", quantity: 1, supplier: "" },
      selectedProduct: null,
    };
  },
  computed: {
    navItems() {
      return [
        { id: "dashboard", label: "Resumen", icon: "fas fa-grid-2" },
        { id: "products", label: "Productos", icon: "fas fa-boxes-stacked" },
        { id: "sales", label: "Ventas", icon: "fas fa-receipt" },
        { id: "reports", label: "Reportes", icon: "fas fa-chart-pie" },
        { id: "users", label: "Equipo", icon: "fas fa-users" },
        {
          id: "activity",
          label: "Actividad",
          icon: "fas fa-clock-rotate-left",
        },
      ];
    },
    currentTitle() {
      return (
        this.navItems.find((item) => item.id === this.activeSection)?.label ||
        "Resumen"
      );
    },
    monthSales() {
      return (
        14820.5 +
        this.sales
          .slice(0, Math.max(0, this.sales.length - 5))
          .reduce((sum, sale) => sum + sale.total, 0)
      );
    },
    salesCount() {
      return 186 + Math.max(0, this.sales.length - 5);
    },
    salesToday() {
      return 28 + Math.max(0, this.sales.length - 5);
    },
    averageTicket() {
      return this.salesCount ? this.monthSales / this.salesCount : 0;
    },
    lowStockCount() {
      return this.products.filter((product) => product.stock <= product.minimum)
        .length;
    },
    bestProducts() {
      return [...this.products].sort((a, b) => b.sold - a.sold).slice(0, 4);
    },
    weekMax() {
      return Math.max(...this.weekSales.map((day) => day.value));
    },
    reportMax() {
      return Math.max(
        ...this.reportWeeks.flatMap((week) => [week.current, week.previous]),
      );
    },
    filteredProducts() {
      const query = this.productSearch.trim().toLocaleLowerCase("es");
      return this.products.filter((product) => {
        const matchesQuery =
          !query ||
          `${product.name} ${product.category}`
            .toLocaleLowerCase("es")
            .includes(query);
        return (
          matchesQuery &&
          (this.stockFilter !== "low" || product.stock <= product.minimum)
        );
      });
    },
    selectedSaleTotal() {
      const product = this.products.find(
        (item) => item.id === this.saleForm.productId,
      );
      return product
        ? product.price * Math.max(0, Number(this.saleForm.quantity) || 0)
        : 0;
    },
  },
  methods: {
    money(value) {
      return Number(value || 0).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    openSale() {
      this.saleForm = {
        client: "",
        productId: this.products[0]?.id || 0,
        quantity: 1,
        method: "Efectivo",
      };
      this.activeModal = "sale";
    },
    openReceipt(product) {
      this.selectedProduct = product;
      this.receiptForm = {
        code: `LOTE-2026-${String(this.products.length + 15).padStart(3, "0")}`,
        quantity: 1,
        supplier: "",
      };
      this.activeModal = "receipt";
    },
    registerSale() {
      const product = this.products.find(
        (item) => item.id === this.saleForm.productId,
      );
      const quantity = Math.max(1, Number(this.saleForm.quantity) || 1);
      if (!product || product.stock < quantity) {
        this.showToast("No hay suficiente stock en esta demo.");
        return;
      }
      product.stock -= quantity;
      product.sold += quantity;
      const total = product.price * quantity;
      const number = `V-${1049 + this.sales.length - 5}`;
      this.sales.unshift({
        id: number,
        client: this.saleForm.client,
        seller: "Piero Alexander",
        date: "29 oct. 2026, ahora",
        method: this.saleForm.method,
        total,
      });
      this.activities.unshift({
        id: Date.now(),
        title: `Registró la venta ${number}`,
        user: "Piero Alexander",
        time: "Ahora mismo",
        amount: `+ S/ ${this.money(total)}`,
        icon: "fas fa-cart-shopping",
        tone: "tone-teal",
      });
      this.activeModal = "";
      this.showToast("Venta de prueba registrada; el stock se actualizó.");
    },
    registerReceipt() {
      if (!this.selectedProduct) return;
      this.selectedProduct.stock += Math.max(
        1,
        Number(this.receiptForm.quantity) || 1,
      );
      this.activities.unshift({
        id: Date.now(),
        title: `Registró una entrada · lote ${this.receiptForm.code}`,
        user: "Piero Alexander",
        time: "Ahora mismo",
        amount: `+ ${this.receiptForm.quantity} un.`,
        icon: "fas fa-truck-fast",
        tone: "tone-blue",
      });
      this.activeModal = "";
      this.showToast(
        `Lote ${this.receiptForm.code} añadido al inventario FIFO de prueba.`,
      );
    },
    registerProduct() {
      const id = Math.max(...this.products.map((item) => item.id), 0) + 1;
      this.products.unshift({
        id,
        ...this.productForm,
        unit: "un.",
        sold: 0,
        color: "violet",
        icon: "fas fa-box",
      });
      this.activeModal = "";
      this.productForm = {
        name: "",
        category: "",
        price: 0,
        stock: 0,
        minimum: 0,
      };
      this.showToast("Producto añadido al catálogo de prueba.");
    },
    showToast(message) {
      this.toast = message;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toast = "";
      }, 3200);
    },
    resetDemo() {
      this.products = makeProducts();
      this.sales = makeSales();
      this.activities = makeActivities();
      this.activeSection = "dashboard";
      this.activeModal = "";
      this.productSearch = "";
      this.stockFilter = "all";
      this.showToast("La demo volvió a sus datos iniciales.");
    },
  },
  beforeUnmount() {
    clearTimeout(this.toastTimer);
  },
};
</script>

<style scoped>
.demo-shell {
  --demo-ink: #172b3b;
  --demo-muted: #738496;
  --demo-line: #e5ecee;
  --demo-surface: #fff;
  --demo-soft: #f7f9fa;
  --demo-teal: #078f89;
  --demo-teal-soft: #e7f6f3;
  display: flex;
  min-height: 100vh;
  background: #f4f7f8;
  color: var(--demo-ink);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
}
.demo-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  width: 238px;
  height: 100vh;
  flex: 0 0 238px;
  flex-direction: column;
  padding: 23px 16px 17px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #102436;
  color: #edf6f7;
}
.demo-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 3px 25px;
  color: inherit;
  text-decoration: none;
}
.demo-brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(75, 208, 190, 0.28);
  border-radius: 13px;
  background: rgba(49, 191, 171, 0.14);
  color: #69d8c7;
}
.demo-brand strong,
.demo-brand small {
  display: block;
}
.demo-brand strong {
  font-size: 0.91rem;
  letter-spacing: -0.02em;
}
.demo-brand small {
  margin-top: 2px;
  color: #9aafba;
  font-size: 0.68rem;
}
.demo-workspace {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 42px;
  padding: 0 11px;
  border: 1px solid rgba(207, 229, 234, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.045);
  color: #dce8eb;
  font-size: 0.76rem;
  font-weight: 600;
}
.demo-workspace i {
  margin-left: auto;
  color: #849aa5;
  font-size: 0.65rem;
}
.workspace-dot,
.demo-status i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3fc8a9;
  box-shadow: 0 0 0 3px rgba(63, 200, 169, 0.12);
}
.demo-nav-label {
  margin: 26px 10px 9px;
  color: #758d9a;
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.12em;
}
.demo-nav {
  display: grid;
  gap: 4px;
}
.demo-nav button {
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
  text-align: left;
  font-size: 0.77rem;
  font-weight: 570;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}
.demo-nav button i {
  width: 17px;
  color: #8ba2ae;
  text-align: center;
}
.demo-nav button:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.demo-nav button.active {
  border-color: rgba(63, 200, 169, 0.15);
  background: rgba(37, 172, 154, 0.15);
  color: #eafffb;
}
.demo-nav button.active i {
  color: #61d7c4;
}
.nav-count {
  display: grid;
  width: 20px;
  height: 20px;
  margin-left: auto;
  place-items: center;
  border-radius: 7px;
  background: rgba(243, 174, 91, 0.15);
  color: #f3bd74;
  font-size: 0.66rem;
}
.sidebar-bottom {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  padding: 14px 3px 2px;
  border-top: 1px solid rgba(221, 238, 240, 0.1);
}
.demo-user-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border: 1px solid #a4d3d5;
  border-radius: 50%;
  background: linear-gradient(145deg, #d8f0eb, #91c8c8);
  color: #124458;
  font-size: 0.67rem;
  font-weight: 800;
}
.demo-user-info {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}
.demo-user-info strong {
  overflow: hidden;
  color: #f3f7f8;
  font-size: 0.69rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.demo-user-info span {
  color: #8ca3af;
  font-size: 0.64rem;
}
.sidebar-bottom > i {
  color: #8196a2;
  font-size: 0.82rem;
}
.demo-main {
  min-width: 0;
  flex: 1;
}
.demo-topbar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  height: 62px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 clamp(18px, 3.5vw, 48px);
  border-bottom: 1px solid var(--demo-line);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--demo-muted);
  font-size: 0.76rem;
}
.breadcrumb i {
  color: #aab6be;
  font-size: 0.61rem;
}
.breadcrumb strong {
  color: var(--demo-ink);
  font-weight: 670;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}
.demo-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #526b77;
  font-size: 0.7rem;
  font-weight: 620;
}
.demo-status i {
  width: 7px;
  height: 7px;
}
.demo-theme-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--demo-line);
  border-radius: 10px;
  background: transparent;
  color: var(--demo-muted);
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}
.demo-theme-button:hover {
  border-color: #b8d8d4;
  background: #eaf6f4;
  color: #087f83;
}
.real-login-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #177c79;
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
}
.real-login-link:hover {
  color: #075d61;
}
.demo-notice {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  margin: 18px clamp(18px, 3.5vw, 48px) 0;
  padding: 8px 12px;
  border: 1px solid #dcece9;
  border-radius: 10px;
  background: #eef8f6;
  color: #426e6c;
  font-size: 0.7rem;
}
.demo-notice > i {
  color: #138d84;
}
.demo-notice span {
  flex: 1;
}
.demo-notice button {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #177c79;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}
.demo-content {
  display: grid;
  gap: 17px;
  max-width: 1510px;
  margin: 0 auto;
  padding: 23px clamp(18px, 3.5vw, 48px) 45px;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.eyebrow {
  margin: 0 0 5px !important;
  color: #148a83 !important;
  font-size: 0.62rem !important;
  font-weight: 760 !important;
  letter-spacing: 0.12em;
}
.page-heading h1 {
  margin: 0;
  color: #152b3a;
  font-size: 1.55rem;
  font-weight: 730;
  letter-spacing: -0.05em;
  line-height: 1.2;
}
.page-heading p:not(.eyebrow) {
  margin: 6px 0 0;
  color: #778897;
  font-size: 0.76rem;
}
.primary-button,
.secondary-button {
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
  font-size: 0.72rem;
  font-weight: 690;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}
.primary-button:hover {
  transform: translateY(-1px);
  background: #087975;
}
.secondary-button {
  border-color: var(--demo-line);
  background: #fff;
  color: #345264;
}
.secondary-button:hover {
  background: #f7f9fa;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.compact-metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.metric-card {
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid var(--demo-line);
  border-radius: 13px;
  background: var(--demo-surface);
  box-shadow: 0 4px 14px rgba(22, 50, 67, 0.025);
}
.metric-card > span {
  display: block;
  color: #758694;
  font-size: 0.68rem;
  font-weight: 590;
}
.metric-card > strong {
  display: block;
  margin-top: 8px;
  color: #172e3d;
  font-size: 1.37rem;
  font-weight: 730;
  letter-spacing: -0.045em;
}
.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #718291;
  font-size: 0.69rem;
}
.metric-icon {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 9px;
  font-size: 0.75rem;
}
.metric-icon.teal {
  background: #e8f6f3;
  color: #128e84;
}
.metric-icon.blue {
  background: #edf3fc;
  color: #5a7fbd;
}
.metric-icon.violet {
  background: #f3effb;
  color: #8464b6;
}
.metric-icon.amber {
  background: #fff5e8;
  color: #ce9140;
}
.metric-card .trend,
.trend {
  display: block;
  margin-top: 8px;
  color: #149278;
  font-size: 0.68rem;
  font-weight: 700;
}
.trend span {
  color: #8998a3;
  font-weight: 500;
}
.metric-foot {
  display: block;
  margin-top: 8px;
  color: #8896a2;
  font-size: 0.67rem;
}
.name-metric {
  font-size: 1.04rem !important;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(250px, 0.9fr);
  gap: 14px;
}
.demo-panel {
  min-width: 0;
  padding: 17px;
  border: 1px solid var(--demo-line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 17px rgba(22, 50, 67, 0.025);
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-heading h2,
.table-toolbar h2 {
  margin: 0;
  color: #1a3040;
  font-size: 0.84rem;
  font-weight: 710;
  letter-spacing: -0.02em;
}
.panel-heading p {
  margin: 3px 0 0;
  color: #8795a0;
  font-size: 0.68rem;
}
.panel-heading > i {
  color: #99a7b0;
}
.soft-select,
.table-toolbar select {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 31px;
  padding: 0 9px;
  border: 1px solid var(--demo-line);
  border-radius: 8px;
  background: #fff;
  color: #687b89;
  font-size: 0.65rem;
}
.soft-select i {
  font-size: 0.58rem;
}
.chart-legend {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
}
.chart-legend > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #788996;
  font-size: 0.65rem;
}
.chart-legend > span i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #13968e;
}
.chart-legend > b {
  margin-left: 10px;
  color: #233d4d;
  font-size: 0.73rem;
}
.chart-legend > small {
  color: #8b9aa4;
  font-size: 0.64rem;
}
.bar-chart {
  display: grid;
  height: 170px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-top: 4px;
}
.bar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}
.bar-value {
  height: 20px;
  color: #8796a1;
  font-size: 0.57rem;
}
.bar-track {
  display: flex;
  width: min(100%, 34px);
  flex: 1;
  align-items: flex-end;
  overflow: hidden;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(to top, #f8fafb, #fff);
}
.bar-track span {
  display: block;
  width: 100%;
  min-height: 4px;
  border-radius: 6px 6px 2px 2px;
  background: #a7dbd2;
  transition: height 0.25s ease;
}
.bar-track span.today {
  background: #078f89;
}
.bar-column > small {
  margin-top: 7px;
  color: #86949f;
  font-size: 0.62rem;
}
.seller-highlight {
  background: linear-gradient(145deg, #fff 62%, #f5fbfa);
}
.seller-feature {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 23px;
}
.seller-crown {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 8px;
  background: #fff5dd;
  color: #d5a244;
  font-size: 0.75rem;
}
.seller-photo {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 2px solid #e8f4f1;
  border-radius: 50%;
  background: linear-gradient(135deg, #d6eeea, #a7d8d0);
  color: #246264;
  font-size: 0.7rem;
  font-weight: 800;
}
.seller-feature > div:last-child {
  display: grid;
  gap: 3px;
}
.seller-feature strong {
  color: #213948;
  font-size: 0.78rem;
}
.seller-feature span {
  color: #85949f;
  font-size: 0.65rem;
}
.seller-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 9px;
  margin-top: 20px;
  padding-bottom: 13px;
  border-bottom: 1px solid #e8eeee;
}
.seller-total > strong {
  color: #173445;
  font-size: 1.32rem;
  letter-spacing: -0.04em;
}
.seller-total > span {
  color: #16947e;
  font-size: 0.64rem;
  font-weight: 700;
}
.seller-progress {
  margin-top: 11px;
}
.seller-progress > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #7d8d99;
  font-size: 0.64rem;
}
.seller-progress b {
  color: #365265;
}
.progress-track {
  display: block;
  height: 6px;
  overflow: hidden;
  border-radius: 8px;
  background: #eaf0ef;
}
.progress-track i {
  display: block;
  width: 84%;
  height: 100%;
  border-radius: inherit;
  background: #36b7a4;
}
.text-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 0;
  border: 0;
  background: none;
  color: #11857f;
  font-size: 0.68rem;
  font-weight: 680;
}
.text-button:hover {
  color: #075d61;
}
.best-sellers {
  margin-top: 14px;
}
.best-seller-row {
  display: grid;
  grid-template-columns: 24px 38px minmax(130px, 1.3fr) 70px minmax(
      55px,
      0.75fr
    ) 90px;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  border-top: 1px solid #eff2f3;
}
.rank-pill {
  color: #8b9aa4;
  font-size: 0.65rem;
  font-weight: 750;
}
.product-thumb {
  display: grid;
  width: 37px;
  height: 37px;
  flex: 0 0 37px;
  place-items: center;
  border-radius: 10px;
  font-size: 0.86rem;
}
.product-thumb.coffee {
  background: #f1e7da;
  color: #936c49;
}
.product-thumb.olive {
  background: #edf3df;
  color: #759044;
}
.product-thumb.coral {
  background: #fff0e9;
  color: #d58165;
}
.product-thumb.amber {
  background: #fff4dd;
  color: #c78b36;
}
.product-thumb.blue {
  background: #eaf2fb;
  color: #6586b4;
}
.product-thumb.violet {
  background: #f1edfa;
  color: #846abb;
}
.best-product-name {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.best-product-name strong {
  overflow: hidden;
  color: #304755;
  font-size: 0.69rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.best-product-name small {
  color: #909da5;
  font-size: 0.62rem;
}
.sold-count {
  color: #324c5b;
  font-size: 0.7rem;
  font-weight: 700;
}
.sold-count small {
  color: #8998a2;
  font-size: 0.6rem;
  font-weight: 500;
}
.sold-bar {
  height: 5px;
  overflow: hidden;
  border-radius: 7px;
  background: #edf2f2;
}
.sold-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #59baab;
}
.sold-income {
  color: #36515e;
  font-size: 0.69rem;
  text-align: right;
}
.heading-accent {
  color: #138f86;
}
.forecast-badge,
.count-chip,
.role-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 8px;
  border: 1px solid #dcece8;
  border-radius: 7px;
  background: #eff8f5;
  color: #25877d;
  font-size: 0.62rem;
  font-weight: 680;
  white-space: nowrap;
}
.restock-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #edf0f0;
  border-radius: 11px;
  background: #fbfcfc;
}
.restock-name {
  display: grid;
  flex: 1;
  gap: 4px;
  min-width: 100px;
}
.restock-name strong {
  color: #304754;
  font-size: 0.72rem;
}
.restock-name small {
  color: #84939e;
  font-size: 0.63rem;
}
.stock-current,
.stock-demand,
.buy-suggest {
  display: grid;
  gap: 3px;
  min-width: 68px;
}
.stock-current small,
.stock-demand small,
.buy-suggest small {
  color: #8796a1;
  font-size: 0.6rem;
}
.stock-current b,
.stock-demand b {
  color: #3b5360;
  font-size: 0.69rem;
}
.buy-suggest {
  padding-left: 12px;
  border-left: 1px solid #e6eceb;
}
.buy-suggest b {
  color: #138679;
  font-size: 0.7rem;
}
.icon-button {
  display: grid;
  width: 29px;
  height: 29px;
  flex: 0 0 29px;
  place-items: center;
  border: 1px solid #e5edeb;
  border-radius: 8px;
  background: #fff;
  color: #59727c;
  font-size: 0.67rem;
}
.restock-footnote {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 10px 2px 0;
  color: #92a0a8;
  font-size: 0.61rem;
}
.restock-footnote i {
  color: #80a6a0;
}
.activity-list {
  margin-top: 9px;
}
.activity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 51px;
  border-top: 1px solid #eff2f3;
}
.activity-mark {
  display: grid;
  width: 29px;
  height: 29px;
  flex: 0 0 29px;
  place-items: center;
  border-radius: 9px;
  font-size: 0.68rem;
}
.tone-teal {
  background: #e8f6f2;
  color: #168a7f;
}
.tone-blue {
  background: #edf3fb;
  color: #6283b6;
}
.tone-violet {
  background: #f1edfa;
  color: #8468ad;
}
.tone-amber {
  background: #fff5e6;
  color: #bd873c;
}
.activity-copy {
  display: grid;
  flex: 1;
  gap: 3px;
  min-width: 0;
}
.activity-copy strong {
  overflow: hidden;
  color: #3a515f;
  font-size: 0.67rem;
  font-weight: 640;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-copy small {
  color: #8d9aa3;
  font-size: 0.61rem;
}
.activity-amount {
  color: #637984;
  font-size: 0.66rem;
  font-weight: 650;
  white-space: nowrap;
}
.table-panel {
  padding: 0;
  overflow: hidden;
}
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 17px;
  border-bottom: 1px solid var(--demo-line);
}
.table-toolbar h2 {
  display: flex;
  align-items: center;
  gap: 9px;
}
.count-chip {
  min-height: 21px;
  font-size: 0.59rem;
}
.search-box {
  display: flex;
  min-width: min(100%, 340px);
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--demo-line);
  border-radius: 8px;
  color: #82929c;
}
.search-box input {
  width: 100%;
  height: 34px;
  border: 0;
  outline: 0;
  color: #304755;
  font-size: 0.68rem;
}
.search-box input::placeholder {
  color: #9aa7af;
}
.table-scroll {
  width: 100%;
  overflow: auto;
}
.table-scroll table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  text-align: left;
}
.table-scroll th {
  height: 39px;
  padding: 0 15px;
  background: #fafcfc;
  color: #84929c;
  font-size: 0.61rem;
  font-weight: 680;
}
.table-scroll td {
  height: 59px;
  padding: 7px 15px;
  border-top: 1px solid #eef2f3;
  color: #4d626e;
  font-size: 0.67rem;
  white-space: nowrap;
}
.table-product {
  display: flex;
  align-items: center;
  gap: 9px;
}
.table-product > span:last-child {
  display: grid;
  gap: 3px;
}
.table-product b {
  color: #324a58;
  font-size: 0.68rem;
}
.table-product small {
  color: #9aa6ae;
  font-size: 0.59rem;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 7px;
  font-size: 0.6rem;
  font-weight: 680;
}
.status-pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-pill.healthy {
  background: #ebf7f1;
  color: #248b69;
}
.status-pill.warning {
  background: #fff6e8;
  color: #b77c28;
}
.small-action {
  padding: 6px 8px;
  border: 1px solid #dcece8;
  border-radius: 7px;
  background: #f6fbf9;
  color: #267e74;
  font-size: 0.6rem;
  font-weight: 650;
}
.table-empty {
  height: 100px !important;
  color: #8c9aa4 !important;
  text-align: center;
}
.sale-id {
  color: #33736f;
}
.payment-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #687d89;
  font-size: 0.64rem;
}
.payment-type i {
  color: #528b87;
}
.demo-disclaimer {
  margin: 0;
  color: #98a4ac;
  font-size: 0.67rem;
}
.report-panel {
  padding: 18px;
}
.report-bars {
  display: grid;
  height: 270px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
  gap: 24px;
  margin-top: 15px;
  padding: 0 8%;
  border-bottom: 1px solid #e7edee;
}
.report-week {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}
.week-bar-group {
  display: flex;
  width: min(100%, 52px);
  height: 78%;
  align-items: flex-end;
  justify-content: center;
  gap: 5px;
}
.week-bar-group span {
  width: 17px;
  min-height: 5px;
  border-radius: 5px 5px 0 0;
  background: #36aa9c;
}
.week-bar-group span + span {
  background: #d8e4e7;
}
.report-week > b {
  color: #6f808c;
  font-size: 0.65rem;
}
.report-week > small {
  margin-bottom: 8px;
  color: #87949d;
  font-size: 0.61rem;
}
.chart-key {
  display: flex;
  justify-content: center;
  gap: 19px;
  margin-top: 14px;
  color: #84939d;
  font-size: 0.64rem;
}
.chart-key span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chart-key i {
  width: 8px;
  height: 8px;
  border-radius: 3px;
}
.current-key {
  background: #36aa9c;
}
.previous-key {
  background: #d8e4e7;
}
.activity-page-panel {
  display: grid;
  gap: 0;
  padding: 4px 18px;
}
.activity-page-panel .activity-row {
  min-height: 69px;
}
.demo-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(8, 24, 36, 0.58);
  backdrop-filter: blur(5px);
}
.demo-modal {
  display: grid;
  width: min(100%, 520px);
  gap: 14px;
  padding: 20px;
  border: 1px solid #e0e9eb;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(5, 23, 35, 0.25);
}
.demo-modal header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 13px;
  border-bottom: 1px solid #e9eeee;
}
.modal-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 12px;
  background: #e8f6f3;
  color: #148c82;
}
.demo-modal header h2 {
  margin: 0;
  color: #1d3544;
  font-size: 0.94rem;
}
.demo-modal header p {
  margin: 3px 0 0;
  color: #85939d;
  font-size: 0.68rem;
}
.modal-close {
  display: grid;
  width: 31px;
  height: 31px;
  margin-left: auto;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: #f3f6f6;
  color: #71828d;
}
.demo-modal > label,
.modal-form-row label {
  display: grid;
  gap: 6px;
  color: #465c68;
  font-size: 0.68rem;
  font-weight: 650;
}
.demo-modal input,
.demo-modal select {
  width: 100%;
  height: 39px;
  padding: 0 10px;
  border: 1px solid #dfe7e9;
  border-radius: 8px;
  outline: 0;
  background: #fff;
  color: #293f4c;
  font-size: 0.71rem;
}
.demo-modal input:focus,
.demo-modal select:focus {
  border-color: #53afa4;
  box-shadow: 0 0 0 3px rgba(41, 163, 151, 0.1);
}
.modal-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}
.modal-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e0eeea;
  border-radius: 9px;
  background: #f4faf8;
  color: #657b86;
  font-size: 0.7rem;
}
.modal-total strong {
  color: #137e75;
  font-size: 0.96rem;
}
.demo-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #e9eeee;
}
.batch-callout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dfeeea;
  border-radius: 8px;
  background: #f3faf7;
  color: #4b7973;
  font-size: 0.67rem;
}
.batch-callout i {
  color: #148d82;
}
.demo-toast {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: min(90vw, 420px);
  padding: 12px 15px;
  border: 1px solid #d6e9e4;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(12, 38, 47, 0.15);
  color: #3b5a64;
  font-size: 0.74rem;
}
.demo-toast i {
  color: #1aa18f;
}
.demo-toast-enter-active,
.demo-toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.demo-toast-enter-from,
.demo-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 1120px) {
  .demo-sidebar {
    width: 205px;
    flex-basis: 205px;
  }
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .best-seller-row {
    grid-template-columns: 23px 36px minmax(110px, 1fr) 60px 80px;
  }
  .sold-bar {
    display: none;
  }
}
@media (max-width: 760px) {
  .demo-shell {
    display: block;
  }
  .demo-sidebar {
    position: relative;
    width: auto;
    height: auto;
    padding: 12px 15px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .demo-brand {
    margin: 0 0 11px;
  }
  .demo-workspace,
  .demo-nav-label,
  .sidebar-bottom {
    display: none;
  }
  .demo-nav {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .demo-nav button {
    width: auto;
    min-width: max-content;
    min-height: 36px;
    gap: 7px;
    padding: 0 9px;
    font-size: 0.66rem;
  }
  .demo-nav button i {
    width: auto;
  }
  .nav-count {
    width: 17px;
    height: 17px;
  }
  .demo-topbar {
    height: 52px;
    padding: 0 16px;
  }
  .demo-status {
    display: none;
  }
  .demo-notice {
    align-items: flex-start;
    margin: 12px 14px 0;
    font-size: 0.65rem;
  }
  .demo-notice button {
    padding: 0;
  }
  .demo-content {
    gap: 12px;
    padding: 17px 14px 32px;
  }
  .page-heading {
    align-items: flex-start;
  }
  .page-heading h1 {
    font-size: 1.33rem;
  }
  .page-heading p:not(.eyebrow) {
    max-width: 430px;
  }
  .page-heading > .primary-button,
  .page-heading > .secondary-button {
    flex: 0 0 auto;
    padding: 0 10px;
    font-size: 0.65rem;
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .demo-panel {
    padding: 14px;
  }
  .table-panel {
    padding: 0;
  }
  .best-seller-row {
    grid-template-columns: 20px 34px minmax(100px, 1fr) 65px 76px;
    gap: 7px;
  }
  .restock-row {
    flex-wrap: wrap;
  }
  .restock-name {
    flex-basis: calc(100% - 60px);
  }
  .stock-current,
  .stock-demand,
  .buy-suggest {
    flex: 1;
  }
  .icon-button {
    margin-left: auto;
  }
  .report-bars {
    gap: 10px;
    padding: 0 1%;
  }
}
@media (max-width: 480px) {
  .demo-topbar {
    padding: 0 12px;
  }
  .breadcrumb {
    gap: 7px;
    font-size: 0.68rem;
  }
  .topbar-right {
    gap: 8px;
  }
  .real-login-link {
    font-size: 0.66rem;
  }
  .demo-notice {
    flex-wrap: wrap;
  }
  .demo-notice span {
    min-width: calc(100% - 32px);
  }
  .demo-notice button {
    margin-left: 24px;
  }
  .page-heading {
    flex-direction: column;
  }
  .page-heading > .primary-button,
  .page-heading > .secondary-button {
    min-height: 36px;
  }
  .metric-grid,
  .compact-metrics {
    gap: 8px;
  }
  .metric-card {
    padding: 12px;
  }
  .metric-card > strong {
    font-size: 1.15rem;
  }
  .metric-card > span,
  .metric-top {
    font-size: 0.63rem;
  }
  .metric-foot {
    font-size: 0.61rem;
  }
  .demo-panel {
    padding: 12px;
  }
  .chart-panel,
  .seller-highlight,
  .restock-panel,
  .recent-panel {
    border-radius: 12px;
  }
  .best-seller-row {
    grid-template-columns: 18px 31px minmax(85px, 1fr) 55px;
    gap: 6px;
  }
  .best-seller-row .sold-income {
    display: none;
  }
  .product-thumb {
    width: 31px;
    height: 31px;
    flex-basis: 31px;
  }
  .best-product-name strong {
    font-size: 0.63rem;
  }
  .sold-count {
    font-size: 0.64rem;
  }
  .sold-count small {
    display: block;
  }
  .panel-heading h2 {
    font-size: 0.79rem;
  }
  .soft-select {
    font-size: 0.58rem;
  }
  .restock-row {
    gap: 8px;
    padding: 9px;
  }
  .stock-current,
  .stock-demand,
  .buy-suggest {
    min-width: 52px;
  }
  .stock-demand small,
  .stock-current small,
  .buy-suggest small {
    font-size: 0.56rem;
  }
  .demo-modal {
    padding: 16px;
  }
  .demo-modal footer {
    flex-wrap: wrap;
  }
  .demo-modal footer button {
    flex: 1 1 120px;
  }
}
</style>
