export function getHealth(_req, res) {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
  });
}
