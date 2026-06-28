const { Events } = require('discord.js')
const client = require('../index.js')
const { handleButton } = require('../Function/RankedPager.js')

module.exports = { name: 'RankedPager' }

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return
    if (!interaction.customId?.startsWith('bsi:rmap:')) return
    try {
        await handleButton(interaction)
    } catch (err) {
        console.error('[ranked pager]', err?.message ?? err)
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '오류가 발생했습니다.', ephemeral: true })
            }
        } catch (_) { /* swallow */ }
    }
})
