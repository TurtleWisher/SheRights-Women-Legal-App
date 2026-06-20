// We are bringing in two tools:
// 1. mysql2 - the pipe that connects us to MySQL
// 2. dotenv - the tool that reads our secret .env file
const mysql = require('mysql2');
require('dotenv').config();

// We are now creating the pipe (connection) to our pantry.
// We tell it: which computer is the pantry on? (host)
// What is the username? What is the password? Which database?
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,   
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// We export this pipe so other files can use it
// Think of it as: we built the pipe, now we make it available to the whole kitchen
module.exports = pool.promise();

