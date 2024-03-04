const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    cooldown: 5,
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with the bots current ping!'),
	async execute(interaction) {
		await interaction.reply({content:`Pong! I currently have a ping of ${interaction.client.ws.ping}ms`, ephemeral: true});
		
	},
};