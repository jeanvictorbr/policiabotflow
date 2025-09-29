const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db.js');

module.exports = {
    customId: 'my_status',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const sessions = await db.all('SELECT * FROM patrol_history WHERE user_id = $1', [interaction.user.id]);
            const totalSeconds = sessions.reduce((sum, session) => sum + session.duration_seconds, 0);
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const formattedTotalTime = `${hours}h ${minutes}m ${seconds}s`;

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle(`Dossiê de Serviço - ${interaction.user.username}`)
                .setDescription('Informações detalhadas sobre a sua carreira na corporação.')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'Horas de Patrulha', value: `\`${formattedTotalTime}\``, inline: true },
                    { name: 'Cursos Concluídos', value: `\`0\``, inline: true }, // Placeholder até o Módulo Academia
                    { name: 'Relatórios Aprovados', value: `\`0\``, inline: true } // Placeholder até o Módulo Ocorrências
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao gerar dossiê de status:", error);
            await interaction.editReply('❌ Ocorreu um erro ao buscar seu status.');
        }
    },
};