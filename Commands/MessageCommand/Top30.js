const client = require('../../index.js')
const { EmbedBuilder, AttachmentBuilder, Colors } = require('discord.js')
const { resolveScore } = require('../../Function/Resolve.js')
const { fetchAnalyze } = require('../../Function/Recommend.js')
const { renderTop30PNG } = require('../../Function/Top30Render.js')

const STEAM_ID_RE = /^\d{17}$/
const DISCORD_ID_RE = /^\d{15,20}$/
const MENTION_RE = /^<@!?(\d+)>$/

module.exports = {
    name: 'top30',
    aliases: ['성과표', 'sh'],
    description: 'ScoreSaber Top 30 성과표를 이미지로 보여줍니다',
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

        let analyze
        try {
            analyze = await fetchAnalyze(score)
        } catch (e) {
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('분석 API 실패').setDescription(`\`${e?.message ?? e}\``)],
            })
            return
        }

        try {
            const png = await renderTop30PNG(analyze)
            const name = `top30-${analyze?.player?.id ?? score}.png`
            await message.channel.send({ files: [new AttachmentBuilder(png, { name })] })
        } catch (e) {
            console.warn('[top30 msg] render 실패:', e?.message ?? e)
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('이미지 렌더링 실패').setDescription(`\`${e?.message ?? e}\``)],
            })
        }
    },
}
