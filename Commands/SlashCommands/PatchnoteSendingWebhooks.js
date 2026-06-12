const client = require('../../index.js');
const Discord = require('discord.js');
const { MessageFlags } = require('discord.js');
const {rlw} = require('../../Interface/Builder.js')

module.exports = {
    name: 'psw',
    description: '패치노트를 웹훅으로 전송합니다.',
    /**
     * @param {client} client
     * @param {Discord.CommandInteraction} interaction
     * @param {String[]} args
        **/
    run: async (client, interaction, args) => {
        if (interaction.user.id != client.config.ownerID) return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        await rlw()
        await interaction.deleteReply()
    }
}
