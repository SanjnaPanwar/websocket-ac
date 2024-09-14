const axios = require('axios');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const downloadWallpaper = async (url, savePath) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(savePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download wallpaper:', error);
    }
};

const setWallpaper = (imagePath) => {
    const command = `gsettings set org.gnome.desktop.background picture-uri 'file://${imagePath}'`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error setting wallpaper: ${error.message}`);
            return;
        }
        console.log(`Wallpaper set successfully: ${imagePath}`);
    });
};

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

(async () => {
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
        } else {
            console.error('Wallpaper URL not found');
        }
    } catch (error) {
        console.error('Failed to fetch wallpaper from server:', error);
    }
})();