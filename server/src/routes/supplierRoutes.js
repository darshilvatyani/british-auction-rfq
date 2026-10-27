import { Router } from 'express';
import { getSuppliers } from '../controllers/supplierController.js';

const router = Router();

router.get('/', getSuppliers);

export default router;
