const channel_check = interaction.guild.channels.cache.get(i.values[0]);
                    if (channel_check.type !== ChannelType.GuildText) {
                        const embed2 = new EmbedBuilder()
                            .setTitle('Logging Setup')
                            .setDescription('You must select a text channel to setup logging!')
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                        return;
                    }