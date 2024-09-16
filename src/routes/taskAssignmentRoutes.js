// src/routes/taskAssignmentRoutes.js
const express = require('express');
const { assignTask, getAssignments, getAssignmentById } = require('../controllers/taskAssignmentController');

const router = express.Router();

router.post('/assign', assignTask);
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);

module.exports = router;
