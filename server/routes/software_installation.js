const express = require('express');
const router = express.Router();
const { installPackage } = require('../services/software_installation');

// Route to install packages using multiple managers
router.post('/install', async (req, res) => {
    try {
        const result = await installPackage();
        if (result.length > 0) {
            res.status(200).send({
                message: 'Packages installed successfully.',
                installedPackages: result,
            });
        } else {
            res.status(400).send({
                message: 'No packages were installed.',
            });
        }
    } catch (error) {
        res.status(500).send({
            message: 'Failed to install packages.',
            error: error.message,
        });
    }
});

module.exports = router;
