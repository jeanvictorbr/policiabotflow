const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    customId: 'corregedoria_direct_sanction',
    async execute(interaction) {
        try {
            // Usamos '0' como um placeholder para indicar que não há ticketId
            const ticketId = 0; 

            const userSelectMenu = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(`sanction_select_user_${ticketId}`) // Inicia o mesmo fluxo, mas com ticketId = 0
                    .setPlaceholder('Selecione o oficial a ser punido...')
            );
            
            await interaction.reply({
                content: '**Sanção Direta (Etapa 1 de 3):** Selecione o membro que receberá a sanção.',
                components: [userSelectMenu],
                ephemeral: true
            });

        } catch (error) {
            console.error("Erro ao iniciar sanção direta:", error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao iniciar este processo.', ephemeral: true });
        }
    }
};