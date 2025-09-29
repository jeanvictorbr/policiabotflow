const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db.js');

async function punishmentMonitor(client) {
    try {
        const now = Math.floor(Date.now() / 1000);
        // Busca todas as punições que já expiraram
        const expiredPunishments = await db.all('SELECT * FROM active_punishments WHERE expires_at <= $1', [now]);

        if (expiredPunishments.length === 0) return;

        const logChannelId = (await db.get("SELECT value FROM settings WHERE key = 'corregedoria_logs_channel_id'"))?.value;
        const logChannel = logChannelId ? await client.channels.fetch(logChannelId).catch(() => null) : null;

        for (const punishment of expiredPunishments) {
            const guild = await client.guilds.fetch(punishment.guild_id).catch(() => null);
            if (!guild) continue;

            const member = await guild.members.fetch(punishment.user_id).catch(() => null);
            const role = await guild.roles.fetch(punishment.role_id).catch(() => null);

            if (member && role) {
                // Remove o cargo do membro
                await member.roles.remove(role, 'Punição temporária expirada.');
            }

            // Remove o registro da punição ativa
            await db.run('DELETE FROM active_punishments WHERE id = $1', [punishment.id]);

            // Envia o log de remoção do cargo
            if (logChannel) {
                const sanction = await db.get('SELECT * FROM corregedoria_sanctions WHERE sanction_id = $1', [punishment.sanction_id]);
                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Punição Finalizada (Automático)')
                    .setThumbnail(member ? member.user.displayAvatarURL() : null)
                    .addFields(
                        { name: 'Oficial', value: member ? member.toString() : `\`${punishment.user_id}\``, inline: true },
                        { name: 'Cargo Removido', value: role ? role.toString() : `\`${punishment.role_id}\``, inline: true },
                        { name: 'Tipo de Sanção', value: sanction ? `\`${sanction.sanction_type}\`` : '`Não encontrada`' },
                        { name: 'Data de Finalização', value: `<t:${now}:F>` }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error("Erro no monitor de punições:", error);
    }
}

module.exports = { punishmentMonitor };