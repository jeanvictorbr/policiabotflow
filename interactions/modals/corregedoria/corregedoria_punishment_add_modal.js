const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db.js');
const { getCorregedoriaPunishmentsMenuPayload } = require('../../../views/setup_views.js');
const { logCorregedoriaEvent } = require('../../../utils/corregedoria/eventLogger.js'); // Assuming you have this util

// Função para converter tempo (ex: 7d, 12h, 30m) para segundos
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    const durationRegex = /^(\d+)([dhm])$/;
    const match = durationStr.toLowerCase().match(durationRegex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'd': return value * 86400; // Dias
        case 'h': return value * 3600;  // Horas
        case 'm': return value * 60;    // Minutos
        default: return 0;
    }
}

module.exports = {
    customId: 'corregedoria_punishment_add_modal',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const name = interaction.fields.getTextInputValue('punishment_name');
            const description = interaction.fields.getTextInputValue('punishment_description');
            const durationStr = interaction.fields.getTextInputValue('punishment_duration');

            const durationSeconds = parseDuration(durationStr);
            if (durationSeconds === null) {
                return await interaction.editReply({ content: '❌ Formato de duração inválido. Use `d` para dias, `h` para horas ou `m` para minutos (ex: `7d`, `24h`, `30m`). Se a punição for permanente, deixe em branco.', ephemeral: true });
            }

            // 1. Criar o cargo no Discord
            const newRole = await interaction.guild.roles.create({
                name: `Punição: ${name}`,
                color: 'DarkRed',
                reason: `Cargo de punição criado automaticamente pelo sistema de Corregedoria.`
            });

            // 2. Salvar a punição no banco de dados
            await db.run(
                'INSERT INTO corregedoria_punishments (name, description, role_id, duration_seconds) VALUES ($1, $2, $3, $4)',
                [name, description, newRole.id, durationSeconds]
            );

            // 3. Atualizar o painel de gerenciamento
            const payload = await getCorregedoriaPunishmentsMenuPayload(db);
            await interaction.editReply({ content: `✅ Punição **"${name}"** e cargo associado ${newRole.toString()} criados com sucesso.`, ...payload });

        } catch (error) {
            console.error("Erro ao adicionar punição:", error);
            if(error.code === '23505') { // Código de erro para UNIQUE constraint
                await interaction.editReply({ content: `❌ A punição com o nome "${name}" já existe.`, ephemeral: true });
            } else {
                await interaction.editReply({ content: '❌ Ocorreu um erro ao adicionar a punição. Verifique as permissões do bot.', ephemeral: true });
            }
        }
    }
};