const express = require('express');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/shortcut', (req, res) => {
    const { name, execPath, iconPath, fileName } = req.body;

    if (!name || !execPath || !iconPath || !fileName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const desktopEntry = `
[Desktop Entry]
Version=1.0
Type=Application
Name=${name}
Exec=${execPath}
Icon=${iconPath}
Categories=Development;
Terminal=false
`;

    const shortcutPath = `${os.homedir()}/Desktop/${fileName}.desktop`;

    fs.writeFile(shortcutPath, desktopEntry, { mode: 0o755 }, (err) => {
        if (err) {
            console.error(`Failed to create/update ${name} shortcut on Desktop:`, err);
            return res.status(500).json({ error: `Failed to create/update ${name} shortcut` });
        }
        res.json({ message: `${name} shortcut created/updated successfully on Desktop` });
    });
});

app.delete('/shortcut', (req, res) => {
    const { fileName } = req.body;

    if (!fileName) {
        return res.status(400).json({ error: 'File name is required' });
    }

    const shortcutPath = `${os.homedir()}/Desktop/${fileName}.desktop`;

    fs.unlink(shortcutPath, (err) => {
        if (err) {
            console.error(`Failed to delete ${fileName} shortcut from Desktop:`, err);
            return res.status(500).json({ error: `Failed to delete ${fileName} shortcut from Desktop` });
        }
        res.json({ message: `${fileName} shortcut deleted successfully from Desktop` });
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});