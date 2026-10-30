// controllers/salesController.js

const salesService = require('../services/salesService');
const realtimeHub = require('../services/realtimeHub');

exports.getAllSales = async (req, res) => {
  try {
    const ownUserId = req.user.rol === 'cajero' ? req.user.id : null;
    const ventas = await salesService.getAllSalesWithProducts(ownUserId);
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
};

exports.getSalesResumen = async (req, res) => {
  try {
    const resumen = await salesService.getSalesResumen();
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener resumen de ventas' });
  }
};

exports.getVentasPorDia = async (req, res) => {
  try {
    const data = await salesService.getVentasPorDia();
    res.json(data);
  } catch (error) {
    console.error(`[sales] Error en ventas por día (${error.code || 'UNKNOWN'}).`);
    res.status(500).json({ message: 'Error al obtener ventas por día' });
  }
};

exports.getVentasPorDiaAnterior = async (req, res) => {
  try {
    const data = await salesService.getVentasPorDiaAnterior();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas semana anterior' });
  }
};

exports.getMetodosPago = async (req, res) => {
  try {
    const data = await salesService.getMetodosPago();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener métodos de pago' });
  }
};

exports.getVentaById = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) return res.status(400).json({ message: 'El identificador de venta no es válido.' });
    const ownUserId = req.user.rol === 'cajero' ? req.user.id : null;
    const venta = await salesService.getSaleById(req.params.id, ownUserId);
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada.' });
    res.json(venta);
  } catch (error) {
    console.error('❌ Error al obtener detalle de venta:', error);
    res.status(500).json({ message: 'Error al obtener detalle de venta' });
  }
};

exports.createVenta = async (req, res) => {
  try {
    const { cliente = '', productos, metodo_pago } = req.body || {};
    if (typeof cliente !== 'string' || cliente.trim().length > 150) return res.status(400).json({ message: 'El nombre del cliente no puede superar 150 caracteres.' });
    if (!Array.isArray(productos) || productos.length < 1 || productos.length > 100) return res.status(400).json({ message: 'La venta debe incluir entre 1 y 100 productos.' });
    const paymentMethods = ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia', 'otro'];
    if (typeof metodo_pago !== 'string' || !paymentMethods.includes(metodo_pago.trim().toLowerCase())) return res.status(400).json({ message: 'Selecciona un método de pago válido.' });
    const grouped = new Map();
    for (const line of productos) {
      const id = Number(line?.id);
      const cantidad = Number(line?.cantidad);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(cantidad) || cantidad <= 0 || cantidad > 100000) {
        return res.status(400).json({ message: 'Cada producto debe tener un identificador y una cantidad válidos.' });
      }
      grouped.set(id, (grouped.get(id) || 0) + cantidad);
      if (grouped.get(id) > 100000) return res.status(400).json({ message: 'La cantidad solicitada supera el límite permitido.' });
    }
    const ventaId = await salesService.createVenta({ cliente: cliente.trim(), productos: [...grouped].map(([id, cantidad]) => ({ id, cantidad })), metodo_pago: metodo_pago.trim().toLowerCase(), user_id: req.user.id });
    realtimeHub.publishDataChanged({ entities: ['sales', 'inventory'], action: 'sale_created', actorId: req.user.id, recordId: ventaId });
    res.status(200).json({ ventaId });
  } catch (error) {
    console.error(`[sales] No se pudo registrar la venta (${error.code || 'BUSINESS_OR_DB_ERROR'}).`);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Error al registrar venta' });
  }
};

exports.anularVenta = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) return res.status(400).json({ message: 'El identificador de venta no es válido.' });
    if (req.body?.motivo !== undefined && (typeof req.body.motivo !== 'string' || req.body.motivo.length > 500)) return res.status(400).json({ message: 'El motivo no puede superar 500 caracteres.' });
    const result = await salesService.anularVenta(req.params.id, req.body.motivo, req.user.id);
    realtimeHub.publishDataChanged({ entities: ['sales', 'inventory'], action: 'sale_cancelled', actorId: req.user.id, recordId: req.params.id });
    res.json(result);
  } catch (error) {
    console.error(`[sales] No se pudo anular la venta (${error.code || 'BUSINESS_OR_DB_ERROR'}).`);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Error al anular venta' });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Number.isSafeInteger(requested) ? Math.max(1, Math.min(requested, 50)) : 5;
    const productos = await salesService.getTopProducts(limit);
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    res.status(500).json({ message: 'Error al obtener productos más vendidos' });
  }
};

