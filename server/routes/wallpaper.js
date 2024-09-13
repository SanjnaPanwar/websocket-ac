const express = require('express');
const router = express.Router();
const { handleWallpaperChange } = require('../services/wallpaperService');

// Route to change wallpaper
router.get('/change', async (req, res) => {
    try {
        const message = await handleWallpaperChange();
        res.status(200).json({ message });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change wallpaper', details: error.message });
    }
});

module.exports = router;
