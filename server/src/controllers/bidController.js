import { submitBid } from '../services/bidService.js';

export async function createBid(req, res) {
  const result = await submitBid(req.params.rfqId, req.body);
  res.status(result.replayed ? 200 : 201).json(result);
}
