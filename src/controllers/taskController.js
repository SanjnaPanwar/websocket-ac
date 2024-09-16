// src/controllers/taskController.js
const { getRepository } = require('typeorm');
const Task = require('../entities/Task');

exports.createTask = async (req, res) => {
    const { name, description, version, script } = req.body;
    const taskRepo = getRepository(Task);

    try {
        const task = taskRepo.create({ name, description, version, script });
        await taskRepo.save(task);
        return res.status(200).json(task);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

exports.getTasks = async (req, res) => {
    const taskRepo = getRepository(Task);

    try {
        const tasks = await taskRepo.find();
        return res.status(200).json(tasks);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

exports.getTaskById = async (req, res) => {
    const taskRepo = getRepository(Task);
    const { id } = req.params;

    try {
        const task = await taskRepo.findOne(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }
        return res.status(200).json(task);
    } catch (error) {
        return res.status(500).json({ error });
    }
};
