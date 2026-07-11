const client = require('../../index.js')
const { EmbedBuilder, AttachmentBuilder, Colors } = require('discord.js')
const { resolveScore } = require('../../Function/Resolve.js')
const { getTriangleHistory, fetchTriangleGif, computeTrianglePercents, fetchBLPlayer } = require('../../Function/Triangle.js')

const STEAM_ID_RE = /^\d{17}$/
const DISCORD_ID_RE = /^\d{15,20}$/
const MENTION_RE = /^<@!?(\d+)>$/

const fmtPp = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (n) => `${Number(n || 0).toFixed(2)}%`

module.exports = {
    name: 'triangle',
    aliases: ['트라이앵글', '삼각'],
    description: 'BeatLeader 스킬 트라이앵글 (Tech / Acc / Pass)',
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

        let history
        try {
            history = await getTriangleHistory(score)
        } catch (err) {
            await message.channel.send({ content: `BeatLeader 응답 실패: \`${err?.message ?? err}\`` })
            return
        }
        const latest = history?.[0]
        if (!latest) {
            await message.channel.send({ content: '이 플레이어의 BeatLeader 트라이앵글 데이터가 없습니다.' })
            return
        }

        const player = await fetchBLPlayer(score)
        const { techPp = 0, accPp = 0, passPp = 0, pp = 0 } = latest
        const pct = computeTrianglePercents({ techPp, accPp, passPp })

        const embed = new EmbedBuilder()
            .setColor(0xb4004e)
            .setAuthor({
                name: `${player.name ?? '(unknown)'} — Skill Triangle`,
                url: `https://beatleader.xyz/u/${score}`,
                iconURL: player.avatar || undefined,
            })
            .addFields(
                { name: '🔴 Tech', value: `**${fmtPp(techPp)}pp**\n${fmtPct(pct.tech)}`, inline: true },
                { name: '🔵 Acc', value: `**${fmtPp(accPp)}pp**\n${fmtPct(pct.acc)}`, inline: true },
                { name: '🟢 Pass', value: `**${fmtPp(passPp)}pp**\n${fmtPct(pct.pass)}`, inline: true },
            )
            .setFooter({ text: `Total ${fmtPp(pp)}pp · BeatLeader` })

        const files = []
        const gif = await fetchTriangleGif(score)
        if (gif) {
            files.push(new AttachmentBuilder(gif, { name: 'triangle.gif' }))
            embed.setImage('attachment://triangle.gif')
        }

        await message.channel.send({ embeds: [embed], files })
    },
}
