const client = require('../../index.js')
const {
    EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType, Colors,
} = require('discord.js')
const { resolveScore } = require('../../Function/Resolve.js')
const { getTriangleHistory, fetchTriangleGif, computeTrianglePercents, fetchBLPlayer } = require('../../Function/Triangle.js')
const { respondLinkedAutocomplete } = require('../../Function/LinkedAutocomplete.js')
const { pickUserFromOptions } = require('../../Function/OptionPicker.js')

const fmtPp = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (n) => `${Number(n || 0).toFixed(2)}%`

module.exports = {
    name: 'triangle',
    description: 'BeatLeader 스킬 트라이앵글 (Tech / Acc / Pass)',
    options: [
        { name: 'linked', description: '이 서버에서 연동된 사람의 트라이앵글 (자동완성)', type: ApplicationCommandOptionType.String, required: false, autocomplete: true },
        { name: 'user', description: '해당 유저의 트라이앵글', type: ApplicationCommandOptionType.Mentionable, required: false },
        { name: 'user_id', description: '해당 UserId 의 트라이앵글', type: ApplicationCommandOptionType.String, required: false },
        { name: 'steam_id', description: '해당 SteamId 의 트라이앵글', type: ApplicationCommandOptionType.String, required: false },
    ],

    autocomplete: respondLinkedAutocomplete,

    run: async (client, interaction) => {
        const { pickedUserId, directScore } = pickUserFromOptions(interaction)
        const user_id = pickedUserId || interaction.user.id

        await interaction.deferReply()
        const score = await resolveScore(user_id, directScore)
        if (!score) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다')
                    .setDescription('`/link | >link` 로 먼저 계정을 연동하거나 `steam_id` 옵션을 사용해주세요.')],
            })
            return
        }

        let history
        try {
            history = await getTriangleHistory(score)
        } catch (err) {
            await interaction.editReply({ content: `BeatLeader 응답 실패: \`${err?.message ?? err}\`` })
            return
        }
        const latest = history?.[0]
        if (!latest) {
            await interaction.editReply({ content: '이 플레이어의 BeatLeader 트라이앵글 데이터가 없습니다.' })
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

        await interaction.editReply({ embeds: [embed], files })
    },
}
