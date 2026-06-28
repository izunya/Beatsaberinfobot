const client = require('../../index.js')
const { EmbedBuilder, Colors } = require('discord.js')
const {
    scanBL, scanSS,
    blScoreLine, ssScoreLine,
    buildBLBaseEmbed, buildSSBaseEmbed,
    revealRankedSection, hasBLChange, hasSSChange, getSnapshot,
} = require('../../Function/Scan.js')
const { saveSnapshots } = require('../../Function/Snapshots.js')
const { resolveScore } = require('../../Function/Resolve.js')

module.exports = {
    name: 'scan',
    aliases: ['스캔', 'tzos'],
    description: '연동된 본인 계정의 BeatLeader + ScoreSaber 진행 상황을 스캔합니다',
    run: async (client, message) => {
        const user_id = message.author.id

        const score = await resolveScore(user_id)
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

        const showBL = blRes && hasBLChange(blRes.player, prevBL, blRes.newRanked)
        const showSS = ssRes && hasSSChange(ssRes.player, prevSS, ssRes.newRanked)

        if (blRes && ssRes && !showBL && !showSS) {
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Grey).setTitle('변동 사항 없음')
                    .setDescription('이전 스캔 이후 새로운 변화가 없습니다.')],
            })
            return
        }

        const reveals = []
        if (!blRes) {
            await message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('BeatLeader 스캔 실패')] })
        } else if (showBL) {
            const base = buildBLBaseEmbed({ player: blRes.player, prev: prevBL, newRanked: blRes.newRanked, isFirstScan: !prevBL })
            const msg = await message.channel.send({ embeds: [base] })
            if (prevBL && blRes.newRanked.length > 0) {
                const lines = blRes.newRanked.map((s) => blScoreLine(s, blRes.player.name))
                reveals.push(revealRankedSection(msg, base, lines, {
                    headerName: '새 랭크맵 (BL)', playerName: blRes.player.name,
                }))
            }
        }
        if (!ssRes) {
            await message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('ScoreSaber 스캔 실패')] })
        } else if (showSS) {
            const base = buildSSBaseEmbed({ player: ssRes.player, prev: prevSS, newRanked: ssRes.newRanked, isFirstScan: !prevSS })
            const msg = await message.channel.send({ embeds: [base] })
            if (prevSS && ssRes.newRanked.length > 0) {
                const lines = ssRes.newRanked.map(ssScoreLine)
                reveals.push(revealRankedSection(msg, base, lines, {
                    headerName: '새 랭크맵 (SS)', playerName: ssRes.player.name,
                }))
            }
        }
        if (reveals.length > 0) await Promise.all(reveals)
    },
}
