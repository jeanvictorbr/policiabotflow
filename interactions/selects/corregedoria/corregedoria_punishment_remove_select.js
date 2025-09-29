const db = require('../../../database/db.js');
const { getCorregedoriaPunishmentsMenuPayload } = require('../../../views/setup_views.js');

module.exports = {
    customId: 'corregedoria_punishment_remove_select',
    async execute(interaction) {
        await interaction.deferUpdate();
        const punishmentNameToRemove = interaction.values[0];

        try {
            await db.run('DELETE FROM corregedoria_punishments WHERE name = $1', [punishmentNameToRemove]);

            // Atualiza o painel de gerenciamento de punições
            const payload = await getCorregedoriaPunishmentsMenuPayload(db);
            // Adiciona uma mensagem de confirmação sobre a remoção
            await interaction.editReply({ content: `✅ Punição **"${punishmentNameToRemove}"** removida com sucesso.`, ...payload });

        } catch (error) {
            console.error("Erro ao remover punição:", error);
            await interaction.followUp({ content: '❌ Ocorreu um erro ao tentar remover a punição.', ephemeral: true });
        }
    }
};