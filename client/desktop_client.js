const axios = require('axios');

const manageShortcut = async (serverUrl, appDetails) => {
    try {
        const response = await axios.post(`${serverUrl}/shortcut`, appDetails);
        console.log(response.data.message);
    } catch (error) {
        console.error('Failed to manage shortcut:', error);
    }
};

const deleteShortcut = async (serverUrl, fileName) => {
    try {
        const response = await axios.delete(`${serverUrl}/shortcut`, { data: { fileName } });
        console.log(response.data.message);
    } catch (error) {
        console.error('Failed to delete shortcut:', error);
    }
};

(async () => {
    const serverUrl = `http://localhost:5000`;

    const vscodeDetails = {
        name: "Visual Studio Code",
        execPath: "/usr/bin/code --no-sandbox",
        iconPath: "vscode",
        fileName: "visual-studio-code"
    };

    // create or update the VS Code shortcut
    await manageShortcut(serverUrl, vscodeDetails);

    // delete the VS Code shortcut
    // await deleteShortcut(serverUrl, vscodeDetails.fileName);
})();