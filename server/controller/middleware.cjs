#!/usr/bin/env node
const { exec } = require('child_process');

// Helper function to execute system commands
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                reject(error);
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                reject(stderr);
            }
            console.log(`Stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

module.exports = { executeCommand };