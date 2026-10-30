const reportService = require('../services/reportService');

const isDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const getSalesByDate = async (req, res) => {
  let { from, to } = req.query;
  const today = new Date().toISOString().slice(0, 10);
  if (from !== undefined && !isDateOnly(from)) return res.status(400).json({ message: 'La fecha inicial no es válida.' });
  if (to !== undefined && !isDateOnly(to)) return res.status(400).json({ message: 'La fecha final no es válida.' });
  if (!from && !to) {
    to = today;
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 364);
    from = start.toISOString().slice(0, 10);
  } else if (!from) {
    const start = new Date(`${to}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 364);
    from = start.toISOString().slice(0, 10);
  } else if (!to) {
    const end = new Date(`${from}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 364);
    to = end.toISOString().slice(0, 10);
  }
  if (from > to || new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`) > 364 * 86400000) {
    return res.status(400).json({ message: 'El rango del reporte debe ser válido y no superar 365 días.' });
  }

  try {
    const ventas = await reportService.getSalesByDate(from, to);

    const descripcion = 'Generó un reporte de ventas';
    await reportService.logReportActivity(descripcion, req.user.id, `${from || 'Inicio'} al ${to || 'hoy'}`);

    res.status(200).json(ventas);
  } catch (error) {
    console.error(`[reports] Error al consultar ventas (${error.code || 'UNKNOWN'}).`);
    res.status(500).json({ message: 'Error al obtener el reporte de ventas' });
  }
};

module.exports = {
  getSalesByDate
};
