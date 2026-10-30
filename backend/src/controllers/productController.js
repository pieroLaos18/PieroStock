const productService = require('../services/productService');
const { registrarActividad } = require('../services/activityService');
const realtimeHub = require('../services/realtimeHub');

const validateProduct = (data, requireAll = false) => {
  const textLimits = { name: 150, description: 5000, category: 100, marca: 100, unidad_medida: 50 };
  for (const [field, max] of Object.entries(textLimits)) {
    if (requireAll && (typeof data[field] !== 'string' || !data[field].trim())) return `Completa el campo ${field}.`;
    if (data[field] !== undefined && (typeof data[field] !== 'string' || data[field].trim().length > max)) return `El campo ${field} no es válido.`;
  }
  for (const field of ['price', 'purchase_price']) {
    if (requireAll && data[field] === undefined) return `Completa el campo ${field}.`;
    if (data[field] !== undefined && (!Number.isFinite(Number(data[field])) || Number(data[field]) < 0 || Number(data[field]) > 9999999999.99)) return `El campo ${field} debe ser un importe válido.`;
  }
  for (const field of ['stock', 'stock_min', 'stock_max']) {
    if (requireAll && data[field] === undefined) return `Completa el campo ${field}.`;
    if (data[field] !== undefined && (!Number.isSafeInteger(Number(data[field])) || Number(data[field]) < 0 || Number(data[field]) > 2147483647)) return `El campo ${field} debe ser un entero no negativo.`;
  }
  if (data.stock_min !== undefined && data.stock_max !== undefined && Number(data.stock_max) > 0 && Number(data.stock_max) < Number(data.stock_min)) return 'El stock máximo debe ser mayor o igual al stock mínimo.';
  return null;
};

const getAll = async (req, res) => {
  try {
    const products = await productService.getAll();
    if (!['admin', 'supervisor'].includes(req.user.rol)) {
      for (const product of products) delete product.purchase_price;
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error interno al listar productos' });
  }
};

const getDestacados = async (req, res) => {
  try {
    const productos = await productService.getDestacados();
    res.json(productos);
  } catch {
    res.status(500).json({ message: 'Error al obtener productos destacados' });
  }
};

const add = async (req, res) => {
  try {
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const {
      name, description, price, purchase_price, category,
      marca, unidad_medida, stock, stock_min, stock_max
    } = req.body;

    const validationError = validateProduct({ name, description, price, purchase_price, category, marca, unidad_medida, stock, stock_min, stock_max }, true);
    if (validationError) return res.status(400).json({ message: validationError });

    const id = await productService.insertProduct({
      name, description, price, purchase_price, category,
      marca, unidad_medida, stock, stock_min, stock_max, image
    }, req.user.id);

    await registrarActividad({
      userId: req.user.id,
      tipo: 'producto',
      descripcion: `Agregó el producto: ${name}`,
      detalles: `Producto #${id} · Stock inicial: ${stock} · Lote: INICIAL-${id}`
    });
    realtimeHub.publishDataChanged({ entities: ['inventory', 'products'], action: 'product_created', actorId: req.user.id, recordId: id });

    res.status(201).json({ id, name });
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar producto' });
  }
};

const update = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id)) || Number(req.params.id) <= 0) return res.status(400).json({ message: 'El identificador del producto no es válido.' });
    const data = { ...req.body };
    delete data.image;
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const validationError = validateProduct(data);
    if (validationError) return res.status(400).json({ message: validationError });
    if (!Object.keys(data).length) return res.status(400).json({ message: 'No se recibieron cambios válidos.' });
    await productService.updateProduct(req.params.id, data);
    await registrarActividad({ userId: req.user.id, tipo: 'producto', descripcion: `Actualizó el producto: ${req.body.name || `#${req.params.id}`}`, detalles: `Producto #${req.params.id}` });
    realtimeHub.publishDataChanged({ entities: ['inventory', 'products'], action: 'product_updated', actorId: req.user.id, recordId: req.params.id });
    res.status(200).json({ message: 'Producto actualizado' });
  } catch {
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
};

const remove = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id)) || Number(req.params.id) <= 0) return res.status(400).json({ message: 'El identificador del producto no es válido.' });
    await productService.softDelete(req.params.id);
    await registrarActividad({ userId: req.user.id, tipo: 'producto', descripcion: `Desactivó el producto #${req.params.id}`, detalles: `Producto #${req.params.id}` });
    realtimeHub.publishDataChanged({ entities: ['inventory', 'products'], action: 'product_deactivated', actorId: req.user.id, recordId: req.params.id });
    res.status(200).json({ message: 'Producto desactivado' });
  } catch {
    res.status(500).json({ message: 'Error al desactivar producto' });
  }
};

const getBatches = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id)) || Number(req.params.id) <= 0) return res.status(400).json({ message: 'El identificador del producto no es válido.' });
    const batches = await productService.getProductBatches(req.params.id);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'No se pudieron cargar los lotes del producto.' });
  }
};

const receiveStock = async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id)) || Number(req.params.id) <= 0) return res.status(400).json({ message: 'El identificador del producto no es válido.' });
    const batch = await productService.receiveStock(req.params.id, req.body, req.user.id);
    realtimeHub.publishDataChanged({ entities: ['inventory'], action: 'stock_received', actorId: req.user.id, recordId: req.params.id, batchCode: batch.codigo_lote });
    res.status(201).json(batch);
  } catch (error) {
    if (!error.status) console.error(`[products] No se pudo registrar la entrega (${error.code || 'DB_ERROR'}).`);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'No se pudo registrar la entrega.' });
  }
};

const filterBy = async (req, res) => {
  const field = req.params.field;
  const value = req.params.value;
  try {
    const result = await productService.getByFilter(field, value);
    if (!['admin', 'supervisor'].includes(req.user.rol)) {
      for (const product of result) delete product.purchase_price;
    }
    res.status(200).json(result);
  } catch {
    res.status(400).json({ message: 'Los criterios de búsqueda no son válidos.' });
  }
};

module.exports = {
  getAll,
  getDestacados,
  add,
  update,
  remove,
  filterBy,
  getBatches,
  receiveStock
};
