// src/controllers/resultController.js
const { getRepository } = require('typeorm');
const Result = require('../entities/Result');

exports.submitResult = async (req, res) => {
    const { result, success, task_id, client_id } = req.body;
    const resultRepo = getRepository(Result);

    try {
        const resultEntry = resultRepo.create({
            result,
            success,
            task: { id: task_id },
            client: { id: client_id },
        });
        await resultRepo.save(resultEntry);
        return res.status(200).json(resultEntry);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

exports.getResults = async (req, res) => {
    const resultRepo = getRepository(Result);

    try {
        const results = await resultRepo.find();
        return res.status(200).json(results);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

exports.getResultById = async (req, res) => {
    const resultRepo = getRepository(Result);
    const { id } = req.params;

    try {
        const result = await resultRepo.findOne(id);
        if (!result) {
            return res.status(404).json({ message: 'Result not found.' });
        }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error });
    }
};
