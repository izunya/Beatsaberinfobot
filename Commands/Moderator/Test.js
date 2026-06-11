const { Message } = require('discord.js');
const client = require('../../index');


module.exports = {
    name: 'test',
    aliases: ['ㅅㄷㄴㅅ','테스트'],
    description: 'test',
    /**
     * @param {client} client
     * @param {Message} message
     * @param {String[]} args
        **/
    run: async (client, message, args) => {
        message.delete()
        client.cmds.map(element => {
            message.channel.send(`${element.name} | ${element.aliases.join(' ')}`)
        });
    }
}
