const fs = require("fs");
const os = require("os");
const path = require("path");

// Function to create or update a desktop shortcut
const createOrUpdateShortcut = (name, execPath, iconPath, fileName) => {
  return new Promise((resolve, reject) => {
    if (!name || !execPath || !iconPath || !fileName) {
      return reject(new Error("Missing required fields"));
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

    const shortcutPath = path.join(
      os.homedir(),
      "Desktop",
      `${fileName}.desktop`
    );

    fs.writeFile(shortcutPath, desktopEntry, { mode: 0o755 }, (err) => {
      if (err) {
        console.error(
          `Failed to create/update ${name} shortcut on Desktop:`,
          err
        );
        return reject(new Error(`Failed to create/update ${name} shortcut`));
      }
      resolve(`${name} shortcut created/updated successfully on Desktop`);
    });
  });
};

// Function to delete a desktop shortcut
const deleteShortcut = (fileName) => {
  return new Promise((resolve, reject) => {
    if (!fileName) {
      return reject(new Error("File name is required"));
    }

    const shortcutPath = path.join(
      os.homedir(),
      "Desktop",
      `${fileName}.desktop`
    );

    fs.unlink(shortcutPath, (err) => {
      if (err) {
        console.error(
          `Failed to delete ${fileName} shortcut from Desktop:`,
          err
        );
        return reject(
          new Error(`Failed to delete ${fileName} shortcut from Desktop`)
        );
      }
      resolve(`${fileName} shortcut deleted successfully from Desktop`);
    });
  });
};

module.exports = {
  createOrUpdateShortcut,
  deleteShortcut,
};
