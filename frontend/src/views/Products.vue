<template>
  <div class="dynamic-content products-page">
    <div class="page-heading">
      <div><p class="eyebrow">INVENTARIO</p><h1>Productos</h1><p>Administra tu catálogo, existencias y entradas por lote.</p></div>
      <button v-if="canManageCatalog" class="primary-button" type="button" @click="openProductModal()"><i class="fas fa-plus"></i> Nuevo producto</button>
    </div>

    <section class="metric-grid compact-metrics">
      <article class="metric-card"><div class="metric-top"><span>Productos</span><span class="metric-icon teal"><i class="fas fa-box"></i></span></div><strong>{{ products.length }}</strong><small class="metric-foot">En el catálogo</small></article>
      <article class="metric-card"><div class="metric-top"><span>Valor del inventario</span><span class="metric-icon blue"><i class="fas fa-coins"></i></span></div><strong>S/ {{ products.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.price || 0), 0).toFixed(2) }}</strong><small class="metric-foot">A precio de venta</small></article>
      <article class="metric-card"><div class="metric-top"><span>Stock bajo</span><span class="metric-icon amber"><i class="fas fa-triangle-exclamation"></i></span></div><strong>{{ products.filter(p => p.low_stock).length }}</strong><small class="metric-foot">Debajo del mínimo</small></article>
    </section>

    <section class="demo-panel filters-panel">
      <div class="table-toolbar product-toolbar">
        <div class="search-box"><i class="fas fa-search" aria-hidden="true"></i><input type="search" v-model="searchQuery" aria-label="Buscar productos" placeholder="Buscar por nombre, categoría o marca" /><button v-if="searchQuery" type="button" @click="searchQuery = ''" aria-label="Limpiar búsqueda"><i class="fas fa-times"></i></button></div>
        <select v-model="selectedCategory" class="category-select">
          <option value="">Todas las categorías</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
        <div class="view-controls">
          <button
            class="view-toggle"
            :class="{ active: viewMode === 'cards' }"
            type="button"
            @click="viewMode = 'cards'"
            :aria-pressed="viewMode === 'cards'"
            aria-label="Vista de tarjetas"
            title="Vista de tarjetas"
          >
            <i class="fas fa-th-large"></i>
          </button>
          <button
            class="view-toggle"
            :class="{ active: viewMode === 'list' }"
            type="button"
            @click="viewMode = 'list'"
            :aria-pressed="viewMode === 'list'"
            aria-label="Vista de tabla"
            title="Vista de tabla"
          >
            <i class="fas fa-list"></i>
          </button>
        </div>
      </div>
    </section>

    <div v-if="productsError" class="products-action-error" role="alert">
      <span>{{ productsError }}</span>
      <button type="button" class="text-button" @click="fetchProducts"><i class="fas fa-rotate"></i> Reintentar</button>
    </div>

    <!-- Loader animado -->
    <div v-if="loading" class="loader" role="status" aria-label="Cargando productos"></div>

    <!-- Mensaje si no hay productos -->
    <div v-else-if="filteredProducts.length === 0" class="no-products-msg">
      <i class="fas" :class="products.length ? 'fa-filter-circle-xmark' : 'fa-box-open'"></i>
      <p>{{ products.length ? 'No hay productos que coincidan con esos filtros.' : 'No hay productos para mostrar.' }}</p>
      <button v-if="products.length" type="button" class="secondary-button" @click="resetProductFilters">Limpiar filtros</button>
    </div>

    <section v-else class="products-results table-panel" aria-label="Resultados de productos">
      <div class="results-toolbar table-toolbar">
        <div class="table-title-group">
          <span class="results-eyebrow">Inventario</span>
          <h2>Catálogo de productos</h2>
        </div>
        <span class="results-count">{{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'producto' : 'productos' }}</span>
      </div>

    <!-- Vista de productos en tarjetas mejorada -->
    <div v-if="viewMode === 'cards'" class="products-grid">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card"
        :class="{ 'low-stock': product.low_stock }"
      >
        <div class="product-card-header">
          <div class="product-image-container">
            <img
              :src="product.image || defaultProductImg"
              :alt="`Imagen de ${product.name}`"
              class="product-image"
              @error="handleProductImageError"
            />
            <div class="product-overlay">
              <button v-if="canManageCatalog" type="button" @click="editProduct(product)" class="overlay-btn edit" :aria-label="`Editar ${product.name}`" title="Editar producto">
                <i class="fas fa-edit"></i>
              </button>
              <button type="button" @click="openReceiptModal(product)" class="overlay-btn receive" :aria-label="`Registrar entrada para ${product.name}`" title="Registrar una entrega y revisar lotes FIFO">
                <i class="fas fa-truck-ramp-box"></i>
              </button>
              <button v-if="canManageCatalog" type="button" @click="deleteProduct(product.id)" class="overlay-btn delete" :aria-label="`Desactivar ${product.name}`" title="Desactivar producto">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="product-status" v-if="product.low_stock">
            <span class="status-badge low-stock">
              <i class="fas fa-exclamation-triangle"></i>
              Stock Bajo
            </span>
          </div>
          <div class="product-status" v-else-if="product.activo === 0">
            <span class="status-badge inactive">
              <i class="fas fa-pause-circle"></i>
              Suspendido
            </span>
          </div>
        </div>
        
        <div class="product-card-body">
          <div class="product-category-badge">{{ product.category }}</div>
          <h3 class="product-title">{{ product.name }}</h3>
          <p class="product-description">{{ product.description }}</p>
          
          <div class="product-details">
            <div class="product-brand" v-if="product.marca">
              <i class="fas fa-industry"></i>
              {{ product.marca }}
            </div>
            <div class="product-unit" v-if="product.unidad_medida">
              <i class="fas fa-balance-scale"></i>
              {{ product.unidad_medida }}
            </div>
          </div>
          
          <div class="product-pricing">
            <div v-if="canViewCost" class="price-row">
              <span class="price-label">Venta:</span>
              <span class="price-value sale">S/ {{ Number(product.price || 0).toFixed(2) }}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Compra:</span>
              <span class="price-value purchase">S/ {{ Number(product.purchase_price || 0).toFixed(2) }}</span>
            </div>
          </div>
          
          <div class="product-stock-info">
            <div class="stock-row">
              <span class="stock-label">Stock actual:</span>
              <span class="stock-value" :class="{ 'low': product.low_stock }">
                {{ product.stock }}
              </span>
            </div>
            <div class="stock-limits">
              <span class="stock-min">Mín: {{ product.stock_min || 0 }}</span>
              <span class="stock-max">Máx: {{ Number(product.stock_max) > 0 ? product.stock_max : '∞' }}</span>
            </div>
              <button class="receive-stock-btn" type="button" @click="openReceiptModal(product)">
              <i class="fas fa-box-open"></i> Registrar entrega / lotes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista de productos en tabla -->
    <div v-else class="products-table table-scroll">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock disponible</th>
            <th>Estado</th>
            <th>Entradas</th>
            <th v-if="canManageCatalog">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in filteredProducts"
            :key="product.id"
            :class="{ 'low-stock': product.low_stock }"
          >
            <td><div class="table-product"><img :src="product.image || defaultProductImg" :alt="product.name" class="table-product-image" @error="handleProductImageError" /><span><b>{{ product.name }}</b><small>{{ product.description || `Código #${product.id}` }}</small></span></div></td>
            <td>{{ product.category }}</td>
            <td>S/ {{ Number(product.price || 0).toFixed(2) }}</td>
            <td><strong>{{ product.stock }}</strong><small class="stock-subtext">Mín. {{ product.stock_min || 0 }} · Máx. {{ Number(product.stock_max) > 0 ? product.stock_max : '∞' }}</small></td>
            <td><span class="status-pill" :class="product.low_stock ? 'warning' : 'healthy'"><i></i>{{ product.low_stock ? 'Stock bajo' : 'Disponible' }}</span></td>
            <td><button type="button" @click="openReceiptModal(product)" class="small-action"><i class="fas fa-truck-ramp-box"></i> Registrar entrada</button></td>
            <td v-if="canManageCatalog" class="product-actions-cell">
              <button type="button" @click="editProduct(product)" class="edit-btn" :aria-label="`Editar ${product.name}`" title="Editar">
                <i class="fas fa-pen"></i>
              </button>
              <button type="button" @click="deleteProduct(product.id)" class="delete-btn" :aria-label="`Desactivar ${product.name}`" title="Desactivar">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </section>

    <!-- Modal mejorado para agregar/editar producto -->
    <transition name="modal" appear>
      <div v-if="showProductModal" class="modal-overlay" @click.self="closeProductModal">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title-section">
              <div class="modal-icon">
                <i class="fas fa-cube"></i>
              </div>
              <div>
                <h2>{{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
                <p class="modal-subtitle">
                  {{ editingProduct ? 'Modifica la información del producto' : 'Completa los datos del nuevo producto' }}
                </p>
              </div>
            </div>
            <button class="modal-close-btn" @click="closeProductModal" aria-label="Cerrar modal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <form @submit.prevent="saveProduct" class="product-form">
              <div class="form-sections">
                <!-- Sección: Información Básica -->
                <div class="form-section">
                  <div class="section-header">
                    <h3><i class="fas fa-info-circle"></i> Información Básica</h3>
                  </div>
                  <div class="section-content">
                    <div class="form-group">
                      <label>Nombre del producto</label>
                      <div class="input-wrapper">
                        <i class="fas fa-tag input-icon"></i>
                        <input 
                          v-model="form.name" 
                          type="text"
                          placeholder="Ej: iPhone 14 Pro Max"
                          class="form-input"
                          required
                          maxlength="150"
                        />
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label>Descripción</label>
                      <div class="input-wrapper">
                        <i class="fas fa-align-left input-icon"></i>
                        <textarea 
                          v-model="form.description" 
                          placeholder="Descripción detallada del producto..."
                          class="form-textarea"
                          rows="3"
                          required
                        ></textarea>
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label>Categoría</label>
                      <div class="input-wrapper">
                        <i class="fas fa-folder input-icon"></i>
                        <input 
                          v-model="form.category"
                          type="text"
                          placeholder="Ej: Electrónicos, Ropa, Hogar..."
                          class="form-input"
                          required
                          maxlength="100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sección: Precios y Marca -->
                <div class="form-section">
                  <div class="section-header">
                    <h3><i class="fas fa-dollar-sign"></i> Precios y Marca</h3>
                  </div>
                  <div class="section-content">
                    <div class="form-row">
                      <div class="form-group">
                        <label>Precio de venta</label>
                        <div class="input-wrapper">
                          <i class="fas fa-money-bill-wave input-icon"></i>
                          <input 
                            v-model.number="form.price" 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            class="form-input"
                            required
                            inputmode="decimal"
                          />
                          <span class="input-suffix">S/</span>
                        </div>
                      </div>
                      
                      <div class="form-group">
                        <label>Precio de compra</label>
                        <div class="input-wrapper">
                          <i class="fas fa-shopping-cart input-icon"></i>
                          <input 
                            v-model.number="form.purchasePrice" 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            class="form-input"
                            required
                            inputmode="decimal"
                          />
                          <span class="input-suffix">S/</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="form-row">
                      <div class="form-group">
                        <label>Marca</label>
                        <div class="input-wrapper">
                          <i class="fas fa-industry input-icon"></i>
                          <input 
                            v-model="form.marca" 
                            type="text"
                            placeholder="Ej: Apple, Samsung, Nike..."
                            class="form-input"
                            required
                            maxlength="100"
                          />
                        </div>
                      </div>
                      
                      <div class="form-group">
                        <label>Unidad de medida</label>
                        <div class="input-wrapper">
                          <i class="fas fa-balance-scale input-icon"></i>
                          <select v-model="form.unidad_medida" class="form-select" required>
                            <option value="">Seleccionar unidad</option>
                            <option value="unidad">Unidad (und)</option>
                            <option value="kg">Kilogramo (kg)</option>
                            <option value="g">Gramo (g)</option>
                            <option value="lb">Libra (lb)</option>
                            <option value="oz">Onza (oz)</option>
                            <option value="lt">Litro (lt)</option>
                            <option value="ml">Mililitro (ml)</option>
                            <option value="gal">Galón (gal)</option>
                            <option value="m">Metro (m)</option>
                            <option value="cm">Centímetro (cm)</option>
                            <option value="mm">Milímetro (mm)</option>
                            <option value="in">Pulgada (in)</option>
                            <option value="ft">Pie (ft)</option>
                            <option value="m2">Metro cuadrado (m²)</option>
                            <option value="m3">Metro cúbico (m³)</option>
                            <option value="pza">Pieza (pza)</option>
                            <option value="par">Par</option>
                            <option value="docena">Docena</option>
                            <option value="caja">Caja</option>
                            <option value="paquete">Paquete</option>
                            <option value="bolsa">Bolsa</option>
                            <option value="rollo">Rollo</option>
                            <option value="hoja">Hoja</option>
                            <option value="kit">Kit</option>
                            <option value="set">Set/Conjunto</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sección: Inventario -->
                <div class="form-section">
                  <div class="section-header">
                    <h3><i class="fas fa-warehouse"></i> Control de Inventario</h3>
                  </div>
                  <div class="section-content">
                    <div class="form-group">
                      <label>{{ editingProduct ? 'Stock disponible' : 'Stock inicial' }}</label>
                      <div class="input-wrapper">
                        <i class="fas fa-boxes input-icon"></i>
                        <input 
                          v-model.number="form.stock"
                          type="number" 
                          min="0" 
                          step="1"
                          placeholder="Cantidad inicial"
                          class="form-input"
                          required
                          :readonly="Boolean(editingProduct)"
                        />
                        <span class="input-suffix">{{ form.unidad_medida || 'und' }}</span>
                      </div>
                      <small v-if="editingProduct" class="field-help">Para aumentar el stock, registra una entrega nueva. Así cada lote conserva su código y orden FIFO.</small>
                    </div>
                    
                    <div class="form-row">
                      <div class="form-group">
                        <label>Stock mínimo</label>
                        <div class="input-wrapper">
                          <i class="fas fa-arrow-down input-icon text-warning"></i>
                          <input 
                            v-model.number="form.stockMin" 
                            type="number" 
                            min="0" 
                            step="1"
                            placeholder="Alerta de stock bajo"
                            class="form-input"
                          />
                        </div>
                      </div>
                      
                      <div class="form-group">
                        <label>Stock máximo</label>
                        <div class="input-wrapper">
                          <i class="fas fa-arrow-up input-icon text-success"></i>
                          <input 
                            v-model.number="form.stockMax" 
                            type="number" 
                            min="0" 
                            step="1"
                            placeholder="Capacidad máxima"
                            class="form-input"
                          />
                        </div>
                        <small class="field-help">Usa 0 si no quieres establecer un límite máximo.</small>
                      </div>
                    </div>
                    
                  </div>
                </div>

                <!-- Sección: Imagen -->
                <div class="form-section">
                  <div class="section-header">
                    <h3><i class="fas fa-camera"></i> Imagen del Producto</h3>
                  </div>
                  <div class="section-content">
                    <div class="image-upload-area">
                      <div class="upload-zone" :class="{ 'has-image': form.imagePreview || (editingProduct && editingProduct.image) }">
                        <input 
                          type="file" 
                          @change="onImageChange" 
                          accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                          class="file-input"
                          id="imageUpload"
                          :disabled="isImageProcessing"
                        />
                        <label for="imageUpload" class="upload-label">
                          <div v-if="!form.imagePreview && !(editingProduct && editingProduct.image)" class="upload-placeholder">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Hacer clic para subir imagen</span>
                            <small>JPG, PNG o GIF (máx. 2 MB)</small>
                          </div>
                          <div v-else class="image-preview-wrapper">
                            <img
                              v-if="form.imagePreview"
                              :src="form.imagePreview"
                              alt="Previsualización"
                              class="image-preview"
                            />
                            <img
                              v-else-if="editingProduct && editingProduct.image"
                              :src="editingProduct.image"
                              alt="Imagen actual"
                              class="image-preview"
                            />
                            <div class="image-overlay">
                              <i class="fas fa-edit"></i>
                              <span>Cambiar imagen</span>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Botones de acción -->
              <p v-if="imageError" class="products-action-error" role="alert">{{ imageError }}</p>
              <p v-if="formError" class="products-action-error" role="alert">{{ formError }}</p>
              <div class="modal-footer">
                <button type="button" @click="closeProductModal" class="btn-secondary">
                  <i class="fas fa-times"></i>
                  Cancelar
                </button>
                <button type="submit" class="btn-primary" :disabled="savingProduct || isImageProcessing">
                  <i class="fas fa-save"></i>
                  {{ isImageProcessing ? 'Procesando imagen…' : savingProduct ? 'Guardando…' : `${editingProduct ? 'Actualizar' : 'Crear'} producto` }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </transition>

    <transition name="modal" appear>
      <div v-if="receivingProduct" class="modal-overlay receipt-overlay" @click.self="closeReceiptModal">
        <div class="modal-container receipt-modal">
          <div class="modal-header">
            <div class="modal-title-section">
              <div class="modal-icon"><i class="fas fa-boxes-stacked"></i></div>
              <div>
                <h2>Entregas y lotes</h2>
                <p class="modal-subtitle">{{ receivingProduct.name }} · {{ receivingProduct.stock }} unidades disponibles</p>
              </div>
            </div>
            <button type="button" class="modal-close-btn" aria-label="Cerrar" :disabled="savingReceipt" @click="closeReceiptModal"><i class="fas fa-times"></i></button>
          </div>

          <div class="modal-body receipt-body">
            <div class="receipt-layout">
              <section class="batch-history">
                <div class="receipt-section-heading">
                  <div><span class="results-eyebrow">Trazabilidad</span><h3>Lotes en orden FIFO</h3></div>
                  <span class="results-count">{{ productBatches.filter(batch => Number(batch.cantidad_disponible) > 0).length }} activos</span>
                </div>
                <p class="receipt-hint">Las ventas consumen primero las unidades del lote más antiguo.</p>
                <div v-if="loadingBatches" class="loader"></div>
                <div v-else-if="productBatches.length === 0" class="batch-empty">Todavía no hay entregas registradas.</div>
                <div v-else class="batch-list">
                  <article v-for="(batch, index) in productBatches" :key="batch.id" class="batch-row" :class="{ depleted: Number(batch.cantidad_disponible) === 0 }">
                    <span class="batch-order">{{ index + 1 }}</span>
                    <div class="batch-main">
                      <strong>{{ batch.codigo_lote }}</strong>
                      <small>Ingreso: {{ formatBatchDate(batch.fecha_ingreso) }}<template v-if="batch.proveedor"> · {{ batch.proveedor }}</template></small>
                      <small v-if="batch.fecha_vencimiento">Vence: {{ formatBatchDate(batch.fecha_vencimiento) }}</small>
                    </div>
                    <span class="batch-quantity">{{ batch.cantidad_disponible }} / {{ batch.cantidad_inicial }}</span>
                  </article>
                </div>
              </section>

              <form class="receipt-form" @submit.prevent="submitStockReceipt">
                <div class="receipt-section-heading">
                  <div><span class="results-eyebrow">Nueva entrada</span><h3>Registrar entrega</h3></div>
                </div>
                <label for="receipt-quantity">Cantidad recibida</label>
                <input id="receipt-quantity" v-model.number="receiptForm.cantidad" type="number" min="1" step="1" required />
                <label for="receipt-code">Código de lote</label>
                <input id="receipt-code" v-model.trim="receiptForm.codigo_lote" type="text" maxlength="100" placeholder="Se genera automáticamente si lo dejas vacío" />
                <label for="receipt-supplier">Proveedor <span>(opcional)</span></label>
                <input id="receipt-supplier" v-model.trim="receiptForm.proveedor" type="text" maxlength="150" placeholder="Nombre del proveedor" />
                <label for="receipt-expiry">Fecha de vencimiento <span>(opcional)</span></label>
                <input id="receipt-expiry" v-model="receiptForm.fecha_vencimiento" type="date" />
                <p v-if="receiptError" class="receipt-error" role="alert">{{ receiptError }}</p>
                <p v-if="receiptSuccess" class="receipt-success" role="status">Entrega registrada con el lote {{ receiptSuccess }}.</p>
                <div class="receipt-actions">
                  <button type="button" class="btn-secondary" :disabled="savingReceipt" @click="closeReceiptModal">Cerrar</button>
                  <button type="submit" class="btn-primary" :disabled="savingReceipt">
                    <i class="fas fa-truck-ramp-box"></i>{{ savingReceipt ? 'Guardando…' : 'Registrar entrega' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="products-background-decor"></div>
  </div>
</template>

<script>
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import defaultProductImg from '@/assets/images/default-product.png';
import realTimeService from '@/services/realTimeService';

export default {
  data() {
    return {
      searchQuery: '',
      selectedCategory: '',
      categories: [],
      products: [],
      viewMode: 'cards',
      defaultProductImg,
      loading: false,
      realtimeRefreshTimer: null,
      showProductModal: false,
      isModalOpen: false,
      editingProduct: null,
      savingProduct: false,
      isImageProcessing: false,
      productsError: '',
      formError: '',
      imageError: '',
      form: {
        name: '', description: '', price: null, purchasePrice: null,
        category: '', marca: '', unidad_medida: '', stock: null,
        stockMin: null, stockMax: null, imageFile: null, imagePreview: null,
      },
      receivingProduct: null,
      productBatches: [],
      loadingBatches: false,
      savingReceipt: false,
      receiptError: '',
      receiptSuccess: '',
      receiptForm: { cantidad: 1, codigo_lote: '', proveedor: '', fecha_vencimiento: '' },
    };
  },
  computed: {
    canManageCatalog() {
      return ['admin', 'supervisor'].includes((localStorage.getItem('userRole') || '').toLowerCase());
    },
    canViewCost() {
      return this.canManageCatalog;
    },
    apiBase() {
      return (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    },
    filteredProducts() {
      const query = this.searchQuery.trim().toLocaleLowerCase('es-PE');
      return this.products.filter((product) => {
        const searchableText = [product.name, product.category, product.marca, product.description, product.id]
          .filter(value => value !== null && value !== undefined)
          .join(' ')
          .toLocaleLowerCase('es-PE');
        return (!query || searchableText.includes(query)) &&
          (!this.selectedCategory || product.category === this.selectedCategory);
      });
    },
  },
  methods: {
    handleRealtimeChange(change = {}) {
      const entities = change.entities || [];
      if (entities.length && !entities.some(entity => ['inventory', 'products'].includes(entity))) return;
      clearTimeout(this.realtimeRefreshTimer);
      this.realtimeRefreshTimer = setTimeout(() => this.fetchProducts(), 180);
    },
    resolveProductImage(image) {
      if (!image || image === 'null' || image === 'undefined') return this.defaultProductImg;
      if (/^(https?:|data:|blob:)/i.test(image)) return image;
      if (image.startsWith('/uploads/')) return `${this.apiBase}${image}`;
      return image;
    },
    handleProductImageError(event) {
      const image = event.currentTarget;
      if (image.src !== new URL(this.defaultProductImg, window.location.href).href) {
        image.src = this.defaultProductImg;
      }
    },
    resetProductFilters() {
      this.searchQuery = '';
      this.selectedCategory = '';
    },
    async fetchProducts() {
      this.loading = true;
      this.productsError = '';
      try {
        const { data } = await axios.get(`${this.apiBase}/api/products`);
        const rows = Array.isArray(data) ? data : [];
        this.products = rows.map(product => ({
          ...product,
          image: this.resolveProductImage(product.image),
          low_stock: product.low_stock ?? (Number(product.stock || 0) <= Number(product.stock_min || 0)),
        }));
        this.categories = [...new Set(rows.map(product => String(product.category || '').trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'es'));
      } catch (error) {
        this.productsError = error.response?.data?.message || 'No se pudieron cargar los productos. Intenta actualizar la lista.';
        console.error('Error al obtener los productos:', error);
      } finally {
        this.loading = false;
      }
    },
    editProduct(product) {
      this.openProductModal(product);
    },
    openProductModal(product = null) {
      this.formError = '';
      this.imageError = '';
      this.productsError = '';
      this.editingProduct = product;
      this.form = product ? {
        name: product.name || '',
        description: product.description || '',
        price: product.price === null || product.price === undefined ? null : Number(product.price),
        purchasePrice: Number(product.purchase_price ?? product.purchasePrice ?? 0),
        category: product.category || '',
        marca: product.marca || '',
        unidad_medida: product.unidad_medida || '',
        stock: Number(product.stock || 0),
        stockMin: Number(product.stock_min ?? product.stockMin ?? 0),
        stockMax: Number(product.stock_max ?? product.stockMax ?? 0),
        imageFile: null,
        imagePreview: null,
      } : this.emptyProductForm();
      this.showProductModal = true;
      this.isModalOpen = true;
    },
    emptyProductForm() {
      return {
        name: '', description: '', price: null, purchasePrice: null,
        category: '', marca: '', unidad_medida: '', stock: null,
        stockMin: null, stockMax: null, imageFile: null, imagePreview: null,
      };
    },
    resetForm() {
      this.form = this.emptyProductForm();
    },
    closeProductModal() {
      if (this.savingProduct || this.isImageProcessing) return;
      this.showProductModal = false;
      this.isModalOpen = false;
      this.editingProduct = null;
      this.formError = '';
      this.imageError = '';
      this.resetForm();
    },
    async saveProduct() {
      if (this.savingProduct || this.isImageProcessing) return;
      this.formError = '';
      const requiredText = ['name', 'description', 'category', 'marca', 'unidad_medida'];
      if (requiredText.some(key => !String(this.form[key] || '').trim())) {
        this.formError = 'Completa nombre, descripción, categoría, marca y unidad de medida.';
        return;
      }
      const hasValue = value => value !== '' && value !== null && value !== undefined;
      const price = Number(this.form.price);
      const purchasePrice = Number(this.form.purchasePrice);
      const stock = Number(this.form.stock);
      const stockMin = this.form.stockMin === '' || this.form.stockMin === null ? 0 : Number(this.form.stockMin);
      const stockMax = this.form.stockMax === '' || this.form.stockMax === null ? 0 : Number(this.form.stockMax);
      if (!hasValue(this.form.price) || !hasValue(this.form.purchasePrice) ||
          ![price, purchasePrice].every(value => Number.isFinite(value) && value >= 0)) {
        this.formError = 'Ingresa precios válidos iguales o mayores que cero.';
        return;
      }
      if (!hasValue(this.form.stock) || ![stock, stockMin, stockMax].every(value => Number.isSafeInteger(value) && value >= 0)) {
        this.formError = 'Las cantidades de stock deben ser números enteros iguales o mayores que cero.';
        return;
      }
      if (stockMax > 0 && stockMax < stockMin) {
        this.formError = 'El stock máximo debe ser mayor o igual al stock mínimo, o quedar en cero para no limitarlo.';
        return;
      }

      this.savingProduct = true;
      try {
        const formData = new FormData();
        formData.append('name', String(this.form.name).trim());
        formData.append('description', String(this.form.description).trim());
        formData.append('price', String(price));
        formData.append('purchase_price', String(purchasePrice));
        formData.append('category', String(this.form.category).trim());
        formData.append('marca', String(this.form.marca).trim());
        formData.append('unidad_medida', String(this.form.unidad_medida).trim());
        formData.append('stock', String(stock));
        formData.append('stock_min', String(stockMin));
        formData.append('stock_max', String(stockMax));
        if (this.form.imageFile) formData.append('image', this.form.imageFile);

        const token = localStorage.getItem('authToken');
        const headers = { Authorization: `Bearer ${token}` };
        if (this.editingProduct?.id) {
          await axios.put(`${this.apiBase}/api/products/${this.editingProduct.id}`, formData, { headers });
        } else {
          await axios.post(`${this.apiBase}/api/products`, formData, { headers });
        }
        await this.fetchProducts();
        this.showProductModal = false;
        this.isModalOpen = false;
        this.editingProduct = null;
        this.resetForm();
      } catch (error) {
        this.formError = error.response?.data?.message || 'No se pudo guardar el producto. Revisa los datos e inténtalo nuevamente.';
        console.error('Error al guardar el producto:', error.response?.data || error);
      } finally {
        this.savingProduct = false;
      }
    },
    async deleteProduct(productId) {
      const product = this.products.find(item => String(item.id) === String(productId));
      const productName = product?.name || `#${productId}`;
      if (!window.confirm(`¿Desactivar "${productName}"? Ya no aparecerá en el catálogo ni estará disponible para ventas.`)) return;
      this.productsError = '';
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`${this.apiBase}/api/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await this.fetchProducts();
      } catch (error) {
        this.productsError = error.response?.data?.message || 'No se pudo desactivar el producto. Intenta nuevamente.';
        console.error('Error al desactivar el producto:', error);
      }
    },
    async onImageChange(event) {
      const input = event.target;
      const file = input.files?.[0];
      this.imageError = '';
      if (!file) return;
      const maxSize = 2 * 1024 * 1024;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const mimeByExt = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif' };
      const expectedMime = mimeByExt[ext];
      if (!expectedMime || (file.type && file.type !== expectedMime)) {
        this.imageError = 'Formato no válido. Sube una imagen JPG, PNG o GIF.';
        input.value = '';
        return;
      }
      if (file.size > maxSize) {
        this.imageError = 'La imagen supera el límite de 2 MB.';
        input.value = '';
        return;
      }

      this.isImageProcessing = true;
      try {
        let blob = file;
        if (file.type !== 'image/gif') {
          try {
            blob = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true });
          } catch (compressionError) {
            console.warn('No se pudo optimizar la imagen; se usará el archivo original.', compressionError);
          }
        }
        const outputType = blob.type || expectedMime;
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[outputType];
        if (!extension) throw new Error('El formato de la imagen optimizada no es compatible.');
        this.form.imageFile = new File([blob], `producto-${Date.now()}.${extension}`, { type: outputType });
        this.form.imagePreview = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        this.imageError = error.message || 'No se pudo procesar la imagen.';
        this.form.imageFile = null;
        this.form.imagePreview = null;
      } finally {
        this.isImageProcessing = false;
        input.value = '';
      }
    },
    async openReceiptModal(product) {
      this.receivingProduct = product;
      this.productBatches = [];
      this.receiptError = '';
      this.receiptSuccess = '';
      this.receiptForm = { cantidad: 1, codigo_lote: '', proveedor: '', fecha_vencimiento: '' };
      await this.loadProductBatches();
    },
    closeReceiptModal() {
      if (this.savingReceipt) return;
      this.receivingProduct = null;
      this.productBatches = [];
      this.receiptError = '';
      this.receiptSuccess = '';
    },
    async loadProductBatches() {
      const productId = this.receivingProduct?.id;
      if (!productId) return;
      this.loadingBatches = true;
      try {
        const token = localStorage.getItem('authToken');
        const { data } = await axios.get(`${this.apiBase}/api/products/${productId}/batches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (String(this.receivingProduct?.id) === String(productId)) this.productBatches = Array.isArray(data) ? data : [];
      } catch (error) {
        this.receiptError = error.response?.data?.message || 'No se pudieron cargar los lotes.';
      } finally {
        if (String(this.receivingProduct?.id) === String(productId)) this.loadingBatches = false;
      }
    },
    async submitStockReceipt() {
      const productId = this.receivingProduct?.id;
      if (!productId || this.savingReceipt) return;
      this.savingReceipt = true;
      this.receiptError = '';
      this.receiptSuccess = '';
      try {
        const token = localStorage.getItem('authToken');
        const { data } = await axios.post(`${this.apiBase}/api/products/${productId}/receipts`, this.receiptForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.receiptSuccess = data.codigo_lote;
        this.receiptForm = { cantidad: 1, codigo_lote: '', proveedor: '', fecha_vencimiento: '' };
        await this.fetchProducts();
        if (String(this.receivingProduct?.id) === String(productId)) {
          this.receivingProduct = this.products.find(product => String(product.id) === String(productId)) || this.receivingProduct;
          await this.loadProductBatches();
        }
      } catch (error) {
        this.receiptError = error.response?.data?.message || 'No se pudo registrar la entrega.';
      } finally {
        this.savingReceipt = false;
      }
    },
    formatBatchDate(value) {
      if (!value) return '—';
      const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const date = dateOnly
        ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
        : new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
    },
  },
  mounted() {
    realTimeService.addListener('data_changed', this.handleRealtimeChange);
    this.fetchProducts().then(() => {
      const editId = this.$route?.query?.edit;
      const product = this.products.find(item => String(item.id) === String(editId));
      if (editId && product) this.editProduct(product);
    });
  },
  beforeUnmount() {
    realTimeService.removeListener('data_changed', this.handleRealtimeChange);
    clearTimeout(this.realtimeRefreshTimer);
  },
};
</script>

<style scoped>
/* Fondo y contenedor principal */
.products-page {
  padding: min(2.5rem, 4vw) min(1.5rem, 3vw) min(6rem, 8vw) min(1.5rem, 3vw);
  font-family: 'Inter', Arial, sans-serif;
  background: #f6f7fb;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Cabecera mejorada */
.products-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.products-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  pointer-events: none;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.header-icon {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 1.25rem;
  font-size: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-text h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
}

.header-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0 0 1.5rem 0;
  font-weight: 400;
}

.header-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-actions {
  position: relative;
  z-index: 1;
}

.btn-new-product {
  background: white;
  color: #667eea;
  border: none;
  border-radius: 16px;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-new-product:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  background: #f8fafc;
}

.filters-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.search-container {
  flex: 1;
  min-width: 300px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: rgba(255, 255, 255, 0.7);
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.clear-search:hover {
  background: rgba(255, 255, 255, 0.3);
}

.filter-container {
  min-width: 200px;
}

.filter-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-icon {
  position: absolute;
  left: 1rem;
  color: rgba(255, 255, 255, 0.7);
  z-index: 1;
}

.category-select {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 1rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 3rem;
}

.category-select:focus {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.category-select option {
  background: #667eea;
  color: white;
}

.view-controls {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.25rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.view-toggle {
  background: transparent;
  border: none;
  border-radius: 8px;
  padding: 0.625rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-toggle:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.view-toggle.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Lista de productos mejorada */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
}

/* Tarjeta de producto mejorada */
.product-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f1f5f9;
  position: relative;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-color: #e2e8f0;
}

.product-card.low-stock {
  border-left: 4px solid #f59e0b;
}

.product-card-header {
  position: relative;
  overflow: hidden;
}

.product-image-container {
  position: relative;
  height: 140px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.product-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.overlay-btn {
  background: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.overlay-btn.edit {
  color: #667eea;
}

.overlay-btn.edit:hover {
  background: #667eea;
  color: white;
  transform: scale(1.1);
}

.overlay-btn.delete {
  color: #ef4444;
}

.overlay-btn.delete:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
}

.product-status {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}

.status-badge {
  background: rgba(255, 255, 255, 0.95);
  color: #374151;
  padding: 0.25rem 0.625rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-badge.low-stock {
  background: rgba(245, 158, 11, 0.9);
  color: white;
}

.status-badge.inactive {
  background: rgba(107, 114, 128, 0.9);
  color: white;
}

.product-card-body {
  padding: 1rem;
}

.product-category-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  display: inline-block;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.product-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.375rem 0;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-description {
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-details {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.product-brand,
.product-unit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: #6b7280;
  background: #f9fafb;
  padding: 0.15rem 0.375rem;
  border-radius: 6px;
  font-weight: 500;
}

.product-brand i,
.product-unit i {
  color: #9ca3af;
  font-size: 0.625rem;
}

.product-pricing {
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #e5e7eb;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.price-row:last-child {
  margin-bottom: 0;
}

.price-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.price-value {
  font-weight: 700;
  font-size: 0.85rem;
}

.price-value.sale {
  color: #059669;
}

.price-value.purchase {
  color: #dc2626;
}

.product-stock-info {
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  padding: 0.5rem;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.stock-label {
  font-size: 0.8rem;
  color: #0369a1;
  font-weight: 600;
}

.stock-value {
  font-weight: 700;
  color: #0c4a6e;
}

.stock-value.low {
  color: #dc2626;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.stock-limits {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #6b7280;
}

.stock-min,
.stock-max {
  background: rgba(255, 255, 255, 0.8);
  padding: 0.15rem 0.375rem;
  border-radius: 4px;
  font-weight: 500;
}

/* Loader y mensaje igual que dashboard */
.loader {
  width: 48px;
  height: 48px;
  border: 5px solid #ececec;
  border-top: 5px solid #4f8cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.no-products-msg {
  color: #8a94a6;
  text-align: center;
  font-size: 1.01rem;
  margin-bottom: 1.3rem;
}

/* --- ESTILOS PARA LA TABLA DE PRODUCTOS --- */
.products-table {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(30, 41, 59, 0.07);
  padding: 2rem 1rem 2rem 1rem;
  max-width: 100%;
  margin: 0 auto 2.5rem auto;
  border: 1px solid #ececec;
  overflow-x: auto;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}
.products-table table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: transparent;
}
.products-table th, .products-table td {
  padding: 1rem 0.7rem;
  text-align: center;
  font-size: 1.05rem;
}
.products-table th {
  background: #f6f7fb;
  color: #3b4a5a;
  font-weight: 700;
  border-bottom: 2px solid #ececec;
}
.products-table tbody tr {
  border-bottom: 1px solid #ececec;
  transition: background 0.13s;
}
.products-table tbody tr:hover {
  background: #f8fafc;
}
.products-table td {
  color: #23272f;
  vertical-align: middle;
}
.table-product-image {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #ececec;
  background: #f8fafc;
  display: block;
  margin: 0 auto;
}
.products-table .edit-btn, .products-table .delete-btn {
  background: #f6f7fb;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  font-size: 1.1rem;
  color: #4f8cff;
  margin: 0 0.2rem;
  transition: background 0.13s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.products-table .edit-btn:hover {
  background: #e0e7ff;
}
.products-table .delete-btn {
  color: #ff6961;
}
.products-table .delete-btn:hover {
  background: #ffe0e0;
}
.products-table .stock-alert {
  color: #ff6961;
  font-weight: 700;
  margin-left: 0.5rem;
}

/* --- MODAL MEJORADO --- */
.modal {
  &-enter-active, &-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  &-enter-from, &-leave-to {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.modal-container {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-icon {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.modal-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
}

.modal-subtitle {
  font-size: 0.95rem;
  margin: 0.25rem 0 0 0;
  opacity: 0.9;
  font-weight: 400;
}

.modal-close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.1rem;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.modal-body {
  padding: 0;
  overflow-y: auto;
  max-height: calc(90vh - 200px);
}

.product-form {
  padding: 0;
}

.form-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.form-section {
  border-right: 1px solid #e2e8f0;
  &:nth-child(even) {
    border-right: none;
  }
  &:nth-child(3), &:nth-child(4) {
    border-top: 1px solid #e2e8f0;
  }
}

.section-header {
  background: #f8fafc;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-header h3 i {
  color: #667eea;
  font-size: 1.1rem;
}

.section-content {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  letter-spacing: 0.025em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: #9ca3af;
  font-size: 1rem;
  z-index: 1;
  pointer-events: none;
}

.input-suffix {
  position: absolute;
  right: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  pointer-events: none;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.95rem;
  color: #111827;
  background: white;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 1rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 3rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.text-warning {
  color: #f59e0b !important;
}

.text-success {
  color: #10b981 !important;
}

/* Sección de imagen */
.form-section:nth-child(4) {
  grid-column: span 2;
  border-right: none;
}

.image-upload-area {
  width: 100%;
}

.upload-zone {
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  background: #fafafa;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.upload-zone:hover {
  border-color: #667eea;
  background: #f8fafc;
}

.upload-zone.has-image {
  border: 2px solid #e5e7eb;
  background: white;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.upload-label {
  display: block;
  cursor: pointer;
}

.upload-placeholder {
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;
}

.upload-placeholder i {
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
  display: block;
}

.upload-placeholder span {
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.upload-placeholder small {
  font-size: 0.875rem;
  color: #9ca3af;
}

.image-preview-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.image-preview {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-size: 0.95rem;
  font-weight: 500;
}

.image-preview-wrapper:hover .image-overlay {
  opacity: 1;
}

.image-overlay i {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.modal-footer {
  background: #f8fafc;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.btn-secondary {
  background: white;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

/* Estilos personalizados para scrollbar */
.products-page::-webkit-scrollbar,
.products-grid::-webkit-scrollbar,
.products-table::-webkit-scrollbar {
  width: 8px;
}

.products-page::-webkit-scrollbar-track,
.products-grid::-webkit-scrollbar-track,
.products-table::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.products-page::-webkit-scrollbar-thumb,
.products-grid::-webkit-scrollbar-thumb,
.products-table::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  transition: background 0.3s ease;
}

.products-page::-webkit-scrollbar-thumb:hover,
.products-grid::-webkit-scrollbar-thumb:hover,
.products-table::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}

/* Para Firefox */
.products-page,
.products-grid,
.products-table {
  scrollbar-width: thin;
  scrollbar-color: #667eea #f1f5f9;
}

/* Responsive */
@media (max-width: 1024px) {
  .form-sections {
    grid-template-columns: 1fr;
  }
  
  .form-section {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .form-section:nth-child(4) {
    grid-column: span 1;
    border-bottom: none;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }
  
  .modal-header {
    padding: 1.5rem;
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .modal-title-section {
    flex-direction: column;
    text-align: center;
  }
  
  .section-content {
    padding: 1.5rem;
  }
  
  .modal-footer {
    padding: 1rem 1.5rem;
    flex-direction: column-reverse;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    min-width: 0;
  }
}
/* Responsive mejorado */
@media (max-width: 1200px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .header-stats {
    gap: 1.5rem;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
}

@media (max-width: 768px) {
  .products-page {
    padding: 1rem 1rem 4rem 1rem;
  }
  
  .products-header {
    padding: 2rem 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .header-left {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
    width: 100%;
  }
  
  .header-text h1 {
    font-size: 2rem;
  }
  
  .header-stats {
    justify-content: center;
    gap: 1rem;
  }
  
  .filters-section {
    flex-direction: column;
    gap: 1rem;
  }
  
  .search-container,
  .filter-container {
    min-width: unset;
    width: 100%;
  }
  
  .view-controls {
    align-self: center;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .product-card-body {
    padding: 1rem;
  }
  
  .product-details {
    justify-content: space-between;
  }
  
  .modal-overlay {
    padding: 1rem;
  }
  
  .modal-header {
    padding: 1.5rem;
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .modal-title-section {
    flex-direction: column;
    text-align: center;
  }
  
  .section-content {
    padding: 1.5rem;
  }
  
  .modal-footer {
    padding: 1rem 1.5rem;
    flex-direction: column-reverse;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    min-width: 0;
  }
  
  .products-table {
    padding: 1rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .products-table th,
  .products-table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }
  
  .table-product-image {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .products-page {
    padding: 1rem 0.5rem 3.5rem 0.5rem;
  }
  
  .products-header {
    padding: 1.5rem 1rem;
  }
  
  .header-text h1 {
    font-size: 1.75rem;
  }
  
  .header-subtitle {
    font-size: 1rem;
  }
  
  .btn-new-product {
    padding: 0.875rem 1.25rem;
    font-size: 0.9rem;
  }
  
  .search-input,
  .category-select {
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    font-size: 0.9rem;
  }
  
  .product-image-container {
    height: 160px;
  }
  
  .product-title {
    font-size: 1.1rem;
  }
  
  .modal-container {
    width: 95vw;
    margin: 0.5rem;
  }
  
  .section-header {
    padding: 1rem 1.5rem;
  }
  
  .section-content {
    padding: 1rem;
  }
}

/* Dispositivos muy pequeños */
@media (max-width: 360px) {
  .products-page {
    padding: 0.75rem 0.25rem 3rem 0.25rem;
  }
  
  .products-header {
    padding: 1rem 0.75rem;
  }
}
</style>
