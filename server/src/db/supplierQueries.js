import pool from './pool.js';

export async function listSuppliers() {
  const result = await pool.query('SELECT id, code, name FROM suppliers ORDER BY code');
  return result.rows;
}

export async function findSupplierById(id, client) {
  const result = await client.query('SELECT id, code, name FROM suppliers WHERE id = $1', [id]);
  return result.rows[0];
}
