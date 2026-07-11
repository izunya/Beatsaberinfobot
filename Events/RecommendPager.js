const { Events } = require('discord.js')
const client = require('../index.js')
const { handleButton } = require('../Function/RecommendPager.js')

module.exports = { name: 'RecommendPager' }

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return
    if (!interaction.customId?.startsWith('bsi:rec:')) return
    try {
        await handleButton(interaction)
    } catch (err) {
        console.error('[rec pager]', err?.message ?? err)
    }
})
