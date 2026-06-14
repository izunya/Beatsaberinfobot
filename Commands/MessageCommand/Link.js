const client = require('../../index.js')
const { introPayload, runLinkFlow } = require('../../Function/Link.js')

module.exports = {
    name: 'link',
    aliases: ['연동', '링크', 'fovh'],
    description: 'BeatLeader / ScoreSaber 계정을 디스코드와 연동합니다',
    run: async (client, message) => {
        const parent = await message.channel.send(introPayload())
        const prefix = client.config?.prefix ?? '>'
        await runLinkFlow(parent, message.author.id, prefix)
    },
}
