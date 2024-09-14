const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors()); 

app.get('/wallpaper', (req, res) => {
    const wallpaperUrl = 'https://images.unsplash.com/photo-1725743537422-b36edd83b46a?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; 
    res.json({ wallpaper_url: wallpaperUrl });
});

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

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalNetworkIP();
    console.log(`Server is running:`);
    console.log(`- Local: http://localhost:${PORT}/wallpaper`);
    console.log(`- Network: http://${localIP}:${PORT}/wallpaper`);
});