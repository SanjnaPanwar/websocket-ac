// src/controllers/taskAssignmentController.js
const { getRepository } = require('typeorm');
const TaskAssignment = require('../entities/TaskAssignment');

exports.assignTask = async (req, res) => {
    const { task_id, client_id } = req.body;
    const taskAssignmentRepo = getRepository(TaskAssignment);

    try {
        const taskAssignment = taskAssignmentRepo.create({
            task: { id: task_id },
            client: { id: client_id },
        });
        await taskAssignmentRepo.save(taskAssignment);
        return res.status(200).json(taskAssignment);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

exports.getAssignments = async (req, res) => {
    const taskAssignmentRepo = getRepository(TaskAssignment);

    try {
        const assignments = await taskAssignmentRepo.find();
        return res.status(200).json(assignments);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

exports.getAssignmentById = async (req, res) => {
    const taskAssignmentRepo = getRepository(TaskAssignment);
    const { id } = req.params;

    try {
        const assignment = await taskAssignmentRepo.findOne(id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found.' });
        }
        return res.status(200).json(assignment);
    } catch (error) {
        return res.status(500).json({ error });
    }
};
