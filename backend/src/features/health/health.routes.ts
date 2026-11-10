import { Router } from 'express';
import { healthCheck } from './health.controller.js';


const router = Router();

// Mount directly to /healthz
router.get('/health', healthCheck);

export { router as healthRouter };