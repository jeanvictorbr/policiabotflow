const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db.js');
const { logCorregedoriaEvent } = require('../../../utils/corregedoria/eventLogger.js');
const { updateCorregedoriaDashboard } = require('../../../utils/corregedoria/dashboardUpdater.js');

module.exports = {
    customId: (customId) => customId.startsWith('corregedoria_sanction_modal_'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3]; // Será '0' para sanções diretas
            const sanctionedUserId = parts[4];
            const sanctionType = decodeURIComponent(parts[5]);
            const reason = interaction.fields.getTextInputValue('sanction_reason');
            
            const memberToSanction = await interaction.guild.members.fetch(sanctionedUserId).catch(() => null);
            if (!memberToSanction) {
                return await interaction.editReply({ content: '❌ O membro a ser punido não foi encontrado.' });
            }

            const appliedAt = Math.floor(Date.now() / 1000);
            const finalTicketId = ticketId === '0' ? null : ticketId; // Converte '0' para NULL para o banco de dados

            // Salva a sanção no DB. O ticket_id será NULL se for uma sanção direta.
            const sanctionResult = await db.run(
                'INSERT INTO corregedoria_sanctions (ticket_id, sanctioned_user_id, sanction_type, reason, applied_by, applied_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING sanction_id',
                [finalTicketId, sanctionedUserId, sanctionType, reason, interaction.user.id, appliedAt]
            );
            const newSanctionId = sanctionResult.rows[0].sanction_id;

            // Lógica para aplicar cargo temporário
            const punishmentDetails = await db.get('SELECT role_id, duration_seconds FROM corregedoria_punishments WHERE name = $1', [sanctionType]);
            if (punishmentDetails && punishmentDetails.role_id) {
                const role = await interaction.guild.roles.fetch(punishmentDetails.role_id).catch(() => null);
                if (role) {
                    await memberToSanction.roles.add(role, `Sanção aplicada por ${interaction.user.tag}`);
                    if (punishmentDetails.duration_seconds > 0) {
                        const expiresAt = appliedAt + punishmentDetails.duration_seconds;
                        await db.run(
                            'INSERT INTO active_punishments (user_id, guild_id, role_id, sanction_id, expires_at) VALUES ($1, $2, $3, $4, $5)',
                            [sanctionedUserId, interaction.guild.id, role.id, newSanctionId, expiresAt]
                        );
                    }
                }
            }
            
            // Se a sanção veio de um ticket, notifica no canal do ticket e atualiza o dashboard
            if (finalTicketId) {
                const sanctionEmbed = new EmbedBuilder()
                    .setColor('DarkOrange')
                    .setTitle('⚖️ Veredito e Sanção Aplicada')
                    .setAuthor({ name: `Decisão de: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: 'Oficial Punido', value: memberToSanction.toString(), inline: true },
                        { name: 'Punição Aplicada', value: `**${sanctionType}**`, inline: true },
                        { name: 'Data', value: `<t:${appliedAt}:F>` },
                        { name: 'Justificativa', value: reason }
                    )
                    .setFooter({ text: `Sanção ID: ${newSanctionId} • Ticket ID: ${ticketId}` });
                await interaction.channel.send({ embeds: [sanctionEmbed] });
                await logCorregedoriaEvent(ticketId, 'sancao_aplicada', `Uma sanção de **${sanctionType}** foi aplicada a <@${sanctionedUserId}> por <@${interaction.user.id}>.`, interaction.user.id);
                await updateCorregedoriaDashboard(interaction, ticketId);
            } else {
                // Se for sanção direta, apenas envia um log geral no canal de logs da corregedoria
                const logChannelId = (await db.get("SELECT value FROM settings WHERE key = 'corregedoria_logs_channel_id'"))?.value;
                if (logChannelId) {
                    const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
                    if(logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('⚖️ Sanção Direta Aplicada')
                            .addFields(
                                { name: 'Oficial Punido', value: memberToSanction.toString(), inline: true },
                                { name: 'Punição Aplicada', value: `**${sanctionType}**`, inline: true },
                                { name: 'Aplicado por', value: interaction.user.toString(), inline: false },
                                { name: 'Justificativa', value: reason, inline: false },
                                { name: 'Data', value: `<t:${appliedAt}:F>` }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            }

            await interaction.editReply({ content: '✅ Sanção aplicada e registrada com sucesso!', ephemeral: true });

        } catch (error) {
            console.error("Erro ao aplicar sanção:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao registrar a sanção. Verifique o console.', ephemeral: true });
        }
    }
};