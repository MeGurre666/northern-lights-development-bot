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
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | The command at ${filePath} is missing a required "data" or "execute" property.\n`);
		}
	}
}
const rest = new REST().setToken(token);
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
		fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | Started refreshing ${commands.length} application (/) commands.\n`);

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
		fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | Successfully reloaded ${commands.length} application (/) commands.\n`);
    } catch (error) {
        console.error(error);
    }
})();
const manager = new ShardingManager('./bot.js', { token: token });
manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();