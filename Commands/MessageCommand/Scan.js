const client = require('../../index.js')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, Colors,
} = require('discord.js')
const {
    scanBL, scanSS,
    blScoreLine, ssScoreLine,
    buildBLBaseEmbed, buildSSBaseEmbed,
    revealRankedMaps, getSnapshot, saveSnapshot,
} = require('../../Function/Scan.js')
const { resolveScore } = require('../../Function/Resolve.js')

const STEAM_ID_RE = /^\d{17}$/
const DISCORD_ID_RE = /^\d{15,20}$/
const MENTION_RE = /^<@!?(\d+)>$/

module.exports = {
    name: 'scan',
    aliases: ['스캔', 'tzos'],
    description: '저장된 프로필과 비교하여 BeatLeader | ScoreSaber 진행 상황을 스캔합니다',
    run: async (client, message, args) => {
        let user_id = message.author.id
        let directScore
        if (args[0]) {
            const a = args[0]
            const m = a.match(MENTION_RE)
            if (m) user_id = m[1]
            else if (STEAM_ID_RE.test(a)) { user_id = a; directScore = a }
            else if (DISCORD_ID_RE.test(a)) user_id = a
        }

        const blbtn = new ButtonBuilder().setLabel('BeatLeader').setStyle(ButtonStyle.Secondary).setCustomId('scan_bl')
        const ssbtn = new ButtonBuilder().setLabel('ScoreSaber').setStyle(ButtonStyle.Secondary).setCustomId('scan_ss')
        const cancel = new ButtonBuilder().setLabel('취소').setStyle(ButtonStyle.Danger).setCustomId('scan_cancel')
        const row = new ActionRowBuilder().addComponents([blbtn, ssbtn, cancel])
        const intro = new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle('스캔할 플랫폼을 선택하세요')
            .setDescription('이전 스냅샷과 비교해서 PP/랭킹 변화와 새 랭크맵을 보여드립니다.')
        const sent = await message.channel.send({ embeds: [intro], components: [row] })

        const collector = sent.createMessageComponentCollector({
            filter: (b) => b.user.id === message.author.id,
            componentType: ComponentType.Button,
            time: 60_000,
        })
        collector.on('collect', async (button) => {
            if (button.customId === 'scan_cancel') {
                await button.update({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription('취소되었습니다.')], components: [] })
                collector.stop()
                return
            }
            blbtn.setDisabled(true); ssbtn.setDisabled(true); cancel.setDisabled(true)
            await button.update({ components: [row] })
            const score = await resolveScore(user_id, directScore)
            if (!score) {
                await sent.edit({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다').setDescription('`/link | >link` 로 먼저 계정을 연동해주세요.')], components: [] })
                collector.stop()
                return
            }
            try {
                const platform = button.customId === 'scan_bl' ? 'bl' : 'ss'
                const prev = getSnapshot(user_id, platform)
                const isFirstScan = !prev
                const result = platform === 'bl' ? await scanBL(score, prev) : await scanSS(score, prev)
                saveSnapshot(user_id, platform, result.newSnap)
                const base = (platform === 'bl' ? buildBLBaseEmbed : buildSSBaseEmbed)({ player: result.player, prev, newRanked: result.newRanked, isFirstScan })
                await sent.edit({ embeds: [base], components: [] })
                if (!isFirstScan && result.newRanked.length > 0) {
                    const lines = platform === 'bl'
                        ? result.newRanked.map((s) => blScoreLine(s, result.player.name))
                        : result.newRanked.map(ssScoreLine)
                    await revealRankedMaps(sent, base, lines)
                }
            } catch (err) {
                console.error('[scan msg] failed:', err)
                await sent.edit({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('스캔 실패').setDescription(`\`\`\`${(err?.message ?? String(err)).slice(0, 800)}\`\`\``)], components: [] })
            }
            collector.stop()
        })
    },
}
