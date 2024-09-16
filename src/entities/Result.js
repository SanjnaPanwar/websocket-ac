// src/entities/Result.js
const { EntitySchema } = require('typeorm');
const Task = require('./Task');
const Client = require('./Client.mjs');

module.exports = new EntitySchema({
    name: 'Result',
    tableName: 'results',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid',
        },
        result: {
            type: 'text',
        },
        success: {
            type: 'boolean',
            default: false,
        },
        timestamp: {
            type: 'timestamp',
            default: () => 'CURRENT_TIMESTAMP',
        },
    },
    relations: {
        task: {
            target: 'Task',
            type: 'many-to-one',
            eager: true,
            joinColumn: { name: 'task_id' },
        },
        client: {
            target: 'Client',
            type: 'many-to-one',
            eager: true,
            joinColumn: { name: 'client_id' },
        },
    },
});
