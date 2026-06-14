const client = require('../../index.js')
const { MessageFlags } = require('discord.js')
const { introPayload, runLinkFlow } = require('../../Function/Link.js')

module.exports = {
    name: 'link',
    description: 'BeatLeader / ScoreSaber 계정을 디스코드와 연동합니다',
    run: async (client, interaction) => {
        await interaction.reply({ ...introPayload(), flags: MessageFlags.Ephemeral })
        const parent = await interaction.fetchReply()
        const prefix = client.config?.prefix ?? '>'
        await runLinkFlow(parent, interaction.user.id, prefix)
    },
}