exports.getDashboardInsights = async (req, res) => {
  try {
    const insights = await salesService.getDashboardInsights();
    const historyYears = Math.max(1, Math.ceil(insights.historyMonths / 12));
    const productMap = new Map();

    for (const row of insights.monthlyRows) {
      const id = Number(row.id);
      if (!productMap.has(id)) {
        productMap.set(id, {
          id,
          name: row.name,
          category: row.category,
          image: row.image,
          stock: Number(row.stock) || 0,
          stock_min: Number(row.stock_min) || 0,
          stock_max: Number(row.stock_max) || 0,
          monthTotals: Array(12).fill(0),
          monthYears: Array.from({ length: 12 }, () => new Set())
        });
      }
      const product = productMap.get(id);
      const monthIndex = Number(row.mes) - 1;
      product.monthTotals[monthIndex] += Number(row.unidades) || 0;
      product.monthYears[monthIndex].add(Number(row.anio));
    }

    const currentMonth = insights.currentMonth;
    const upcomingMonths = new Set([0, 1, 2].map(offset => ((currentMonth - 1 + offset) % 12) + 1));
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const recommendations = [];

    for (const product of productMap.values()) {
      const monthlyAverage = product.monthTotals.map(total => total / historyYears);
      const peakMonthIndex = monthlyAverage.reduce((best, value, index, values) => value > values[best] ? index : best, 0);
      const peakUnits = monthlyAverage[peakMonthIndex];
      const baseline = product.monthTotals.reduce((sum, value) => sum + value, 0) / insights.historyMonths;
      const seasonalityIndex = baseline > 0 ? peakUnits / baseline : 0;
      const yearsWithPeakHistory = product.monthYears[peakMonthIndex].size;

      if (!upcomingMonths.has(peakMonthIndex + 1) || yearsWithPeakHistory < 2 || seasonalityIndex < 1.15) continue;

      const targetStock = Math.ceil(peakUnits + product.stock_min);
      const needed = Math.max(0, targetStock - product.stock);
      const capacity = product.stock_max > 0 ? Math.max(0, product.stock_max - product.stock) : needed;
      const recommendedUnits = Math.min(needed, capacity);
      if (recommendedUnits < 1) continue;

      recommendations.push({
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        stock: product.stock,
        stock_min: product.stock_min,
        peak_month: monthNames[peakMonthIndex],
        average_units: Number(peakUnits.toFixed(1)),
        recommended_units: recommendedUnits,
        seasonality_index: Number(seasonalityIndex.toFixed(2)),
        years_observed: yearsWithPeakHistory
      });
    }

    recommendations.sort((a, b) => b.seasonality_index - a.seasonality_index || b.recommended_units - a.recommended_units);
    res.json({
      topSellers: insights.topSellers.map(user => ({
        ...user,
        ventas_realizadas: Number(user.ventas_realizadas) || 0,
        total_vendido: Number(user.total_vendido) || 0
      })),
      restockRecommendations: recommendations.slice(0, 8),
      historyMonths: insights.historyMonths,
      upcomingMonths: [0, 1, 2].map(offset => monthNames[(currentMonth - 1 + offset) % 12])
    });
  } catch (error) {
    console.error('Error al generar insights del dashboard:', error);
    res.status(500).json({ message: 'Error al generar indicadores del dashboard' });
  }
};

exports.generarComprobante = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) return res.status(400).json({ message: 'El identificador de venta no es válido.' });
    const ownUserId = req.user.rol === 'cajero' ? req.user.id : null;
    const comprobante = await salesService.generarComprobante(req.params.id, ownUserId);
    if (!comprobante) return res.status(404).json({ message: 'Venta no encontrada.' });
    res.json(comprobante);
  } catch {
    res.status(500).json({ message: 'Error al generar comprobante' });
  }
};
