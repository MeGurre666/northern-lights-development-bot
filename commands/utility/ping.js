const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    cooldown: 5,
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with the bots current ping!'),
	async execute(interaction) {
		await interaction.reply({content:`I currently have a ping of ${interaction.client.ws.ping}ms ${afafaf}`, ephemeral: true});
		
	},
};