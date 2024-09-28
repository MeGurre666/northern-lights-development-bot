const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes, WebhookClient, blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
const path = require('path');
const { autocomplete } = require('../bot/dev');
const interactionStateFile = path.join(__dirname, '../../interactionState3.json');
const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

module.exports = {
    cooldown: 5,
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('chatfilter')
        .setDescription('Blacklists a user')
        .setDefaultMemberPermissions(0)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of the chat filter.')
                .addStringOption(option =>
                    option.setName('change')
                        .setDescription('Enable or disable the chat filter.')
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a punishment in the chat filter.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to edit.')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('punishment')
                        .setDescription('The new punishment for the word. with the format of 1s, 1m, 1h, 1d, 1w, 1mo, 1y.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the chat filter list.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bypass')
                .setDescription('Bypass a word in the chat filter.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to bypass.')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName('edit')
                        .setDescription('Add or remove bypass for the word.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        )
                )
                .addMentionableOption(option =>
                    option.setName('roleoruser')
                        .setDescription('The role or user to bypass the word chat filter.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('word')
                .setDescription('Add or remove a word from the chat filter.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to add or remove.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('edit')
                        .setDescription('Add or remove a word from the chat filter.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        )
                )
                .addStringOption(option =>
                    option.setName('punishment')
                        .setDescription('The punishment for the word. with the format of 1s, 1m, 1h, 1d, 1w, 1mo, 1y.')
                        .setRequired(true)
                )
        ),

    async autocomplete(interaction) {
        const connection = await pool.getConnection();
        try {
            const subcommand = interaction.options.getSubcommand();
            const focusedOption = interaction.options.getFocused(true);
            let choices = [];

            if (focusedOption.name === 'word') {
                const [words] = await connection.execute('SELECT word FROM chatfilter');
                const filteredWords = words
                    .map(word => word.word)
                    .filter(word => word.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 25); 
                choices = filteredWords.map(word => ({ name: word.charAt(0).toUpperCase() + word.slice(1), value: word }));
            }

            await interaction.respond(choices);
        } catch (error) {
            console.error(`Error in autocomplete: ${error}`);
        } finally {
            connection.release();
        }
    },

    async execute(interaction) {
        const [permissionscheck] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        let hasPermission = permissionscheck.length > 0 && permissionscheck[0].chat_filter === 1;
        const user = interaction.options.getUser('user');
        
        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const roleIds = member.roles.cache.map(role => role.id);
            if (roleIds.length > 0) {
                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                hasPermission = roleRows.some(row => row.chat_filter === 1);
            }
        }
        if (!hasPermission){
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const subcommand = interaction.options.getSubcommand();
            const application = await interaction.client.application?.fetch();
            const connection = await pool.getConnection();
            if (subcommand === "status") {
                const change = interaction.options.getString('change');
                if (change === null) {
                    const [results] = await connection.execute('SELECT * FROM chatfilter');
                    const [results2] = await connection.execute('SELECT * FROM guilds WHERE id=?', [interaction.guild.id]);
                    if (results2.length > 0) {
                        if (results2[0].chatfilter === 1) {
                            const count = results.length;

                            const embed = new EmbedBuilder()
                                .setTitle('Chat Filter Status')
                                .setDescription('The chat filter is currently enabled.')
                                .addFields({ name: `Currently Filtering for ${count} words`, value: '\nTo disable the chat filter, use the /chatfilter status command with the "disable" option.' })
                                .setColor('#00FF00');
                            return interaction.reply({ embeds: [embed], ephmeral:true });
                        } else {
                            const embed = new EmbedBuilder()
                                .setTitle('Chat Filter Status')
                                .setDescription('The chat filter is currently disabled.')
                                .addFields({ name: 'Status', value: '\nTo enable the chat filter, use the /chatfilter status command with the "enable" option.' })
                                .setColor('#FF0000');
                            return interaction.reply({ embeds: [embed], ephmeral:true });
                        }
                    }
                } else if (change === "enable") {
                    await connection.execute('UPDATE guilds SET chatfilter=1 WHERE id=?', [interaction.guild.id]);
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Status')
                        .setDescription('The chat filter has been enabled.')
                        .setColor('#00FF00');
                    return interaction.reply({ embeds: [embed], ephmeral:true });
                } else if (change === "disable") {
                    await connection.execute('UPDATE guilds SET chatfilter=0 WHERE id=?', [interaction.guild.id]);
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Status')
                        .setDescription('The chat filter has been disabled.')
                        .setColor('#FF0000');
                    return interaction.reply({ embeds: [embed], ephmeral:true });
                }
            } else if (subcommand === "edit") {
                const word = interaction.options.getString('word');
                const punishment = interaction.options.getString('punishment');
                if (!/^\d+(s|m|h|d|w|mo|y)$/.test(punishment)) {
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Edit')
                        .setDescription('The punishment must be in the format of 1s, 1m, 1h, 1d, 1w, 1mo, 1y.')
                        .setColor('#FF0000');
                    return interaction.reply({ embeds: [embed], ephmeral:true });
                }
                const [resultscheck] = await connection.execute('SELECT * FROM chatfilter WHERE word=?', [word]);
                if (resultscheck.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Edit')
                        .setDescription('The word you are trying to edit does not exist in the chat filter.')
                        .setColor('#FF0000');
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                let seconds;
                const value = parseInt(punishment.slice(0, -1));
                const unit = punishment.slice(-1);
                switch (unit) {
                    case 's':
                        seconds = value;
                        break;
                    case 'm':
                        seconds = value * 60;
                        break;
                    case 'h':
                        seconds = value * 3600;
                        break;
                    case 'd':
                        seconds = value * 86400;
                        break;
                    case 'w':
                        seconds = value * 604800;
                        break;
                    case 'mo':
                        seconds = value * 2628000;
                        break;
                    case 'y':
                        seconds = value * 31536000;
                        break;
                    default:
                        seconds = 0;
                }

                await connection.execute('UPDATE chatfilter SET punishment=? WHERE word=?', [seconds, word]);
                const embed = new EmbedBuilder()
                    .setTitle('Chat Filter Edit')
                    .setDescription(`The punishment for the word ${word} has been updated to ${punishment}.`)
                    .setColor('#00FF00');
                interaction.reply({ embeds: [embed], ephemeral: true });
                const guildId = interaction.guild.id;
                const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
                if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
                    try {
                        const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                        if (!webhookClient) {
                            console.log('No webhook found error');
                            return;
                        }
                        const embed5 = new EmbedBuilder()
                            .setTitle('Chat Filter Edit')
                            .setDescription(`The punishment for the word **${word}** has been updated to ${punishment}.`)
                            .addFields({ name: 'Changed By', value: `${interaction.user} | ${interaction.user.id}` })
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                        webhookClient.send({ embeds: [embed5] }).catch(console.error);
                    } catch (error) {
                        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                        fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Settings | Command Section: Global ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                    }
                }
            } else if (subcommand === "view") {
                const [results] = await connection.execute('SELECT * FROM chatfilter');
                const generateEmbed = (page, itemsPerPage, totalPages) => {
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter List')
                        .setDescription('The following words are in the chat filter.')
                        .setColor('#00FF00');
                
                    const start = page * itemsPerPage;
                    const end = start + itemsPerPage;
                    const pageItems = results.slice(start, end);
                
                    for (const row of pageItems) {
                        //make the punishment into a r
                        function formatPunishment(seconds) {
                            const days = Math.floor(seconds / (24 * 3600));
                            seconds %= 24 * 3600;
                            const hours = Math.floor(seconds / 3600);
                            seconds %= 3600;
                            const minutes = Math.floor(seconds / 60);
                            seconds %= 60;
                        
                            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
                        }
                        embed.addFields({ name: row.word, value: `Punishment: ${formatPunishment(row.punishment)}` });
                    }
                
                    embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
                
                    return embed;
                };
                
                // Function to generate buttons for pagination
                const generateButtons = (page, totalPages) => {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );
                };
                
                const itemsPerPage = 25;
                const totalPages = Math.ceil(results.length / itemsPerPage);
                let currentPage = 0;
                
                const message = await interaction.reply({
                    embeds: [generateEmbed(currentPage, itemsPerPage, totalPages)],
                    components: [generateButtons(currentPage, totalPages)],
                    fetchReply: true,
                    ephemeral: true
                });
                
                const collector = message.createMessageComponentCollector({ time: 60000 });
                
                collector.on('collect', async (i) => {
                    if (i.customId === 'prev') {
                        currentPage--;
                    } else if (i.customId === 'next') {
                        currentPage++;
                    }
                
                    await i.update({
                        embeds: [generateEmbed(currentPage, itemsPerPage, totalPages)],
                        components: [generateButtons(currentPage, totalPages)]
                    });
                });
                
                collector.on('end', () => {
                    message.edit({ components: [] });
                });
            } else if (subcommand === "bypass") {
                const word = interaction.options.getString('word');
                const edit = interaction.options.getString('edit');
                const roleoruser = interaction.options.getMentionable('roleoruser');
                const [resultscheck] = await connection.execute('SELECT * FROM chatfilter WHERE word=?', [word]);
                if (resultscheck.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Bypass')
                        .setDescription('The word you are trying to bypass does not exist in the chat filter.')
                        .setColor('#FF0000');
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                if (edit === "add") {
                    await connection.execute('UPDATE chatfilter SET bypass = ? WHERE word = ?', [roleoruser.id, word]);
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Bypass')
                        .setDescription(`The word ${word} has been added to the bypass list for ${roleoruser}.`)
                        .setColor('#00FF00');
                    interaction.reply({ embeds: [embed], ephemeral: true });
                } else if (edit === "remove") {
                    await connection.execute('UPDATE chatfilter SET bypass = NULL WHERE word = ? AND bypass = ?', [word, roleoruser.id]);
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Bypass')
                        .setDescription(`The word ${word} has been removed from the bypass list for ${roleoruser}.`)
                        .setColor('#00FF00');
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } else if (subcommand === "word") {
                const word = interaction.options.getString('word');
                const edit = interaction.options.getString('edit');
                const punishment = interaction.options.getString('punishment');
                if (edit === "add") {
                    if (!/^\d+(s|m|h|d|w|mo|y)$/.test(punishment)) {
                        const embed = new EmbedBuilder()
                            .setTitle('Chat Filter Word')
                            .setDescription('The punishment must be in the format of 1s, 1m, 1h, 1d, 1w, 1mo, 1y.')
                            .setColor('#FF0000');
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                    const [resultscheck] = await connection.execute('SELECT * FROM chatfilter WHERE word=?', [word]);
                    if (resultscheck.length > 0) {
                        const embed = new EmbedBuilder()
                            .setTitle('Chat Filter Word')
                            .setDescription('The word you are trying to add already exists in the chat filter.')
                            .setColor('#FF0000');
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                    let seconds;
                    const value = parseInt(punishment.slice(0, -1));
                    const unit = punishment.slice(-1);
                    switch (unit) {
                        case 's':
                            seconds = value;
                            break;
                        case 'm':
                            seconds = value * 60;
                            break;
                        case 'h':
                            seconds = value * 3600;
                            break;
                        case 'd':
                            seconds = value * 86400;
                            break;
                        case 'w':
                            seconds = value * 604800;
                            break;
                        case 'mo':
                            seconds = value * 2628000;
                            break;
                        case 'y':
                            seconds = value * 31536000;
                            break;
                        default:
                            seconds = 0;
                    }
                    await connection.execute('INSERT INTO chatfilter (word, punishment) VALUES (?, ?)', [word, seconds]);
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Word')
                        .setDescription(`The word ${word} has been added to the chat filter with a punishment of ${punishment}.`)
                        .setColor('#00FF00');
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    const guildId = interaction.guild.id;
                    const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
                    if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
                        try {
                            const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                            if (!webhookClient) {
                                console.log('No webhook found error');
                                return;
                            }
                            const embed5 = new EmbedBuilder()
                                .setTitle('Chat Filter Word')
                                .setDescription(`The word **${word}** has been added to the chat filter with a punishment of ${punishment}.`)
                                .addFields({ name: 'Changed By', value: `${interaction.user} | ${interaction.user.id}` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                            webhookClient.send({ embeds: [embed5] }).catch(console.error);
                        } catch (error) {
                            console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                            fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Settings | Command Section: Global ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                        }
                    }
                } else if (edit === 'remove'){
                    const [resultscheck] = await connection.execute('SELECT * FROM chatfilter WHERE word=?', [word]);
                    if (resultscheck.length === 0) {
                        const embed = new EmbedBuilder()
                            .setTitle('Chat Filter Word')
                            .setDescription('The word you are trying to remove does not exist in the chat filter.')
                            .setColor('#FF0000');
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                    await connection.execute('DELETE FROM chatfilter WHERE word=?', [word]);
                    const embed = new EmbedBuilder()
                        .setTitle('Chat Filter Word')
                        .setDescription(`The word ${word} has been removed from the chat filter.`)
                        .setColor('#00FF00');
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    const guildId = interaction.guild.id;
                    const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
                    if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
                        try {
                            const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                            if (!webhookClient) {
                                console.log('No webhook found error');
                                return;
                            }
                            const embed5 = new EmbedBuilder()
                                .setTitle('Chat Filter Word')
                                .setDescription(`The word **${word}** has been removed from the chat filter.`)
                                .addFields({ name: 'Changed By', value: `${interaction.user} | ${interaction.user.id}` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                            webhookClient.send({ embeds: [embed5] }).catch(console.error);
                        } catch (error) {
                            console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                            fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Settings | Command Section: Global ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                        }
                    }
                }
            }
        }
    }
};