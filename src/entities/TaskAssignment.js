// src/entities/TaskAssignment.js
const { EntitySchema } = require('typeorm');
const Task = require('./Task');
const Client = require('./Client.mjs');

module.exports = new EntitySchema({
    name: 'TaskAssignment',
    tableName: 'task_assignments',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid',
        },
        status: {
            type: 'varchar',
            default: 'pending',
        },
        output: {
            type: 'text',
            nullable: true,
        },
        assigned_at: {
            type: 'timestamp',
            default: () => 'CURRENT_TIMESTAMP',
        },
        completed_at: {
            type: 'timestamp',
            nullable: true,
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
