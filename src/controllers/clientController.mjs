import { getRepository } from 'typeorm';
import Client from '../entities/Client.mjs'; // Ensure this file is also using ES module syntax

export const registerClient = async (req, res) => {
    const { name, location } = req.body;
    const clientRepo = getRepository(Client);

    try {
        const existingClient = await clientRepo.findOne({ where: { name } });
        if (existingClient) {
            return res.status(400).json({ message: 'Client already exists.' });
        }

        const client = clientRepo.create({ name, location, status: 'online', last_seen: new Date() });
        await clientRepo.save(client);
        return res.status(200).json(client);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

export const getClients = async (req, res) => {
    const clientRepo = getRepository(Client);

    try {
        const clients = await clientRepo.find();
        return res.status(200).json(clients);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

export const getClientById = async (req, res) => {
    const clientRepo = getRepository(Client);
    const { id } = req.params;

    try {
        const client = await clientRepo.findOne(id);
        if (!client) {
            return res.status(404).json({ message: 'Client not found.' });
        }
        return res.status(200).json(client);
    } catch (error) {
        return res.status(500).json({ error });
    }
};
