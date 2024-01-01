const mysql = require('mysql2');
const {database_name}= require('../config.json');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
});
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
  const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS ${database_name}`;
  connection.query(createDatabaseQuery, (err, results) => {
    if (err) {
      console.error('Error creating database:', err);
      return;
    }
    console.log('Database created successfully');
  });
  connection.end();
});
