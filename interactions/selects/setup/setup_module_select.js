const { getCopomMenuPayload, getAcademyMenuPayload, getCorregedoriaMenuPayload } = require('../../../views/setup_views.js'); // Adicione getCorregedoriaMenuPayload
const db = require('../../../database/db.js');

module.exports = {
  customId: 'setup_module_select',
  async execute(interaction) {
    await interaction.deferUpdate();

    const selectedModule = interaction.values[0];

    try {
      let payload;
      if (selectedModule === 'module_copom') {
        payload = await getCopomMenuPayload(db);
      } else if (selectedModule === 'module_academy') {
        payload = await getAcademyMenuPayload(db);
      } else if (selectedModule === 'module_corregedoria') { // Adicione este bloco
        payload = await getCorregedoriaMenuPayload(db);
      } else {
        return await interaction.editReply({ content: '❌ Módulo não encontrado.', components: [] });
      }

      await interaction.editReply(payload);
    } catch (error) {
      console.error("Erro ao carregar o menu do módulo:", error);
      await interaction.editReply({ content: '❌ Ocorreu um erro ao carregar o menu. Por favor, tente novamente.', components: [] });
    }
  },
};