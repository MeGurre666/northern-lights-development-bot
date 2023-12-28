const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    cooldown: 5,
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('ping2')
		.setDescription('Replies with Pong!2'),
	async execute(interaction) {
		await interaction.reply({content:`I currently have a ping of ${interaction.client.ws.ping}mmmmmmmmmmmmmmmmmmmmm`, ephemeral: true});
	},
};