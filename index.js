const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const { punishmentMonitor } = require('./utils/corregedoria/punishmentMonitor.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv-flow').config();
const db = require('./database/db.js');
const { patrolMonitor } = require('./utils/patrolMonitor.js');
const { dashboardMonitor } = require('./utils/dashboardMonitor.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// FUNÇÃO AUXILIAR PARA CARREGAR ARQUIVOS RECURSIVAMENTE
function loadHandlers(dir, collection) {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        console.error(`[ERRO] O caminho "${fullPath}" não foi encontrado. Certifique-se de que a pasta existe.`);
        return;
    }
    
    const files = fs.readdirSync(fullPath);
    for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory()) {
            loadHandlers(path.join(dir, file), collection);
        } else if (stat.isFile() && file.endsWith('.js')) {
            const handler = require(filePath);
            if ('customId' in handler || 'data' in handler) {
                const key = handler.customId || handler.data.name;
                collection.set(typeof key === 'function' ? key.toString() : key, handler);
                console.log(`[INFO] Handler carregado: ${typeof key === 'string' ? key : file}`);
            }
        }
    }
}

// Carregando todos os tipos de interações
client.commands = new Collection();
loadHandlers('commands', client.commands);

client.buttons = new Collection();
loadHandlers('interactions/buttons', client.buttons);

client.selects = new Collection();
loadHandlers('interactions/selects', client.selects);
loadHandlers('interactions/select_menus', client.selects); // Mantido por compatibilidade

client.modals = new Collection();
loadHandlers('interactions/modals', client.modals);


client.once(Events.ClientReady, readyClient => {
        // Adicione esta linha para o novo monitor
    setInterval(() => punishmentMonitor(readyClient), 40000); // Roda a cada 60 segundos
    console.log('[INFO] Monitor de punições da Corregedoria ativado.');
    console.log(`\n---\nLogado como ${readyClient.user.tag}\n---`);
    setInterval(() => patrolMonitor(readyClient), 30000);
    console.log('[INFO] Monitor de patrulha ativado.');
    setInterval(() => dashboardMonitor(readyClient), 5000); 
    console.log('[INFO] Monitor de dashboards pessoais ativado.');
});

// Função aprimorada para encontrar qualquer tipo de handler (dinâmico ou estático)
function findHandler(interaction, collection) {
    let handler = collection.get(interaction.customId);
    if (handler) return handler;

    for (const item of collection.values()) {
        if (typeof item.customId === 'function' && item.customId(interaction.customId)) {
            return item;
        }
    }
    return undefined;
}

// O "CÉREBRO" DO BOT - AGORA CORRIGIDO PARA MODALS
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return console.error(`Comando "${interaction.commandName}" não encontrado.`);
            await command.execute(interaction);

        } else if (interaction.isButton()) {
            const button = findHandler(interaction, client.buttons);
            if (!button) return console.error(`Botão com ID "${interaction.customId}" não encontrado.`);
            await button.execute(interaction);

        } else if (interaction.isAnySelectMenu()) { // Usamos AnySelectMenu para cobrir todos os tipos
            const selectMenu = findHandler(interaction, client.selects);
            if (!selectMenu) return console.error(`Menu de Seleção com ID "${interaction.customId}" não encontrado.`);
            await selectMenu.execute(interaction);
            
        } else if (interaction.isModalSubmit()) { // **A CORREÇÃO ESTÁ AQUI**
            const modal = findHandler(interaction, client.modals);
            if (!modal) {
                console.error(`Modal com ID "${interaction.customId}" não encontrado.`);
                // Adiciona uma resposta de erro visível para o usuário
                return await interaction.reply({ content: '❌ Ocorreu um erro ao processar este formulário (código do handler não encontrado).', ephemeral: true });
            }
            await modal.execute(interaction);
        }

    } catch (error) {
        console.error('Erro geral ao processar interação:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Houve um erro crítico ao executar esta ação!', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Houve um erro crítico ao executar esta ação!', ephemeral: true }).catch(() => {});
        }
    }
});


// Lógica de registro de comandos (não precisa de alteração)
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
    try {
        const commandsToDeploy = client.commands.map(command => command.data.toJSON());
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandsToDeploy },
        );
        console.log(`[INFO] Comandos (/) registrados com sucesso.`);
    } catch (error) {
        console.error('[ERRO] Falha ao registrar comandos:', error);
    }
})();

client.login(DISCORD_TOKEN);