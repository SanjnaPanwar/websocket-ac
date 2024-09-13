#!/usr/bin/env node
const { executeCommand } = require('../controller/middleware.cjs');

// Create a new user account
async function createUser(username, password) {
    try {
        // Linux - Create user with `adduser` and set password with `chpasswd`
        const command = `sudo adduser --disabled-password --gecos "" ${username} && echo "${username}:${password}" | sudo chpasswd`;
        await executeCommand(command);
        console.log(`User '${username}' created successfully.`);
    } catch (error) {
        console.error(`Failed to create user: ${error}`);
    }
}

// Delete a user account
async function deleteUser(username) {
    try {
        // Linux - Delete user with `deluser`
        const command = `sudo deluser ${username}`;
        await executeCommand(command);
        console.log(`User '${username}' deleted successfully.`);
    } catch (error) {
        console.error(`Failed to delete user: ${error}`);
    }
}

// Change password for a user account
async function changeUserPassword(username, newPassword) {
    try {
        // Linux - Change password using `chpasswd`
        const command = `echo "${username}:${newPassword}" | sudo chpasswd`;
        await executeCommand(command);
        console.log(`Password for '${username}' changed successfully.`);
    } catch (error) {
        console.error(`Failed to change password: ${error}`);
    }
}

// Lock a user account
async function lockUserAccount(username) {
    try {
        // Linux - Lock user account using `usermod`
        const command = `sudo usermod --lock ${username}`;
        await executeCommand(command);
        console.log(`User account '${username}' locked successfully.`);
    } catch (error) {
        console.error(`Failed to lock user account: ${error}`);
    }
}


// Unlock a user account
async function unlockUserAccount(username) {
    try {
        // Linux - Unlock user account using `usermod`
        const command = `sudo usermod --unlock ${username}`;
        await executeCommand(command);
        console.log(`User account '${username}' unlocked successfully.`);
    } catch (error) {
        console.error(`Failed to unlock user account: ${error}`);
    }
}

module.exports = { createUser, deleteUser, changeUserPassword, lockUserAccount, unlockUserAccount };

// //AMAZON LINUX SCRIPT --> testuser created successfully
// const { exec } = require('child_process');

// // Helper function to execute shell commands
// function runCommand(command, successMessage, errorMessage) {
//     return new Promise((resolve, reject) => {
//         exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`${errorMessage}: ${stderr}`);
//                 reject(error);
//             } else {
//                 console.log(successMessage);
//                 resolve(stdout);
//             }
//         });
//     });
// }

// // Create a new user
// async function createUser(username, password) {
//     try {
//         // Create a user without a password (will need sudo)
//         await runCommand(
//             `sudo useradd -m -s /bin/bash ${username}`,
//             `User ${username} created successfully.`,
//             `Failed to create user ${username}`
//         );

//         // Set the user's password
//         await runCommand(
//             `echo "${username}:${password}" | sudo chpasswd`,
//             `Password for ${username} set successfully.`,
//             `Failed to set password for ${username}`
//         );
//     } catch (error) {
//         console.error("Error during user creation:", error);
//     }
// }

// // Lock a user account
// async function lockUser(username) {
//     try {
//         await runCommand(
//             `sudo usermod --lock ${username}`,
//             `User ${username} locked successfully.`,
//             `Failed to lock user ${username}`
//         );
//     } catch (error) {
//         console.error("Error during user lock:", error);
//     }
// }

// // Unlock a user account
// async function unlockUser(username) {
//     try {
//         await runCommand(
//             `sudo usermod --unlock ${username}`,
//             `User ${username} unlocked successfully.`,
//             `Failed to unlock user ${username}`
//         );
//     } catch (error) {
//         console.error("Error during user unlock:", error);
//     }
// }

// // Delete a user account
// async function deleteUser(username) {
//     try {
//         await runCommand(
//             `sudo userdel -r ${username}`,
//             `User ${username} deleted successfully.`,
//             `Failed to delete user ${username}`
//         );
//     } catch (error) {
//         console.error("Error during user deletion:", error);
//     }
// }

// // Example usage:
// // Replace 'testuser' and 'password123' with your desired username and password.
// (async () => {
//     const username = 'testuser';
//     const password = 'password123';

//     await createUser(username, password);
//     await lockUser(username);
//     await unlockUser(username);
//     // await deleteUser(username);
// })();
