const { getCopomMenuPayload } = require('../../../views/setup_views.js');
const db = require('../../../database/db.js');

module.exports = {
  customId: 'setup_copom_teams_category_select',
  async execute(interaction) {
    await db.run('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['copom_teams_category_id', interaction.values[0]]);
    const payload = await getCopomMenuPayload(db);
    await interaction.update(payload);
  },
};