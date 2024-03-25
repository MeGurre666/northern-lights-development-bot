const { SlashCommandBuilder, Application } = require('discord.js');;
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '../../logs');
const date = new Date();
const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const logFilePath = path.join(logPath, `${dateStr}.log`);
module.exports = {
    cooldown: 5,
	category: 'bot',
	data: new SlashCommandBuilder()
		.setName('restart')
		.setDescription('Restart the bot! (We recommend not using this command as unforeseen issues may occur.)'),
	async execute(interaction) {
        const application = await interaction.client.application?.fetch();
		const teamMember = application.owner.members;
		if (teamMember.has(interaction.user.id)) {
            await interaction.reply({content:`Restarting...`, ephemeral: true});
            fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | Command: Restart | ${interaction.user.tag} (${interaction.user.id}) restarted the bot.\n`);
            const commandFolders = fs.readdirSync(path.join(__dirname, '../..', 'commands'));
            for (const folder of commandFolders) {
                const commandsPath = path.join(__dirname, '../..', 'commands', folder);
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        interaction.client.commands.set(command.data.name, command);
                    } else {
                        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                        fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | The command at ${filePath} is missing a required "data" or "execute" property.\n`);
                    }
                }
            }


        } else {
            await interaction.reply({content:`You do not have permission to use this command!`, ephemeral: true});
            fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | Command: Restart | ${interaction.user.tag} (${interaction.user.id}) tried to use restart but does not have permission.\n`);
        }
		
	},
};