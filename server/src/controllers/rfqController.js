import * as rfqService from '../services/rfqService.js';

export async function createRfq(req, res) {
  const result = await rfqService.createRfq(req.body);
  res.location(`/api/rfqs/${result.rfq.id}`).status(201).json(result);
}

export async function getRfqs(_req, res) {
  res.json(await rfqService.getRfqs());
}

export async function getRfq(req, res) {
  res.json(await rfqService.getRfq(req.params.rfqId));
}
