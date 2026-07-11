const client = require('../../index.js')
const { EmbedBuilder, Colors } = require('discord.js')
const { resolveScore } = require('../../Function/Resolve.js')
const { fetchAnalyze } = require('../../Function/Recommend.js')
const { createInitial, TAB_ORDER } = require('../../Function/RecommendPager.js')

const STEAM_ID_RE = /^\d{17}$/
const DISCORD_ID_RE = /^\d{15,20}$/
const MENTION_RE = /^<@!?(\d+)>$/
const TAB_ALIAS = {
    update: 'update', 갱신: 'update', u: 'update',
    unplayed: 'unplayed', 미기록: 'unplayed', try: 'unplayed', t: 'unplayed',
    old: 'old', 오래된: 'old', o: 'old',
}

module.exports = {
    name: 'rec',
    aliases: ['추천', 'recommend', 'zpcns'],
    description: '추천곡 (기록 갱신 / 미기록 / 오래된) 을 이미지로 보여줍니다',
    run: async (client, message, args) => {
        let user_id = message.author.id
        let directScore
        let tab = 'update'
        for (const a of args) {
            const t = TAB_ALIAS[a?.toLowerCase()]
            if (t) { tab = t; continue }
            const m = a.match(MENTION_RE)
            if (m) { user_id = m[1]; continue }
            if (STEAM_ID_RE.test(a)) { user_id = a; directScore = a; continue }
            if (DISCORD_ID_RE.test(a)) { user_id = a; continue }
        }
        if (!TAB_ORDER.includes(tab)) tab = 'update'

        const score = await resolveScore(user_id, directScore)
        if (!score) {
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다')
                    .setDescription('`/link | >link` 로 먼저 계정을 연동해주세요.')],
            })
            return
        }

        let analyze
        try {
            analyze = await fetchAnalyze(score)
        } catch (e) {
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('추천곡 API 실패')
                    .setDescription(`\`${e?.message ?? e}\``)],
            })
            return
        }

        try {
            const payload = await createInitial(analyze, tab)
            await message.channel.send(payload)
        } catch (e) {
            console.warn('[rec msg] render 실패:', e?.message ?? e)
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('이미지 렌더링 실패')
                    .setDescription(`\`${e?.message ?? e}\``)],
            })
        }
    },
}
