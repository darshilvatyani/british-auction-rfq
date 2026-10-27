import { listSuppliers } from '../db/supplierQueries.js';

export async function getSuppliers(_req, res) {
  const suppliers = await listSuppliers();
  res.json({ suppliers, serverTime: new Date().toISOString() });
}
