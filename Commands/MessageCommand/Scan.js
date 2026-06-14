const client = require('../../index.js')
const { EmbedBuilder, Colors } = require('discord.js')
const {
    scanBL, scanSS,
    blScoreLine, ssScoreLine,
    buildBLBaseEmbed, buildSSBaseEmbed,
    revealRankedMaps, getSnapshot,
} = require('../../Function/Scan.js')
const { saveSnapshots } = require('../../Function/Snapshots.js')
const { resolveScore } = require('../../Function/Resolve.js')

const STEAM_ID_RE = /^\d{17}$/
const DISCORD_ID_RE = /^\d{15,20}$/
const MENTION_RE = /^<@!?(\d+)>$/

module.exports = {
    name: 'scan',
    aliases: ['스캔', 'tzos'],
    description: '저장된 프로필과 비교하여 BeatLeader + ScoreSaber 진행 상황을 스캔합니다',
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

        const score = await resolveScore(user_id, directScore)
        if (!score) {
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다')
                    .setDescription('`/link | >link` 로 먼저 계정을 연동해주세요.')],
            })
            return
        }

        const prevBL = getSnapshot(user_id, 'bl')
        const prevSS = getSnapshot(user_id, 'ss')

        const [blRes, ssRes] = await Promise.all([
            scanBL(score, prevBL).catch((e) => { console.warn('[scan msg] BL 실패:', e?.message ?? e); return null }),
            scanSS(score, prevSS).catch((e) => { console.warn('[scan msg] SS 실패:', e?.message ?? e); return null }),
        ])
        saveSnapshots(user_id, { bl: blRes?.newSnap, ss: ssRes?.newSnap })

        // 두 개의 별도 메시지
        let blMsg = null, ssMsg = null, baseBL = null, baseSS = null
        if (blRes) {
            baseBL = buildBLBaseEmbed({ player: blRes.player, prev: prevBL, newRanked: blRes.newRanked, isFirstScan: !prevBL })
            blMsg = await message.channel.send({ embeds: [baseBL] })
        } else {
            await message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('BeatLeader 스캔 실패')] })
        }
        if (ssRes) {
            baseSS = buildSSBaseEmbed({ player: ssRes.player, prev: prevSS, newRanked: ssRes.newRanked, isFirstScan: !prevSS })
            ssMsg = await message.channel.send({ embeds: [baseSS] })
        } else {
            await message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('ScoreSaber 스캔 실패')] })
        }

        // 신규 랭크맵 reveal (각 메시지 독립, 병렬)
        const reveals = []
        if (blRes && prevBL && blRes.newRanked.length > 0 && blMsg) {
            const lines = blRes.newRanked.map((s) => blScoreLine(s, blRes.player.name))
            reveals.push(revealRankedMaps(blMsg, baseBL, lines))
        }
        if (ssRes && prevSS && ssRes.newRanked.length > 0 && ssMsg) {
            const lines = ssRes.newRanked.map(ssScoreLine)
            reveals.push(revealRankedMaps(ssMsg, baseSS, lines))
        }
        if (reveals.length > 0) await Promise.all(reveals)
    },
}
