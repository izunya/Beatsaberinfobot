const { Message } = require('discord.js');
const client = require('../../index');

module.exports = {
    name: 'delmsg',
    aliases: ['이거지워','deletemessage','msgdel'],
    description: 'DeleteMessage',
    /**
     * @param {client} client
     * @param {Message} message
     * @param {String[]} args
        **/
    run: async (client, message, args) => {
        message.delete()
        const msg = await message.channel.messages.fetch(args[0]).catch(err => {
            if(args[0] == '위에'){
                message.channel.messages.fetch({limit: 1}).then(messages => {
                    message.channel.bulkDelete(messages)
                })
            } else if(args[0] == '여러개'){
                let size = 0;
                if(!args[1]) size = 1;
                else size = args[1];
                message.channel.messages.fetch({limit: size}).then(messages => {
                    message.channel.bulkDelete(messages)
                })
            }
        })
        if(msg) msg.delete()
    }
}
