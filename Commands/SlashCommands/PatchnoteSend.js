const client = require('../../index.js');
const Discord = require('discord.js');
const {rl} = require('../../Interface/Builder.js')

module.exports = {
    name: 'ps',
    description: '패치노트를 전송합니다.',
    /**
     * @param {client} client
     * @param {Discord.CommandInteraction} interaction
     * @param {String[]} args
        **/
    run: async (client, interaction, args) => {
        if (interaction.user.id != client.config.ownerID) return;
        await rl(interaction)
    }
}
