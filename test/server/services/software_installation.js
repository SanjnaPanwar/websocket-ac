const { executeCommand } = require("../controller/middleware.cjs");

// Modified installPackage function
async function installPackage() {
  const managers = ["apt", "pip", "npm"];
  let installedPackages = [];

  for (let manager of managers) {
    let command;
    try {
      if (manager === "apt") {
        command = `sudo apt-get install python3-pip npm -y`; // apt installs pip and npm
        await executeCommand(command);
        installedPackages.push({ manager });
      } else if (manager === "pip") {
        command = `pip install --upgrade pip`; // Upgrade pip if it's already installed
        await executeCommand(command);
        installedPackages.push({ manager });
      } else if (manager === "npm") {
        command = `npm install -g npm`; // Globally install/upgrade npm
        await executeCommand(command);
        installedPackages.push({ manager });
      }
    } catch (error) {
      console.error(
        `Failed to install ${manager}. Skipping to next manager...`
      );
    }
  }

  if (installedPackages.length === 0) {
    throw new Error(`Failed to install using all package managers.`);
  }

  return installedPackages;
}

module.exports = {
  installPackage,
};
