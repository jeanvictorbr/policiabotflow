const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder } = require('discord.js');
const db = require('../database/db.js');

async function getMainMenuPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Painel de Configuração do Phoenix')
    .setDescription('Selecione o módulo que você deseja configurar no menu abaixo.')
    .setFooter({ text: 'Phoenix • Sistema de Gestão Policial' });
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('setup_module_select')
    .setPlaceholder('Escolha um módulo...')
    .addOptions([
      {
        label: 'Módulo COPOM',
        description: 'Configure canais, cargos e equipes para o controle de patrulha.',
        value: 'module_copom',
        emoji: '👮',
      },
      {
        label: 'Módulo Academia',
        description: 'Gerencie cursos, certificações e instrutores.',
        value: 'module_academy',
        emoji: '🎓',
      },
      {
        label: 'Módulo Corregedoria',
        description: 'Gerencie denúncias, investigações e sanções internas.',
        value: 'module_corregedoria',
        emoji: '⚖️',
      },
    ]);
  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

async function getCopomMenuPayload(db) {
  const settings = await db.all("SELECT key, value FROM settings WHERE key LIKE 'copom_%' OR key = 'em_servico_role_id'");
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('👮 Configuração do Módulo COPOM')
    .setDescription('Defina os canais, cargos e equipes para a operação do COPOM.')
    .addFields(
        { name: 'Canal de Operações', value: settingsMap.has('copom_channel_id') ? `<#${settingsMap.get('copom_channel_id')}>` : '`Não definido`', inline: true },
        { name: 'Cargo "Em Serviço"', value: settingsMap.has('em_servico_role_id') ? `<@&${settingsMap.get('em_servico_role_id')}>` : '`Não definido`', inline: true },
        { name: 'Canal de Logs', value: settingsMap.has('copom_logs_channel_id') ? `<#${settingsMap.get('copom_logs_channel_id')}>` : '`Não definido`', inline: true },
        { name: 'Categoria das Equipes', value: settingsMap.has('copom_teams_category_id') ? `<#${settingsMap.get('copom_teams_category_id')}>` : '`Não definido`', inline: true },
    );
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_copom_set_op_channel').setLabel('Definir Canal de OP').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_copom_set_role').setLabel('Definir Cargo').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_copom_set_logs_channel').setLabel('Definir Canal de Logs').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_copom_set_teams_category').setLabel('Definir Categoria').setStyle(ButtonStyle.Secondary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_copom_set_image').setLabel('Definir Imagem Principal').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_copom_set_footer').setLabel('Definir Rodapé').setStyle(ButtonStyle.Secondary),
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_copom_manage_teams').setLabel('Gerenciar Equipes').setEmoji('🛡️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('back_to_main_menu').setLabel('Voltar ao Início').setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [row1, row2, row3, row4] };
}

async function getCopomTeamsMenuPayload(db) {
  const teams = await db.all('SELECT * FROM patrol_teams');
  const embed = new EmbedBuilder()
    .setColor(0x53FC5E)
    .setTitle('🛡️ Gerenciamento de Equipes do COPOM')
    .setDescription('Adicione ou remova as equipes de patrulha. O bot irá criar e deletar os canais de voz automaticamente.')
    .setFooter({ text: 'As equipes configuradas aqui aparecerão no dashboard de "Iniciar Serviço".' });
  if (teams.length > 0) {
    const teamsList = teams.map(t => `**${t.team_name}**: <#${t.channel_id}> (${t.max_slots} vagas)`).join('\n');
    embed.addFields({ name: 'Equipes Atuais', value: teamsList });
  } else {
    embed.addFields({ name: 'Equipes Atuais', value: '`Nenhuma equipe configurada.`' });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copom_team_add').setLabel('Adicionar Equipe').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('copom_team_remove').setLabel('Remover Equipe').setStyle(ButtonStyle.Primary).setDisabled(teams.length === 0),
    new ButtonBuilder().setCustomId('back_to_copom_menu').setLabel('Voltar').setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [buttons] };
}

