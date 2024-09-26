const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, WebhookClient } = require('discord.js');
const { token, all_logs, database_name, database_host, database_password, database_user, connection_limit } = require('./config.json');
const { createPool } = require('mysql2/promise');

const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

// Ensure GuildMembers intent is enabled
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] });

client.commands = new Collection();
client.cooldowns = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    console.log(`Loading event ${file}`);
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        const { cooldowns } = client;
        client.once(event.name, (...args) => event.execute(...args, cooldowns));
    } else {
        const { cooldowns } = client;
        client.on(event.name, (...args) => event.execute(...args, cooldowns));
    }
}

const logPath = path.join(__dirname, 'logs');
if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath);
}
var date = new Date();
var dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
var logFilePath = path.join(logPath, `${dateStr}.log`);
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
}
setInterval(() => {
    var date = new Date();
    var newdateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    if (dateStr !== newdateStr) {
        logFilePath = path.join(logPath, `${newdateStr}.log`);
        const channel01 = client.channels.cache.get('1191501717389459456');
        if (channel01) {
            channel01.send({ files: [logFilePath] });
        } else {
            console.error(`The channel with ID ${all_logs} was not found.`);
        }
        dateStr = newdateStr;
        logFilePath = path.join(logPath, `${dateStr}.log`);
        fs.writeFileSync(logFilePath, '');
        fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | New Log File Created\n`);
    }
}, 1000);

client.on(Events.Debug, message => {
    try{
    fs.appendFileSync(logFilePath, `[DEBUG] ${new Date().toLocaleTimeString()} | ${message}\n`);
    } catch (error) {}
});
client.on(Events.Warn, message => {
    try {
    fs.appendFileSync(logFilePath, `[WARN] ${new Date().toLocaleTime()} | ${message}\n`);
    } catch (error) {}
});
client.on(Events.Error, message => {
    try {
    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | ${message}\n`);
    } catch (error) {}
});

