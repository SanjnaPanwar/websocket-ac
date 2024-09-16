// src/routes/clientRoutes.js
import express from 'express';
const router = express.Router();
import { registerClient, getClients, getClientById } from '../controllers/clientController.mjs'; // Use ES module syntax for imports


router.post('/register', registerClient);
router.get('/', getClients);
router.get('/:id', getClientById);

export { router as clientRoutes };