async function getAcademyMenuPayload(db) {
    const courses = await db.all('SELECT * FROM academy_courses');
    
    const settings = await db.all("SELECT key, value FROM settings WHERE key IN ('academy_channel_id', 'academy_discussion_channel_id', 'academy_logs_channel_id')");
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    
    const embed = new EmbedBuilder()
        .setColor(0xFEEA0A)
        .setTitle('🎓 Configuração do Módulo Academia')
        .setDescription('Gerencie cursos, instrutores e certificações.')
        .setFields(
            { name: 'Canal de Estudos (Painel Público)', value: settingsMap.has('academy_channel_id') ? `<#${settingsMap.get('academy_channel_id')}>` : '`Não definido`', inline: false },
            { name: 'Canal de Discussões (Tópicos)', value: settingsMap.has('academy_discussion_channel_id') ? `<#${settingsMap.get('academy_discussion_channel_id')}>` : '`Não definido`', inline: false },
            { name: 'Canal de Logs da Academia', value: settingsMap.has('academy_logs_channel_id') ? `<#${settingsMap.get('academy_logs_channel_id')}>` : '`Não definido`', inline: false }
        )
        .setFooter({ text: 'As alterações são salvas instantaneamente.' });
    
    if (courses.length > 0) {
        const coursesList = courses.map(c => `**${c.name}**\n\`ID: ${c.course_id}\` - Horas Mínimas: \`${c.required_hours}\``).join('\n\n');
        embed.addFields({ name: 'Cursos Atuais', value: coursesList });
    } else {
        embed.addFields({ name: 'Cursos Atuais', value: '`Nenhum curso configurado.`' });
    }
    
    const actionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('academy_add_course').setLabel('Adicionar Curso').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('academy_edit_course').setLabel('Editar Curso').setStyle(ButtonStyle.Secondary).setDisabled(courses.length === 0),
        new ButtonBuilder().setCustomId('academy_remove_course').setLabel('Remover Curso').setStyle(ButtonStyle.Danger).setDisabled(courses.length === 0)
    );
    const certifyButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('academy_certify_official').setLabel('Certificar Oficial').setStyle(ButtonStyle.Success).setEmoji('🎖️').setDisabled(courses.length === 0)
    );
    const scheduleButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('academy_schedule_course').setLabel('Agendar Curso').setStyle(ButtonStyle.Primary).setEmoji('🗓️').setDisabled(courses.length === 0)
    );
    
    const configButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('academy_set_channel').setLabel('Definir Canal de Estudos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('academy_set_discussion_channel').setLabel('Definir Canal de Discussões').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('academy_set_logs_channel').setLabel('Definir Canal de Logs').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('back_to_main_menu').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    const components = [actionButtons, certifyButton, scheduleButton, configButtons];
    
    if (courses.length > 0) {
        const options = courses.map(c => ({
            label: c.name,
            description: `Requisitos: ${c.required_hours}h`,
            value: c.course_id,
        }));
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('academy_view_details')
                .setPlaceholder('🔍 Ver detalhes de um curso...')
                .addOptions(options),
        );
        components.splice(1, 0, selectMenu);
    }
    
    return { embeds: [embed], components: components };
}

async function getCourseEnrollmentDashboardPayload(course, guild, enrollments) {
  const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle(`Dashboard de Inscrições: ${course.name}`)
    .setDescription('Aprove ou recuse os oficiais inscritos no curso.')
    .setFooter({ text: 'Certifique apenas os oficiais que completaram o curso.' });

  const options = await Promise.all(enrollments.map(async (e) => {
    const member = await guild.members.fetch(e.user_id).catch(() => null);
    if (!member) return null;
    return {
      label: member.user.username,
      description: `Inscrito em: ${new Date(e.enrollment_date * 1000).toLocaleDateString()}`,
      value: e.user_id,
    };
  }));

  const validOptions = options.filter(Boolean);

  if (validOptions.length === 0) {
    embed.setDescription('Nenhum oficial inscrito neste curso no momento.');
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`academy_certify_member_select_${course.course_id}`)
    .setPlaceholder('Selecione um oficial para certificar...')
    .addOptions(validOptions.length > 0 ? validOptions : [{ label: 'Nenhum inscrito', value: 'none', disabled: true }]);

  const approveAllButton = new ButtonBuilder()
    .setCustomId(`academy_certify_all_${course.course_id}`)
    .setLabel('Aprovar Todos')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅')
    .setDisabled(validOptions.length === 0);

  const actionRow = new ActionRowBuilder().addComponents(selectMenu);
  
  const buttonRow = new ActionRowBuilder().addComponents(
    approveAllButton,
    new ButtonBuilder().setCustomId('back_to_academy_menu').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [actionRow, buttonRow] };
}

