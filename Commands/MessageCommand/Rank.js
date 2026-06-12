const client = require('../../index.js')
const { bl, ss } = require('../../Function/Scores.js')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, Colors,
} = require('discord.js')

const STEAM_ID_RE = /^\d{17}$/
const DISCORD_ID_RE = /^\d{15,20}$/
const MENTION_RE = /^<@!?(\d+)>$/

module.exports = {
    name: 'rank',
    aliases: ['랭크', 'ㄱ뮤'],
    description: 'BeatLeader | ScoreSaber 정보를 조회합니다',
    run: async (client, message, args) => {
        let user_id = message.author.id
        let directScore
        if (args[0]) {
            const a = args[0]
            const m = a.match(MENTION_RE)
            if (m) {
                user_id = m[1]
            } else if (STEAM_ID_RE.test(a)) {
                user_id = a
                directScore = a
            } else if (DISCORD_ID_RE.test(a)) {
                user_id = a
            }
        }

        const blbtn = new ButtonBuilder().setLabel('BeatLeader').setStyle(ButtonStyle.Secondary).setCustomId('bl')
        const ssbtn = new ButtonBuilder().setLabel('ScoreSaber').setStyle(ButtonStyle.Secondary).setCustomId('ss')
        const cancel = new ButtonBuilder().setLabel('취소').setStyle(ButtonStyle.Danger).setCustomId('cancel')
        const row = new ActionRowBuilder().addComponents([blbtn, ssbtn, cancel])

        const intro = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle('BeatLeader | ScoreSaber')
            .setDescription('아래 버튼을 선택해보세요!')
        const sent = await message.channel.send({ embeds: [intro], components: [row] })

        const collector = sent.createMessageComponentCollector({
            filter: (b) => b.user.id === message.author.id,
            componentType: ComponentType.Button,
            time: 60_000,
        })

        collector.on('collect', async (button) => {
            if (button.customId === 'cancel') {
                await button.update({
                    embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription('취소되었습니다.')],
                    components: [],
                })
                collector.stop()
                return
            }
            blbtn.setDisabled(true); ssbtn.setDisabled(true); cancel.setDisabled(true)
            await button.update({ components: [row] })
            try {
                if (button.customId === 'bl') {
                    const embed = await bl(user_id, directScore)
                    await button.channel.send({ embeds: [embed], content: `${button.user}` })
                } else if (button.customId === 'ss') {
                    const embed = await ss(user_id, directScore)
                    await button.channel.send({ embeds: [embed], content: `${button.user}` })
                }
                await sent.delete().catch(() => { })
            } catch (e) {
                console.error('[rank msg] failed:', e)
                await button.channel.send({
                    embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('조회 실패').setDescription(`\`\`\`${(e?.message ?? String(e)).slice(0, 800)}\`\`\``)],
                })
            }
            collector.stop()
        })
    },
}
