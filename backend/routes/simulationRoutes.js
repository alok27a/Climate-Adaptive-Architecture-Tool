import express from 'express';
import simulationController from '../controllers/simulationController.js';

const router = express.Router();

router.post('/simulations', simulationController.runSimulation);

export default router;
