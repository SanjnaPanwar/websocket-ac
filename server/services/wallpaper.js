const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const executeCommand = require('../controller/middleware.cjs');

// Download the wallpaper from a URL and save it to the local filesystem
const downloadWallpaper = async (url, savePath) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(savePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download wallpaper:', error);
        throw error;
    }
};

// Set the wallpaper based on the current desktop environment
const setWallpaper = (imagePath) => {
    const desktopSession = process.env.DESKTOP_SESSION || 'unknown';
    console.log(`Detected desktop session: ${desktopSession}`);
    let command = '';

    if (desktopSession.includes('gnome') || desktopSession === 'ubuntu') {
        // GNOME desktops (including Ubuntu 23+)
        command = `gsettings set org.gnome.desktop.background picture-uri 'file://${imagePath}'`;
    } else if (desktopSession.includes('unity')) {
        // Unity desktop (older Ubuntu versions)
        command = `gsettings set org.gnome.desktop.background picture-uri 'file://${imagePath}'`;
    } else if (desktopSession.includes('xfce')) {
        // XFCE desktop
        command = `xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/last-image -s "${imagePath}"`;
    } else {
        console.error(`Unsupported desktop environment: ${desktopSession}. Please add support for it.`);
        return;
    }

    executeCommand(command);
};

// Fetch the local network IP
const getLocalNetworkIP = () => {
    const interfaces = os.networkInterfaces();
    for (let iface in interfaces) {
        for (let alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
};

// Main logic for downloading and setting the wallpaper
const handleWallpaperChange = async () => {
    const wallpaperSavePath = path.join(__dirname, 'current_wallpaper.jpg');
    const localNetworkIP = getLocalNetworkIP();
    const serverUrl = `http://${localNetworkIP}:5001/wallpaper`;

    console.log(`Using network IP for server: ${serverUrl}`);

    try {
        const response = await axios.get(serverUrl);
        const wallpaperUrl = response.data.wallpaper_url;

        if (wallpaperUrl) {
            await downloadWallpaper(wallpaperUrl, wallpaperSavePath);
            setWallpaper(wallpaperSavePath);
            return 'Wallpaper updated successfully';
        } else {
            throw new Error('Wallpaper URL not found');
        }
    } catch (error) {
        console.error('Failed to fetch wallpaper from server:', error);
        throw error;
    }
};

module.exports = {
    handleWallpaperChange,
};