async function getCorregedoriaMenuPayload(db) {
  const settings = await db.all("SELECT key, value FROM settings WHERE key LIKE 'corregedoria_%'");
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  const formatSetting = (key, type) => {
    if (settingsMap.has(key)) {
      const id = settingsMap.get(key);
      return `✅ Definido: ${type === 'role' ? `<@&${id}>` : `<#${id}>`}`;
    }
    return '❌ `Não definido`';
  };

  const embed = new EmbedBuilder()
    .setColor('DarkRed')
    .setTitle('⚖️ Configuração do Módulo Corregedoria')
    .setDescription('Configure os pilares do sistema de denúncias e assuntos internos.')
    .setThumbnail('https://i.imgur.com/sR32sQ8.png')
    .addFields(
        { name: '👮 Cargo de Corregedor', value: `Define quem gerencia os tickets.\n**Status:** ${formatSetting('corregedoria_role_id', 'role')}` },
        { name: '🗂️ Categoria para Tickets', value: `Onde os canais de denúncia serão criados.\n**Status:** ${formatSetting('corregedoria_tickets_category_id', 'channel')}` },
        { name: '📢 Canal de Abertura', value: `Onde membros iniciam denúncias.\n**Status:** ${formatSetting('corregedoria_public_channel_id', 'channel')}` },
        { name: '📜 Canal de Logs (Dashboards)', value: `Onde os dashboards de cada caso são postados.\n**Status:** ${formatSetting('corregedoria_logs_channel_id', 'channel')}` },
        { name: '📄 Canal de Transcripts', value: `Onde os arquivos de texto das conversas são salvos.\n**Status:** ${formatSetting('corregedoria_transcript_channel_id', 'channel')}` }
    )
    .setFooter({ text: 'Use os botões abaixo para definir cada configuração.' });
    
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_corregedoria_set_role').setLabel('Definir Cargo').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_corregedoria_set_category').setLabel('Definir Categoria').setStyle(ButtonStyle.Secondary)
  );
  
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_corregedoria_set_public').setLabel('Definir Canal de Abertura').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_corregedoria_set_logs').setLabel('Definir Canal de Logs').setStyle(ButtonStyle.Secondary)
  );
  
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_corregedoria_set_transcript').setLabel('Definir Canal de Transcripts').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_corregedoria_manage_punishments').setLabel('Gerenciar Punições').setStyle(ButtonStyle.Primary).setEmoji('📜')
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('corregedoria_direct_sanction').setLabel('Aplicar Sanção Direta').setStyle(ButtonStyle.Primary).setEmoji('⚖️'),
    new ButtonBuilder().setCustomId('back_to_main_menu').setLabel('Voltar ao Início').setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row1, row2, row3, row4] };
}

async function getCorregedoriaPunishmentsMenuPayload(db) {
    const punishments = await db.all('SELECT * FROM corregedoria_punishments ORDER BY name ASC');
    
    const embed = new EmbedBuilder()
        .setColor('DarkRed')
        .setTitle('📜 Gerenciamento de Punições Pré-definidas')
        .setDescription('Adicione ou remova as sanções que podem ser aplicadas nos tickets. Estas opções aparecerão no menu de seleção ao aplicar uma punição.')
        .setFooter({ text: 'É recomendado manter a lista de punições clara e objetiva.' });
    
    if (punishments.length > 0) {
        const punishmentList = punishments.map(p => `**- ${p.name}:** *${p.description}*`).join('\n');
        embed.addFields({ name: 'Punições Atuais', value: punishmentList });
    } else {
        embed.addFields({ name: 'Punições Atuais', value: '`Nenhuma punição pré-definida foi adicionada ainda.`' });
    }

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('corregedoria_add_punishment').setLabel('Adicionar Punição').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('corregedoria_remove_punishment').setLabel('Remover Punição').setStyle(ButtonStyle.Danger).setDisabled(punishments.length === 0),
        new ButtonBuilder().setCustomId('back_to_corregedoria_menu').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [buttons] };
}

module.exports = {
  getMainMenuPayload,
  getCopomMenuPayload,
  getCopomTeamsMenuPayload,
  getAcademyMenuPayload,
  getCourseEnrollmentDashboardPayload,
  getCorregedoriaMenuPayload,
  getCorregedoriaPunishmentsMenuPayload
};