import fs from 'fs';
import csv from 'csv-parser';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection setup
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Path to the downloaded CSV file
const CSV_FILE_PATH = '/home/ng/Downloads/Donted to Partner - Sheet3.csv';
async function updateDatabaseFromCsv() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const data = [];

    // Read and parse CSV
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const serial_number = row.serial_number; // Adjust column name as per CSV
        const ngo_name = row.ngo_name; // Adjust column name as per CSV
        if (serial_number && ngo_name) {
          data.push({ serial_number, ngo_name });
        }
      })
      .on('end', async () => {
        console.log('CSV file successfully processed.');

        for (const { serial_number, ngo_name } of data) {
            console.log(`🔹 Updating Serial Number: ${serial_number}, NGO Name: ${ngo_name}`);
          const query = `
            UPDATE sama_clients
            SET ngo_name = $1
            WHERE serial_number = $2;
          `;
          console.log(`Updating database for serial number: ${serial_number}`);
          
          await client.query(query, [ngo_name, serial_number]);
        }

        await client.query('COMMIT');
        console.log('Database updated successfully.');
        client.release();
      });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating database:', error);
    client.release();
  }
}

updateDatabaseFromCsv();
