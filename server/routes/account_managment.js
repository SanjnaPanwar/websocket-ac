const express = require('express');
const router = express.Router();
const { createUser, deleteUser, changeUserPassword, lockUserAccount, unlockUserAccount } = require('../services/account_managment');

// Route to create a new user
router.post('/create', async (req, res) => {
    const { username, password } = req.body;
    try {
        await createUser(username, password);
        res.status(200).send(`User '${username}' created successfully.`);
    } catch (error) {
        res.status(500).send(`Failed to create user: ${error.message}`);
    }
});

// Route to delete a user
router.delete('/delete', async (req, res) => {
    const { username } = req.body;
    try {
        await deleteUser(username);
        res.status(200).send(`User '${username}' deleted successfully.`);
    } catch (error) {
        res.status(500).send(`Failed to delete user: ${error.message}`);
    }
});

// Route to change a user's password
router.put('/change-password', async (req, res) => {
    const { username, newPassword } = req.body;
    try {
        await changeUserPassword(username, newPassword);
        res.status(200).send(`Password for '${username}' changed successfully.`);
    } catch (error) {
        res.status(500).send(`Failed to change password: ${error.message}`);
    }
});

// Route to lock a user account
router.put('/lock', async (req, res) => {
    const { username } = req.body;
    try {
        await lockUserAccount(username);
        res.status(200).send(`User account '${username}' locked successfully.`);
    } catch (error) {
        res.status(500).send(`Failed to lock user account: ${error.message}`);
    }
});

// Route to unlock a user account
router.put('/unlock', async (req, res) => {
    const { username } = req.body;
    try {
        await unlockUserAccount(username);
        res.status(200).send(`User account '${username}' unlocked successfully.`);
    } catch (error) {
        res.status(500).send(`Failed to unlock user account: ${error.message}`);
    }
});

module.exports = router;
