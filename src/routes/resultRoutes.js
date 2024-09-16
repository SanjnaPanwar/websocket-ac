// src/routes/resultRoutes.js
const express = require('express');
const { submitResult, getResults, getResultById } = require('../controllers/resultController');

const router = express.Router();

router.post('/', submitResult);
router.get('/', getResults);
router.get('/:id', getResultById);

module.exports = router;
