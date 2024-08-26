const { Events, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            const logPath = path.join(__dirname, '../logs');
            const date = new Date();
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            const logFilePath = path.join(logPath, `${dateStr}.log`);

            if (interaction.isCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
                }
                if (command.guildOnly && !interaction.inGuild()) {
                    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
                }
                if (!interaction.client.cooldowns.has(command.data.name)) {
                    interaction.client.cooldowns.set(command.data.name, new Collection());
                }
                const now = Date.now();
                const timestamps = interaction.client.cooldowns.get(command.data.name);
                const cooldownAmount = (command.cooldown ?? 3) * 1000;
                const application = await interaction.client.application?.fetch();
                const teamMember = application.owner.members;
                const isApplicationMember = teamMember.has(interaction.user.id);
                if (!isApplicationMember && timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return interaction.reply({ content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`, ephemeral: true });
                    }
                }
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
                await command.execute(interaction);
            } else if (interaction.isAutocomplete()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`No autocomplete command matching ${interaction.commandName} was found.`);
                    return interaction.respond([]);
                }
                await command.autocomplete(interaction);
            }
        } catch (error) {
            console.error('Error executing interaction:', error);
            await interaction.reply({ content: 'An error occurred while processing this interaction.', ephemeral: true });
            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | ${error.stack}\n`);
        }
    },
};
