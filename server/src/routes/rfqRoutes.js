import { Router } from 'express';
import { createRfq, getRfq, getRfqs } from '../controllers/rfqController.js';
import { createBid } from '../controllers/bidController.js';
import { getBids, getActivities } from '../controllers/rfqHistoryController.js';

const router = Router();

router.post('/', createRfq);
router.get('/', getRfqs);
router.get('/:rfqId', getRfq);
router.post('/:rfqId/bids', createBid);
router.get('/:rfqId/bids', getBids);
router.get('/:rfqId/activities', getActivities);

export default router;
