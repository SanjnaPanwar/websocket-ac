
const express = require('express');
const router = express.Router();
const { createOrUpdateShortcut, deleteShortcut } = require('../services/shortcutService');

// Route to create or update a desktop shortcut
router.post('/create', async (req, res) => {
    const { name, execPath, iconPath, fileName } = req.body;

    try {
        const message = await createOrUpdateShortcut(name, execPath, iconPath, fileName);
        res.status(200).json({ message });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route to delete a desktop shortcut
router.delete('/delete', async (req, res) => {
    const { fileName } = req.body;

    try {
        const message = await deleteShortcut(fileName);
        res.status(200).json({ message });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
