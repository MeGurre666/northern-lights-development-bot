const mysql = require('mysql');
const {database_name}= require('../config.json');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: database_name,
});
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      secret VARCHAR(255),
      validate BOOLEAN,
      setup_time TIMESTAMP
    )
  `;
  connection.query(createTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Table created successfully');
    connection.end();
  });
});
