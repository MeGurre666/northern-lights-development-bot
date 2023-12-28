const { SlashCommandBuilder } = require('discord.js');

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
				return interaction.reply({content:`There is no command with name \`${commandName}\`!`, ephemeral: true});
			}
			const path = require('path');
			const commandPath = path.join(__dirname, '..', command.category, `${command.data.name}.js`);
			delete require.cache[require.resolve(commandPath)];

			try {
				interaction.client.commands.delete(command.data.name);
				const newCommand = require(commandPath);
				interaction.client.commands.set(newCommand.data.name, newCommand);
				await interaction.reply({ content: `Command \`${newCommand.data.name}\` was reloaded!`, ephemeral: true });
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``,
					ephemeral: true,
				});
			}

	} else {
		await interaction.reply({content:`You do not have permission to use this command!`, ephemeral: true});
	}
}
};