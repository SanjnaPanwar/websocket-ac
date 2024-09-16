// src/ormconfig.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    entities: [
        require('./entities/Client.mjs'),
        require('./entities/Task'),
        require('./entities/TaskAssignment'),
        require('./entities/Result')
    ],
    synchronize: true,  // Disable in production and use migrations
    logging: false,
};
