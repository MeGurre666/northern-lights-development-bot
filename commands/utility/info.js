const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { version } = require('../../config.json');

module.exports = {
    cooldown: 5,
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Replies with information about the bot!'),
    async execute(interaction) {
        const application = await interaction.client.application?.fetch();
        const uptime = formatUptime(interaction.client.uptime);
        const embed = new EmbedBuilder()
            .setTitle('Bot Information')
            .setDescription('Here is some information about the bot!')
            .setThumbnail(application.iconURL({ dynamic: true }))
            .setColor('#037bfc')
            .addFields(
                { name: 'Bot Name', value: `<@!${application.id}>` },
                { name: "Team Members", value: `${application.owner.members.map(member => member.user.tag).join('\n')}`},
                { name: "Bot Uptime", value: `${uptime}`},
                { name: "Amount of Servers", value: `${interaction.client.guilds.cache.size}`},
                {name: 'Version', value: `${version}`},
            )
            .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};

function formatUptime(uptime) {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
