const { Events, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');


module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const logPath = path.join(__dirname, '../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            fs.appendFileSync(logFilePath, `[WARNING] ${new Date().toLocaleTimeString()} | No command matching ${interaction.commandName} was found.\n`);
            return;
        } 

        const application = await interaction.client.application?.fetch();
        const isTeamMember = application.owner.members.has(interaction.user.id);

        if (!isTeamMember) {
            const { cooldowns } = interaction.client;

            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }
            
            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 3;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;
            
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) tried to use ${command.data.name} but is on cooldown until ${expiredTimestamp}.\n`);
                    return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
                }
            }
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | ${error.stack}\n`);
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | ${error.stack}\n`);
            }
        }
    },
};