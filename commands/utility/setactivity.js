const { SlashCommandBuilder, Application } = require('discord.js');
const { ActivityType } = require('discord.js');
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
        .setName('setactivity')
        .setDescription('Set the bot\'s activity!')
        .addStringOption(option =>
            option.setName('activity')
                .setDescription('The activity to set.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('activitytype')
                .setDescription('The activity type to set.')
                .setRequired(true)
                .addChoices(
                    {name: 'Playing', value: 'Playing'},
                    {name: 'Streaming', value: 'Streaming'},
                    {name: 'Listening', value: 'Listening'},
                    {name: 'Watching', value: 'Watching'},
                    {name: 'Competing', value: 'Competing'},
                )),
    async execute(interaction) {
        application = await interaction.client.application?.fetch();
        teamMember = application.owner.members;
        if (teamMember.has(interaction.user.id)) {
            const activity = interaction.options.getString('activity', true);
            var activitytype = interaction.options.getString('activitytype', true).toLowerCase();
            activitytype = activitytype.charAt(0).toUpperCase() + activitytype.slice(1);
            try {
                await interaction.client.user.setActivity(activity, { type: ActivityType[activitytype] });
                await interaction.reply({ content: `Activity set to \`${activitytype} ${activity}\`!`, ephemeral: true });
                fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) set the activity to ${activitytype} ${activity}.\n`); 
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `There was an error while setting the activity to \`${activity}\`:\n\`${error.message}\``,
                    ephemeral: true,
                });
                fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | Command: SetActivity | ${interaction.user.tag}(${interaction.user.id}) recieved an error while setting the activity to ${activitytype} ${activity} | ${error.stack}\n`);
            }
        } else {
            await interaction.reply({content:`You do not have permission to use this command!`, ephemeral: true});
            fs.appendFileSync(logFilePath, `[NOTICE] ${new Date().toLocaleTimeString()} | Command: SetActivity | ${interaction.user.tag} (${interaction.user.id}) tried to use setactivity but does not have permission.\n`);
        }
    }
};