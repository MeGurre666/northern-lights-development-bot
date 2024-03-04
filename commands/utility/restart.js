const { SlashCommandBuilder, Application } = require('discord.js');;
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '../../logs');
const date = new Date();
const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const logFilePath = path.join(logPath, `${dateStr}.log`);
module.exports = {
    cooldown: 5,
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('restart')
		.setDescription('Restart the bot! (We recommend not using this command as unforeseen issues may occur.)'),
	async execute(interaction) {
        const application = await interaction.client.application?.fetch();
		const teamMember = application.owner.members;
		if (teamMember.has(interaction.user.id)) {
            await interaction.reply({content:`Restarting...`, ephemeral: true});
            fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | Command: Restart | ${interaction.user.tag} (${interaction.user.id}) restarted the bot.\n`);
            process.exit();
        } else {
            await interaction.reply({content:`You do not have permission to use this command!`, ephemeral: true});
            fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | Command: Restart | ${interaction.user.tag} (${interaction.user.id}) tried to use restart but does not have permission.\n`);
        }
		
	},
};