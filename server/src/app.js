import express from 'express';
import cors from 'cors';
import { clientOrigin } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import rfqRoutes from './routes/rfqRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/suppliers', supplierRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use(errorHandler);

export default app;
