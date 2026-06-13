const client = require('../../index.js')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, ApplicationCommandOptionType, Colors, MessageFlags,
} = require('discord.js')
const {
    scanBL, scanSS,
    blScoreLine, ssScoreLine,
    buildBLBaseEmbed, buildSSBaseEmbed,
    revealRankedMaps, getSnapshot, saveSnapshot,
} = require('../../Function/Scan.js')
const { resolveScore } = require('../../Function/Resolve.js')

module.exports = {
    name: 'scan',
    description: '저장된 프로필과 비교하여 BeatLeader | ScoreSaber 진행 상황을 스캔합니다',
    options: [
        { name: 'user', description: '해당 유저의 프로필을 스캔합니다', type: ApplicationCommandOptionType.Mentionable, required: false },
        { name: 'user_id', description: '해당 UserId 의 프로필을 스캔합니다', type: ApplicationCommandOptionType.String, required: false },
        { name: 'steam_id', description: '해당 SteamId 의 프로필을 스캔합니다', type: ApplicationCommandOptionType.String, required: false },
    ],
    run: async (client, interaction, args) => {
        const user = interaction.options.data[0]
        let member = { user: { id: undefined } }
        let id, directScore
        if (!user) member = interaction.member
        if (user?.type == 3 && user?.name == 'user_id') member.user.id = interaction.client.users.cache.get(`${user.value}`)?.id
        if (user?.type == 3 && user?.name == 'steam_id') { id = user.value; directScore = user.value }
        if (user?.type == 9) member.user.id = user.member.id
        const user_id = member?.user?.id || id

        const blbtn = new ButtonBuilder().setLabel('BeatLeader').setStyle(ButtonStyle.Secondary).setCustomId('scan_bl')
        const ssbtn = new ButtonBuilder().setLabel('ScoreSaber').setStyle(ButtonStyle.Secondary).setCustomId('scan_ss')
        const cancel = new ButtonBuilder().setLabel('취소').setStyle(ButtonStyle.Danger).setCustomId('scan_cancel')
        const row = new ActionRowBuilder().addComponents([blbtn, ssbtn, cancel])

        const intro = new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle('스캔할 플랫폼을 선택하세요')
            .setDescription('이전 스냅샷과 비교해서 PP/랭킹 변화와 새 랭크맵을 보여드립니다.')
        await interaction.reply({ embeds: [intro], components: [row], flags: MessageFlags.Ephemeral })
        const replyMsg = await interaction.fetchReply()

        const collector = replyMsg.createMessageComponentCollector({
            filter: (b) => b.user.id === interaction.user.id,
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
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동된 계정을 찾을 수 없습니다').setDescription('`/link | >link` 로 먼저 계정을 연동하거나 `steam_id` 옵션을 사용해주세요.')], components: [] })
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
                await interaction.editReply({ embeds: [base], components: [] })
                if (!isFirstScan && result.newRanked.length > 0) {
                    const lines = platform === 'bl'
                        ? result.newRanked.map((s) => blScoreLine(s, result.player.name))
                        : result.newRanked.map(ssScoreLine)
                    // ephemeral 응답 → interaction.editReply 사용
                    await revealRankedMaps({ edit: (payload) => interaction.editReply(payload) }, base, lines)
                }
            } catch (err) {
                console.error('[scan slash] failed:', err)
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('스캔 실패').setDescription(`\`\`\`${(err?.message ?? String(err)).slice(0, 800)}\`\`\``)], components: [] })
            }
            collector.stop()
        })
    },
}
