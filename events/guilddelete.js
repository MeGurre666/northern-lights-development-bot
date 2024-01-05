const { Events } = require('discord.js');
const { ActivityType } = require('discord.js');
const {activity, type, status} = require('../config.json');

module.exports = {
	name: Events.GuildDelete,
	once: true,
	execute(guild) {
		console.log(`Left ${guild.name}!`);
	},
};