const { UserSelectMenuBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const db = require('../../../database/db.js');

module.exports = {
    customId: 'corregedoria_apply_sanction',
    async execute(interaction) {
        try {
            const ticket = await db.get('SELECT ticket_id FROM corregedoria_tickets WHERE channel_id = $1', [interaction.channel.id]);
            if (!ticket) {
                return await interaction.reply({ content: '❌ Ticket não encontrado no banco de dados.', ephemeral: true });
            }

            // ETAPA 1: SELECIONAR O USUÁRIO
            const userSelectMenu = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('sanction_user_step')
                    .setPlaceholder('Selecione o oficial a ser punido...')
            );
            
            const response = await interaction.reply({
                content: '**Etapa 1 de 3:** Selecione o membro que receberá a sanção.',
                components: [userSelectMenu],
                ephemeral: true,
                fetchReply: true
            });

            // Aguarda a seleção do usuário por 1 minuto
            const userInteraction = await response.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id && i.customId === 'sanction_user_step',
                componentType: ComponentType.UserSelect,
                time: 60000
            });

            const sanctionedUserId = userInteraction.values[0];

            // ETAPA 2: SELECIONAR A PUNIÇÃO
            const punishments = await db.all('SELECT name, description FROM corregedoria_punishments');
            if (punishments.length === 0) {
                return await userInteraction.update({ content: '❌ Nenhuma punição pré-definida encontrada. Adicione punições no menu de setup.', components: [] });
            }
            const punishmentOptions = punishments.map(p => ({ label: p.name, description: p.description.substring(0, 100), value: p.name }));
            
            const punishmentSelectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('sanction_punishment_step')
                    .setPlaceholder('Selecione a punição a ser aplicada...')
                    .addOptions(punishmentOptions)
            );
            
            await userInteraction.update({ content: '**Etapa 2 de 3:** Agora, selecione a sanção a ser aplicada.', components: [punishmentSelectMenu] });

            // Aguarda a seleção da punição por 1 minuto
            const punishmentInteraction = await response.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id && i.customId === 'sanction_punishment_step',
                componentType: ComponentType.StringSelect,
                time: 60000
            });

            const sanctionType = punishmentInteraction.values[0];

            // ETAPA 3: ABRIR O FORMULÁRIO (MODAL)
            const modal = new ModalBuilder()
                .setCustomId(`corregedoria_sanction_modal_${ticket.ticket_id}_${sanctionedUserId}_${encodeURIComponent(sanctionType)}`)
                .setTitle('Formulário de Justificativa');

            const reasonInput = new TextInputBuilder().setCustomId('sanction_reason').setLabel("Justificativa e Veredito Final").setStyle(TextInputStyle.Paragraph).setPlaceholder("Descreva o motivo detalhado para a aplicação desta sanção.").setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            
            // Esta é a última ação deste arquivo. A próxima etapa é processada pelo handler do modal.
            await punishmentInteraction.showModal(modal);

        } catch (error) {
            // Se o tempo esgotar em qualquer etapa, a interação será cancelada
            console.error("Erro ou tempo esgotado no fluxo de sanção:", error);
            await interaction.editReply({ content: 'Tempo esgotado ou ocorreu um erro. Ação cancelada.', components: [] }).catch(() => {});
        }
    }
};