function formatUptime(uptime) {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

setInterval(() => {
    try{
    const currentTime = new Date().toLocaleTimeString();
    const memoryUsage = process.memoryUsage();
    const heapUsedInMB = (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2);
    const heapTotalInMB = (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2);
    fs.appendFileSync(logFilePath, `[MEMORY] ${currentTime} | ${heapUsedInMB} MB out of ${heapTotalInMB} MB\n`);
    const cpuUsage = process.cpuUsage();
    const cpuUsageInMS = (cpuUsage.user + cpuUsage.system) / 1000000;
    const cpuUsagePercent = (cpuUsageInMS / 1000 * 100).toFixed(2);
    fs.appendFileSync(logFilePath, `[CPU] ${currentTime} |  ${cpuUsagePercent} % used\n`);
    var uptime = process.uptime();
    uptime = Math.floor(uptime * 1000);
    uptime = formatUptime(uptime);
    fs.appendFileSync(logFilePath, `[UPTIME] ${currentTime} | ${uptime}\n`);
    } catch (error) {}
}, 600000);

// Load the interaction state
const interactionStateFile = path.join(__dirname, 'interactionState.json');
const interactionStateFile2 = path.join(__dirname, 'interactionState2.json');
const interactionStateFile3 = path.join(__dirname, 'interactionState3.json');
client.once('ready', async () => {
    if (fs.existsSync(interactionStateFile)) {
        const interactionStates = JSON.parse(fs.readFileSync(interactionStateFile));
        if (Array.isArray(interactionStates)) {
            for (const interactionState of interactionStates) {
                const { channelId, messageId, userId, roleId, guildId, requestedFrom } = interactionState;

                // Log the loaded values
                console.log('Loaded interaction state:', interactionState);

                // Validate the loaded values
                if (!channelId || !messageId || !userId || !roleId || !guildId || !requestedFrom) {
                    console.error('Invalid interaction state:', interactionState);
                    continue;
                }

                try {
                    const channel = await client.channels.fetch(channelId);
                    const message = await channel.messages.fetch(messageId);

                    // Recreate the message collector
                    const collector = message.createMessageComponentCollector({ time: 86400000 });
                    collector.on('collect', async i => {
                        if (i.customId === 'accept') {
                            const guild = client.guilds.cache.get(guildId);
                            const member = await guild.members.fetch(userId);
                            const role = guild.roles.cache.get(roleId);
                            await member.roles.add(role);

                            if (guildId === '1221116174637727784') {
                            const [results2] = await pool.query(`SELECT * FROM roleconnect WHERE roleid = '${role.id}'`);
                            if (results2.length > 0) {
                                const connectedRoles = results2[0].connected;
                                const connectedRolesArray = connectedRoles.split(',');
                                connectedRolesArray.forEach(async (tag) => {
                                    const [results3] = await pool.query(`SELECT * FROM roleconnect`);
                                    results3.forEach(async (row) => {
                                        const rowSplit = row.connected.split(',');
                                        if (rowSplit.some(item => item.trim() === tag) && row.id !== guildId) {
                                            const guild = client.guilds.cache.get(row.id);
                                            const roletoassignid = row.roleid;
                                            const roleToAssign = guild.roles.cache.get(roletoassignid);
                                            const memberToAssign = await guild.members.fetch(userId);
                                            memberToAssign.roles.add(roleToAssign);
                                        }
                                    });
                                });
                            }
                        }
                            fs.writeFileSync(interactionStateFile, JSON.stringify(interactionStates.filter(state => state !== interactionState)));
                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('accept')
                                        .setLabel('Accept')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('✅')
                                        .setDisabled(true)
                                );
                            await i.update({ components: [row] });
                            const requstedFromuser = await client.users.fetch(requestedFrom);
                            const dmChannel2 = await member.createDM();
                            const embed3 = new EmbedBuilder()
                                .setTitle('Role Request Accepted')
                                .setDescription(` Your role request for ${role.name} has been accepted by ${requstedFromuser}.`)
                                .setColor('#00FF00');
                            dmChannel2.send({ embeds: [embed3] });

                            const [results3] = await pool.query(`SELECT * FROM guilds WHERE id = '${guildId}'`);
                            if (results3[0].log_channel !== 0 && results3[0].log_channel !== null && results3[0].log_channel !== undefined && results3[0].log_channel !== 'null' && results3[0].log_channel !== '') {
                                try {
                                    const webhookClient = new WebhookClient({ id: results3[0].logging_id, token: results3[0].logging_token });

                                    if (!webhookClient) {
                                        console.log('No webhook found error');
                                        return;
                                    }
                                    const embed5 = new EmbedBuilder()
                                        .setTitle('Role Request Accepted')
                                        .setDescription(`Role request for ${role.name} has been accepted.`)
                                        .addFields({ name: 'Requested By', value: `${requstedFromuser} | ${requstedFromuser.id}` },
                                            { name: 'Accepted By', value: `${i.user} | ${i.user.id}` })
                                        .setColor('#037bfc')
                                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: client.user.displayAvatarURL({ dynamic: true }) });
                                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                                } catch (error) {
                                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Role Request | Command Section: Role Request Deny | ${i.user.tag} (${i.user.id}) received an error: ${error}\n`);
                                }
                            }
                        } else if (i.customId === 'deny') {
                            fs.writeFileSync(interactionStateFile, JSON.stringify(interactionStates.filter(state => state !== interactionState)));

                            // Update the button to show that the user has accepted the role
                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('deny')
                                        .setLabel('Deny')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('❌')
                                        .setDisabled(true)
                                );
                            await i.update({ components: [row] });
                            const requstedFromuser = await client.users.fetch(requestedFrom);
                            const dmChannel2 = await member.createDM();
                            const embed3 = new EmbedBuilder()
                                .setTitle('Role Request Denied')
                                .setDescription(` Your role request for ${role.name} has been denied by ${requstedFromuser}.`)
                                .setColor('#00FF00');
                            dmChannel2.send({ embeds: [embed3] });

                        }
                    });
                } catch (error) {
                    console.error('Error loading interaction state:', error);
                }
            }
        } else {
            console.error('Invalid interaction state format:', interactionStates);
        }
    }
    if (fs.existsSync(interactionStateFile2)) {
        const interactionStates2 = JSON.parse(fs.readFileSync(interactionStateFile2));
        if (Array.isArray(interactionStates2)) {
            for (const interactionState2 of interactionStates2) {
                const { guildId, channelId, userId, type, user, reason, request_global_kick, messageId } = interactionState2;
    
                // Log the loaded values
                console.log('Loaded interaction state:', interactionState2);
    
                // Validate the loaded values
                if (!channelId || !messageId || !userId || !guildId || !type || !user || !reason || !request_global_kick) {
                    console.error('Invalid interaction state:', interactionState2);
                    continue;
                }
    
                try {
                    const guild = await client.guilds.fetch(guildId);
                    const channel = await guild.channels.fetch(channelId);
                    const message = await channel.messages.fetch(messageId);
    
                    // Recreate the message collector
                    const collector = message.createMessageComponentCollector({ time: 86400000 });
                    collector.on('collect', async i => {
                        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${i.user.id}'`);
                        let userHasPermission = userRows[0]?.global_kick === 1;
                        if (!userHasPermission) {
                            const member = await i.guild.members.fetch(i.user.id);
                            const roleIds = member.roles.cache.map(role => role.id);
                            if (roleIds.length > 0) {
                                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                                userHasPermission = roleRows.some(row => row.global_kick === 1);
                            }
                        }
                        if (!userHasPermission) {
                            const embed = new EmbedBuilder()
                                .setTitle('You do not have permission to use this command')
                                .setColor('#FF0000');
                            return i.reply({ embeds: [embed], ephemeral: true });
                        } else {
                            if (i.customId === 'approve_global_kick') {
                                const guilds = client.guilds.cache;
                                for (const [guildId, guild] of guilds) {
                                    try {
                                        const member = await guild.members.fetch(user);
                                        if (member) {
                                            await member.kick(reason);
                                        }
                                    } catch (error) {
                                        if (error.code === 10007) {
                                            console.warn(`Member ${user} not found in guild ${guildId}, skipping.`);
                                        } else {
                                            console.error(`Failed to kick member in guild ${guildId}:`, error);
                                        }
                                    }
                                }
                                const row2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('accept2')
                                            .setLabel('Approved by ' + i.user.username)
                                            .setStyle(ButtonStyle.Success)
                                            .setDisabled(true)
                                            .setEmoji('✅')
                                    );
                                await i.update({ components: [row2] });
                                fs.writeFileSync(interactionStateFile2, JSON.stringify(interactionStates2.filter(state => state !== interactionState2)));
                            } else if (i.customId === 'deny_global_kick') {
                                const row2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('deny2')
                                            .setLabel('Denied by ' + i.user.username)
                                            .setStyle(ButtonStyle.Danger)
                                            .setDisabled(true)
                                            .setEmoji('❌')
                                    );
                                await i.update({ components: [row2] });
                                fs.writeFileSync(interactionStateFile2, JSON.stringify(interactionStates2.filter(state => state !== interactionState2)));
                            }
                        }
                    });
                } catch (error) {
                    if (error.code === 10008) {
                        console.warn(`Message ${messageId} not found in channel ${channelId}, skipping interaction state.`);
                    } else {
                        console.error('Error loading interaction state:', error);
                    }
                }
            }
        }
    }
    if (fs.existsSync(interactionStateFile3)) {
        const interactionStates3= JSON.parse(fs.readFileSync(interactionStateFile3));
        if (Array.isArray(interactionStates3)) {
            for (const interactionState3 of interactionStates3) {
                const { guildId, channelId, userId, type, user, reason, request_global_ban, messageId } = interactionState3;
    
                // Log the loaded values
                console.log('Loaded interaction state:', interactionState3);
    
                // Validate the loaded values
                if (!channelId || !messageId || !userId || !guildId || !type || !user || !reason || !request_global_ban) {
                    console.error('Invalid interaction state:', interactionState3);
                    continue;
                }
                
                try {
                    const guild = await client.guilds.fetch(guildId);
                    const memberRequesting = await guild.members.fetch(userId);
                    const channel = await guild.channels.fetch(channelId);
                    const message = await channel.messages.fetch(messageId);

                    const collector = message.createMessageComponentCollector({ time: 86400000 });
                    collector.on('collect', async i => {
                        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${i.user.id}'`);
                        let userHasPermission = userRows[0]?.netg === 1;
                        if (!userHasPermission) {
                            const member = await i.guild.members.fetch(i.user.id);
                            const roleIds = member.roles.cache.map(role => role.id);
                            if (roleIds.length > 0) {
                                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                                userHasPermission = roleRows.some(row => row.netg === 1);
                            }
                        }
                        if (!userHasPermission) {
                            const embed = new EmbedBuilder()
                                .setTitle('You do not have permission to use this command')
                                .setColor('#FF0000');
                            return i.reply({ embeds: [embed], ephemeral: true });
                        } else {
                            if (i.customId === 'approve_global_ban') {
                                let random;
                                let isUnique = false;
                                while (!isUnique) {
                                    random = Math.floor(1000000 + Math.random() * 900000);
                                    random = `NETG-${random}`;
                                    const [rows] = await pool.query(`SELECT * FROM global_ban WHERE ban_id = '${random}'`);
                                    
                                    if (rows.length === 0) {
                                        isUnique = true;
                                    }
                                }
                                await pool.query(`INSERT INTO global_ban (id, ban_id, banned_by, ban_time, reason) VALUES ('${user}', '${random}', '${userId}', NOW(), '${reason}')`);
                                const guilds = client.guilds.cache;
                                guilds.forEach(async (guild) => {
                                    try {
                                        await guild.members.ban(user, { reason: `Global banned by ${memberRequesting.user.username} for ${reason} with ban id ${random}` });
                                    } catch (error) {
                                        console.error(`Failed to ban user ${user} in guild ${guild.id}:`, error);
                                    }
                                });
                                const row2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('accept2')
                                            .setLabel('Approved by ' + i.user.username)
                                            .setStyle(ButtonStyle.Success)
                                            .setDisabled(true)
                                            .setEmoji('✅')
                                    );
                                await i.update({ components: [row2] });
                                fs.writeFileSync(interactionStateFile3, JSON.stringify(interactionStates3.filter(state => state !== interactionState3)));
                            } else if (i.customId === 'deny_global_ban') {
                                const guilds = client.guilds.cache;
                                guilds.forEach(async (guild) => {
                                    try {
                                        await guild.members.unban(user, { reason: `Global ban denied by ${i.user.username}` });
                                    } catch (error) {}
                                });
                                const row2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('deny2')
                                            .setLabel('Denied by ' + i.user.username)
                                            .setStyle(ButtonStyle.Danger)
                                            .setDisabled(true)
                                            .setEmoji('❌')
                                    );
                                await i.update({ components: [row2] });
                                fs.writeFileSync(interactionStateFile3, JSON.stringify(interactionStates3.filter(state => state !== interactionState3)));
                            }
                        }
                    });
                } catch (error) {
                    if (error.code === 10008) {
                        console.warn(`Message ${messageId} not found in channel ${channelId}, skipping interaction state.`);
                    }
                }
            }
        }
    }
});

client.login(token);