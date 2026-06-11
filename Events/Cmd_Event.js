const { Events, PermissionFlagsBits, ChannelType } = require('discord.js');
const client = require('../index.js');

module.exports = {
    name: 'Command_Enable',
};

client.on(Events.MessageCreate, async (message) => {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.SendMessages)) return;
    if (message.author.bot) return;
    if (message.channel.type == ChannelType.DM) return;
    if (message.content.toLowerCase().startsWith(client.config.prefix)) {
        let [cmd, ...args] = message.content.slice(client.config.prefix.length).trim().split(/ +/g)
        let command = client.cmds.get(cmd.toLowerCase()) || client.cmds.find((c) => c.aliases && c.aliases?.includes(cmd.toLowerCase()));
        let modcommand = client.modcmds.get(cmd.toLowerCase()) || client.modcmds.find((c) => c.aliases && c.aliases?.includes(cmd.toLowerCase()));
        if (command && !modcommand) {
            console.log(`UserCommand : ${command.name} | ${message.author.username} | ${message.member.id} | ${message.guild.name} | ${message.guild.id}`);
            try {
                await command.run(client, message, args)
            } catch (err) {
                console.log(err);
            }
        } else if (!command && modcommand) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
            console.log(`ModCommand : ${modcommand.name} | ${message.author.username} | ${message.member.id} | ${message.guild.name} | ${message.guild.id}`);
            try {
                await modcommand.run(client, message, args)
            } catch (err) {
                console.log(err);
            }
        }
    }
});