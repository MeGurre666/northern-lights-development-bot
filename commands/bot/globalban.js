const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 5,
    category: 'guild',
    data: new SlashCommandBuilder()
        .setName('globalban')
        .setDescription('Bans a user from all servers the bot is in.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban.')
                .setRequired(true)),
    async execute(interaction) {
        const application = await interaction.client.application?.fetch();
        const teamMember = application.owner.members;
        const reason = interaction.options.getString('reason', true);
        if (teamMember.has(interaction.user.id)) {
            const user = interaction.options.getUser('user', true);
            const guilds = interaction.client.guilds.cache;
            const bannedGuilds = [];
            for (const [guildId, guild] of guilds) {
                try {
                    await guild.members.ban(user.id, { reason: `Global Ban by ${interaction.user.username} for the reason: ${reason}` });
                    bannedGuilds.push(guild.name);
                } catch (error) {
                    console.error(`Failed to ban user ${user.tag} from guild ${guild.name}: ${error.message}`);
                }
            }
            interaction.reply({ content: `Banned ${user.tag} from ${bannedGuilds.length} guilds.`, ephemeral: true });
        }
    }
};
