const { ShardingManager } = require('discord.js');
const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const logPath = path.join(__dirname, 'logs');
var date = new Date();
var dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
var logFilePath = path.join(logPath, `${dateStr}.log`);
if (!fs.existsSync(logFilePath)) {
	fs.writeFileSync(logFilePath, '');
}
const rest = new REST().setToken(token);
const manager = new ShardingManager('./bot.js', { token: token });
manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();