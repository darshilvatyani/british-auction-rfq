import * as historyService from '../services/rfqHistoryService.js';

export async function getBids(req, res) {
  res.json(await historyService.getBids(req.params.rfqId));
}

export async function getActivities(req, res) {
  res.json(await historyService.getActivities(req.params.rfqId));
}
