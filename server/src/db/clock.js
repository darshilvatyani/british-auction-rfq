export async function getDatabaseTime(client) {
  const result = await client.query('SELECT clock_timestamp() AS time');
  return result.rows[0].time;
}
