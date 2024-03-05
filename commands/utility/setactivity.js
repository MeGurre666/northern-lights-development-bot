const { SlashCommandBuilder, Application} = require('discord.js');
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
                    {name: 'Playing', value: 'playing'},
                    {name: 'Streaming', value: 'streaming'},
                    {name: 'Listening', value: 'listening'},
                    {name: 'Competing', value: 'competing'},
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('The status of the bot.')
                .setRequired(true)
                .addChoices(
                    {name: 'Online', value: 'online'},
                    {name: 'Idle', value: 'idle'},
                    {name: 'Do Not Disturb', value: 'dnd'},
                    {name: 'Invisible', value: 'invisible'},
                )),
    async execute(interaction) {
        application = await interaction.client.application?.fetch();
        teamMember = application.owner.members;
        if (teamMember.has(interaction.user.id)) {
            const activity = interaction.options.getString('activity', true);
            var activitytype = interaction.options.getString('activitytype', true).toLowerCase();
            const status = interaction.options.getString('status', true);
            activitytype = activitytype.charAt(0).toUpperCase() + activitytype.slice(1);
            try {
                await interaction.client.user.setActivity(activity, { type: ActivityType[activitytype] });
                await interaction.client.user.setStatus(status);
                fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) set the activity to ${activitytype} ${activity}. with the status ${status}\n`);
                await interaction.reply({ content: `Activity set to \`${activitytype} ${activity}\` with the status ${status} !`, ephemeral: true });
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