const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logPath = path.join(__dirname, '../../logs');
const date = new Date();
const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const logFilePath = path.join(logPath, `${dateStr}.log`);
module.exports = {
	cooldown: 5,
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('For development purposes only')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true)),
	async execute(interaction) {
		const application = await interaction.client.application?.fetch();
		const teamMember = application.owner.members;
		if (teamMember.has(interaction.user.id)) {

			const commandName = interaction.options.getString('command', true).toLowerCase();
			const command = interaction.client.commands.get(commandName);
			if (!command) {
				fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | Command: Reload | ${interaction.user.tag} (${interaction.user.id}) tried to reload ${commandName} but it does not exist.\n`);
				return interaction.reply({content:`There is no command with name \`${commandName}\`!`, ephemeral: true});
				
			}
			const commandPath = path.join(__dirname, '..', command.category, `${command.data.name}.js`);
			delete require.cache[require.resolve(commandPath)];

			try {
				interaction.client.commands.delete(command.data.name);
				const newCommand = require(commandPath);
				interaction.client.commands.set(newCommand.data.name, newCommand);
				await interaction.reply({ content: `Command \`${newCommand.data.name}\` was reloaded!`, ephemeral: true });
				fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | Command: Reload | ${interaction.user.tag} (${interaction.user.id}) reloaded ${commandName}.\n`);
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``,
					ephemeral: true,
				});
				fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | Command: Reload | ${interaction.user.tag} (${interaction.user.id}) recieved an error while reloading ${commandName} | ${error.stack}\n`);
			}
	} else {
		await interaction.reply({content:`You do not have permission to use this command!`, ephemeral: true});
		fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | Command: Reload | ${interaction.user.tag} (${interaction.user.id}) tried to use reload but does not have permission.\n`);
	}
}
};