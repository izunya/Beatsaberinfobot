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
    description: '연동된 본인 계정의 BeatLeader + ScoreSaber 진행 상황을 스캔합니다',
    run: async (client, interaction) => {
        const user_id = interaction.user.id

        await interaction.deferReply()
        const score = await resolveScore(user_id)
        if (!score) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다')
                    .setDescription('`/link | >link` 로 먼저 계정을 연동해주세요.')],
            })
            return
        }

        const prevBL = getSnapshot(user_id, 'bl')
        const prevSS = getSnapshot(user_id, 'ss')

        const [blRes, ssRes] = await Promise.all([
            scanBL(score, prevBL).catch((e) => { console.warn('[scan slash] BL 실패:', e?.message ?? e); return null }),
            scanSS(score, prevSS).catch((e) => { console.warn('[scan slash] SS 실패:', e?.message ?? e); return null }),
        ])
        saveSnapshots(user_id, { bl: blRes?.newSnap, ss: ssRes?.newSnap })

        const sections = []
        if (!blRes) sections.push({ kind: 'error', name: 'BeatLeader' })
        else if (hasBLChange(blRes.player, prevBL, blRes.newRanked)) sections.push({ kind: 'bl' })
        if (!ssRes) sections.push({ kind: 'error', name: 'ScoreSaber' })
        else if (hasSSChange(ssRes.player, prevSS, ssRes.newRanked)) sections.push({ kind: 'ss' })

        if (sections.length === 0) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(Colors.Grey).setTitle('변동 사항 없음')
                    .setDescription('이전 스캔 이후 새로운 변화가 없습니다.')],
            })
            return
        }

        const reveals = []
        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i]
            const isFirst = i === 0

            if (sec.kind === 'error') {
                const payload = { embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle(`${sec.name} 스캔 실패`)] }
                if (isFirst) await interaction.editReply(payload)
                else await interaction.followUp(payload)
                continue
            }

            if (sec.kind === 'bl') {
                const base = buildBLBaseEmbed({ player: blRes.player, prev: prevBL, newRanked: blRes.newRanked, isFirstScan: !prevBL })
                let editTarget
                if (isFirst) { await interaction.editReply({ embeds: [base] }); editTarget = { edit: (p) => interaction.editReply(p) } }
                else { editTarget = await interaction.followUp({ embeds: [base] }) }
                if (prevBL && blRes.newRanked.length > 0) {
                    const lines = blRes.newRanked.map((s) => blScoreLine(s, blRes.player.name))
                    reveals.push(revealRankedSection(editTarget, base, lines, {
                        headerName: '새 랭크맵 (BL)', playerName: blRes.player.name,
                    }))
                }
                continue
            }

            if (sec.kind === 'ss') {
                const base = buildSSBaseEmbed({ player: ssRes.player, prev: prevSS, newRanked: ssRes.newRanked, isFirstScan: !prevSS })
                let editTarget
                if (isFirst) { await interaction.editReply({ embeds: [base] }); editTarget = { edit: (p) => interaction.editReply(p) } }
                else { editTarget = await interaction.followUp({ embeds: [base] }) }
                if (prevSS && ssRes.newRanked.length > 0) {
                    const lines = ssRes.newRanked.map(ssScoreLine)
                    reveals.push(revealRankedSection(editTarget, base, lines, {
                        headerName: '새 랭크맵 (SS)', playerName: ssRes.player.name,
                    }))
                }
            }
        }
        if (reveals.length > 0) await Promise.all(reveals)
    },
}
