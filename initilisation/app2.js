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

  const createTableQuery2 = `
  CREATE TABLE IF NOT EXISTS guilds (
    id varchar(19),
    fa_req BOOLEAN,
    raid_channels TEXT,
    advanced_mod TEXT,
    basic_mod TEXT,
    log_channel TEXT NULL DEFAULT NULL,
    logging_token TEXT NULL DEFAULT NULL,
    logging_id TEXT NULL DEFAULT NULL,
    raid_mode BOOLEAN,
    raid_mode_time TIMESTAMP NULL DEFAULT NULL,
    tickets TEXT,
    dev TEXT,
    PRIMARY KEY (id)
  )
`;
const createTableQuery3 = `
  CREATE TABLE IF NOT EXISTS guilds_bans (
    unique_id varchar(255),
    id varchar(19),
    user_id varchar(19),
    ban_time TIMESTAMP NULL DEFAULT NULL,
    unban_time TIMESTAMP NULL DEFAULT NULL,
    reason VARCHAR(255),
    PRIMARY KEY (unique_id)
  )
`;
const createTableQuery4 = `
  CREATE TABLE IF NOT EXISTS todo_list (
    id varchar(19),
    user_id varchar(19),
    todo VARCHAR(255),
    time VARCHAR(255),
    priority INT,
    PRIMARY KEY (user_id, todo)
  )
`;

const createTableQuery5 = `
  CREATE TABLE IF NOT EXISTS tickets (
    id varchar(19),
    user_id varchar(19),
    ticket_id BIGINT,
    PRIMARY KEY (id, user_id)
  )
`;
const createTableQuery6 = `
  CREATE TABLE IF NOT EXISTS ticket_presets (
    id varchar(19),
    preset_id varchar(19),
    channel_id varchar(19),
    message_id varchar(19),
    roles TEXT,
    PRIMARY KEY (id, preset_id)
  )
`;
const createTableQuery7 = `
  CREATE TABLE IF NOT EXISTS global_ban (
    id varchar(19),
    ban_id varchar(255),
    banned_by BIGINT,
    ban_time TIMESTAMP NULL DEFAULT NULL,
    reason VARCHAR(255),
    PRIMARY KEY (ban_id)
  )
`;
const createTableQuery8 = `
  CREATE TABLE IF NOT EXISTS permissions_discord (
    id varchar(19),
    netg BOOLEAN DEFAULT FALSE,
    net BOOLEAN DEFAULT FALSE,
    blacklist BOOLEAN DEFAULT FALSE,
    rolesync BOOLEAN DEFAULT FALSE,
    kick BOOLEAN DEFAULT FALSE,
    global_kick BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id)
  )
`;
const createTableQuery9 = `
  CREATE TABLE IF NOT EXISTS permissions_role (
    guildid varchar(19),
    id varchar(19),
    permission varchar(5000),
    PRIMARY KEY (id)
  )
`;
const createTableQuery10 = `
  CREATE TABLE IF NOT EXISTS roleconnect (
    id varchar(19),
    roleid varchar(19),
    connected VARCHAR(5000),
    PRIMARY KEY (roleid)
  )
`;
  connection.query(createTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating Users Table:', err);
      return;
    }
    console.log('Users Table created successfully');

    connection.query(createTableQuery2, (err, results) => {
      if (err) {
        console.error('Error creating Guilds Table:', err);
        return;
      }
      console.log('Guilds Table created successfully');

      connection.query(createTableQuery3, (err, results) => {
        if (err) {
          console.error('Error creating Guilds Bans Table:', err);
          return;
        }
        console.log('Guilds Bans Table created successfully');

        connection.query(createTableQuery4, (err, results) => {
          if (err) {
            console.error('Error creating Todo List Table:', err);
            return;
          }
          console.log('Todo List Table created successfully');
          connection.query(createTableQuery5, (err, results) => {
            if (err) {
              console.error('Error creating Current Projects Table:', err);
              return;
            }
            console.log('Current Tickets created successfully');
            connection.query(createTableQuery6, (err, rows) => {
              if (err) throw err;
              console.log('Data received from MySQL:\n');
              console.log(rows);
            });
            connection.query(createTableQuery7, (err, results) => {
              if (err) {
                console.error('Error creating Global Ban Table:', err);
                return;
              }
              console.log('Global Ban Table created successfully');
            });
            connection.query(createTableQuery8, (err, results) => {
              if (err) {
                console.error('Error creating Permissions Table:', err);
                return;
              }
              console.log('Permissions Table created successfully');
            });
            connection.query(createTableQuery9, (err, results) => {
              if (err) {
                console.error('Error creating Permissions Table:', err);
                return;
              }
              console.log('Permissions Table created successfully');
            });
            connection.query(createTableQuery10, (err, results) => {
              if (err) {
                console.error('Error creating Permissions Table:', err);
                return;
              }
              console.log('Permissions Table created successfully');
            });
            connection.end();
          });
        });
      });
    });
  });
});