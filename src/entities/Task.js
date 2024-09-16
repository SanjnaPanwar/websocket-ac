// src/entities/Task.js
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Task',
    tableName: 'tasks',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid',
        },
        name: {
            type: 'varchar',
        },
        description: {
            type: 'text',
        },
        version: {
            type: 'varchar',
        },
        script: {
            type: 'text',
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
        },
        updated_at: {
            type: 'timestamp',
            updateDate: true,
        },
    },
});

