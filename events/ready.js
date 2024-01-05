const { Events } = require('discord.js');
const { ActivityType } = require('discord.js');
const {activity, type, status} = require('../config.json');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity(activity, { type: ActivityType[type] });
		client.user.setStatus(status);
	},
};