const client = require('../../index.js')
const { EmbedBuilder, ApplicationCommandOptionType, Colors } = require('discord.js')
const {
    scanBL, scanSS,
    blScoreLine, ssScoreLine,
    buildBLBaseEmbed, buildSSBaseEmbed,
    revealRankedMaps, getSnapshot,
} = require('../../Function/Scan.js')
const { saveSnapshots } = require('../../Function/Snapshots.js')
const { resolveScore } = require('../../Function/Resolve.js')

module.exports = {
    name: 'scan',
    description: '저장된 프로필과 비교하여 BeatLeader + ScoreSaber 진행 상황을 스캔합니다',
    options: [
        { name: 'user', description: '해당 유저의 프로필을 스캔합니다', type: ApplicationCommandOptionType.Mentionable, required: false },
        { name: 'user_id', description: '해당 UserId 의 프로필을 스캔합니다', type: ApplicationCommandOptionType.String, required: false },
        { name: 'steam_id', description: '해당 SteamId 의 프로필을 스캔합니다', type: ApplicationCommandOptionType.String, required: false },
    ],
    run: async (client, interaction) => {
        const user = interaction.options.data[0]
        let member = { user: { id: undefined } }
        let id, directScore
        if (!user) member = interaction.member
        if (user?.type == 3 && user?.name == 'user_id') member.user.id = interaction.client.users.cache.get(`${user.value}`)?.id
        if (user?.type == 3 && user?.name == 'steam_id') { id = user.value; directScore = user.value }
        if (user?.type == 9) member.user.id = user.member.id
        const user_id = member?.user?.id || id

        await interaction.deferReply()
        const score = await resolveScore(user_id, directScore)
        if (!score) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다')
                    .setDescription('`/link | >link` 로 먼저 계정을 연동하거나 `steam_id` 옵션을 사용해주세요.')],
            })
            return
        }

        const prevBL = getSnapshot(user_id, 'bl')
        const prevSS = getSnapshot(user_id, 'ss')

        // BL + SS 병렬 fetch
        const [blRes, ssRes] = await Promise.all([
            scanBL(score, prevBL).catch((e) => { console.warn('[scan slash] BL 실패:', e?.message ?? e); return null }),
            scanSS(score, prevSS).catch((e) => { console.warn('[scan slash] SS 실패:', e?.message ?? e); return null }),
        ])
        saveSnapshots(user_id, { bl: blRes?.newSnap, ss: ssRes?.newSnap })

        // BL → 첫 응답 (editReply)
        let blMsg = null
        if (blRes) {
            const base = buildBLBaseEmbed({ player: blRes.player, prev: prevBL, newRanked: blRes.newRanked, isFirstScan: !prevBL })
            blMsg = await interaction.editReply({ embeds: [base] })
        } else {
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('BeatLeader 스캔 실패')] })
        }

        // SS → followUp 으로 별도 메시지
        let ssMsg = null
        let baseSS = null
        if (ssRes) {
            baseSS = buildSSBaseEmbed({ player: ssRes.player, prev: prevSS, newRanked: ssRes.newRanked, isFirstScan: !prevSS })
            ssMsg = await interaction.followUp({ embeds: [baseSS] })
        } else {
            await interaction.followUp({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('ScoreSaber 스캔 실패')] })
        }

        // 양쪽 신규 랭크맵 reveal 병렬
        const reveals = []
        if (blRes && prevBL && blRes.newRanked.length > 0 && blMsg) {
            const baseBL = buildBLBaseEmbed({ player: blRes.player, prev: prevBL, newRanked: blRes.newRanked, isFirstScan: false })
            const lines = blRes.newRanked.map((s) => blScoreLine(s, blRes.player.name))
            reveals.push(revealRankedMaps({ edit: (p) => interaction.editReply(p) }, baseBL, lines))
        }
        if (ssRes && prevSS && ssRes.newRanked.length > 0 && ssMsg) {
            const lines = ssRes.newRanked.map(ssScoreLine)
            reveals.push(revealRankedMaps(ssMsg, baseSS, lines))
        }
        if (reveals.length > 0) await Promise.all(reveals)
    },
}
