const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, Application } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit, issuer } = require('../../config.json');

const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

module.exports = {
    cooldown: 5,
    category: 'bot',
    data: new SlashCommandBuilder()
        .setName('displayguild')
        .setDescription('Display selected guild row in the database!')
        .addStringOption(option =>
            option.setName('guild')
                .setDescription('The guild you want to display. Development purposes only!')
                .setRequired(true)),
    async execute(interaction) {
        const application = await interaction.client.application?.fetch();
		const teamMember = application.owner.members;
		if (teamMember.has(interaction.user.id)) {

            const guildId = interaction.options.getString('guild');
            const connection = await pool.getConnection();
            const query = 'SELECT * FROM guilds WHERE guild_id = ?';
            const [results] = await connection.execute(query, [guildId], error => {
                if (error) {
                    console.error('Error:', error);
                    return null;
                }
            });
            if (results.length === 0) {
                await interaction.reply({ content: `There is no guild with the id \`${guildId}\`!`, ephemeral: true });
                return;
            }
            const fields = [];
            const keys = Object.keys(results[0]);
            for (const key of keys) {
                fields.push({ name: key, value: results[0][key] });
            }
            const embed = new EmbedBuilder()
                .setTitle(`Table: Guilds`)
            for (let i = 0; i < results.length; i++)
                embed.addFields({ name: `Row: ${guildId}`, value: fields.map(field => `${field.name}: ${field.value}`).join('\n') });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};