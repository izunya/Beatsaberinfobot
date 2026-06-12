const { Events } = require('discord.js');
const Client = require('../index.js');
const { glob } = require('glob');

/** 
 * @param {Client} client
 */

module.exports = async (client) => {
    // MessageCommand
    const commandFiles = await glob(`${process.cwd()}/Commands/MessageCommand/*.js`);
    commandFiles.map((value) => {
        const file = require(value);
        const split = value.split('/');
        const directory = split[split.length - 2];
        if (file.name) {
            const properties = { directory, ...file }
            client.cmds.set(file.name, properties)
            console.log(`Loading Command: ${file.name}`);
        }
    });
    // ModerationCommand
    const modcommandFiles = await glob(`${process.cwd()}/Commands/Moderator/*.js`);
    modcommandFiles.map((value) => {
        const file = require(value);
        const split = value.split('/');
        const directory = split[split.length - 2];

        if (file.name) {
            const properties = { directory, ...file }
            client.modcmds.set(file.name, properties)
            console.log(`Loading ModCommand: ${file.name}`);
        }
    })
    // Event Handler
    const eventFiles = await glob(`${process.cwd()}/Events/*.js`);
    eventFiles.map((value) => {
        const file = require(value);
        console.log("Loading Event: " + file.name)
    });

    // Slash Command Handler
    const slashcommandFiles = await glob(`${process.cwd()}/Commands/SlashCommands/**/*.js`);
    const arrayOfSlashCommands = [];
    slashcommandFiles.map((value) => {
        const file = require(value);
        if (!file?.name) return;
        client.slcmds.set(file.name, file);
        console.log(`Loaded Slash Command: ${file.name}`);

        if (['MESSAGE', 'USER'].includes(file.type)) delete file.description;
        arrayOfSlashCommands.push(file);
    });

    // Registering Slash Commands
    client.on(Events.ClientReady, async () => {
        await client.application.commands.set(arrayOfSlashCommands);
    });

    // All Counter
    console.log(`Loading Commands : ${commandFiles.length}`)
    console.log(`Loading ModCommands : ${modcommandFiles.length}`)
    console.log(`Loading Events : ${eventFiles.length}`)
    console.log(`Loading Slash Commands : ${slashcommandFiles.length}`)
}