const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events} = require('discord.js');
const { token, all_logs } = require('./config.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.commands = new Collection();
client.cooldowns = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		const { cooldowns } = client;
		client.once(event.name, (...args) => event.execute(...args, cooldowns));
	} else {
		const { cooldowns } = client;
		client.on(event.name, (...args) => event.execute(...args, cooldowns));
	}
}

const logPath = path.join(__dirname, 'logs');
if (!fs.existsSync(logPath)) {
	fs.mkdirSync(logPath);
}
var date = new Date();
var dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
var logFilePath = path.join(logPath, `${dateStr}.log`);
if (!fs.existsSync(logFilePath)) {
	fs.writeFileSync(logFilePath, '');
}
setInterval(() => {
	var date = new Date();
	var newdateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
	if (dateStr !== newdateStr) {
		logFilePath = path.join(logPath, `${newdateStr}.log`);
		const channel01 = client.channels.cache.get(all_logs);
		if (channel01) {
			channel01.send({files: [logFilePath]});
		} else {
			console.error(`The channel with ID ${all_logs} was not found.`);
		}
		dateStr = newdateStr;
		logFilePath = path.join(logPath, `${dateStr}.log`);
		fs.writeFileSync(logFilePath, '');
		fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | New Log File Created\n`);
	}
}, 1000);
client.on(Events.Debug, message => {
	fs.appendFileSync(logFilePath, `[DEBUG] ${new Date().toLocaleTimeString()} | ${message}\n`);
})
client.on(Events.Warn, message => {
	fs.appendFileSync(logFilePath, `[WARN] ${new Date().toLocaleTimeString()} | ${message}\n`);
})
client.on(Events.Error, message => {
	fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | ${message}\n`);
})
function formatUptime(uptime) {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
setInterval(() => {
	const currentTime = new Date().toLocaleTimeString();
	const memoryUsage = process.memoryUsage();
	const heapUsedInMB = (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2);
	const heapTotalInMB = (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2);
	fs.appendFileSync(logFilePath, `[MEMORY] ${currentTime} | ${heapUsedInMB} MB out of ${heapTotalInMB} MB\n`);
	const cpuUsage = process.cpuUsage();
	const cpuUsageInMS = (cpuUsage.user + cpuUsage.system) / 1000000;
	const cpuUsagePercent = (cpuUsageInMS / 1000 * 100).toFixed(2);
	fs.appendFileSync(logFilePath, `[CPU] ${currentTime} |  ${cpuUsagePercent} % used\n`)
	var uptime = process.uptime();
	uptime = Math.floor(uptime * 1000);
	uptime = formatUptime(uptime);
	fs.appendFileSync(logFilePath, `[UPTIME] ${currentTime} | ${uptime}\n`);
}, 600000);



client.login(token);