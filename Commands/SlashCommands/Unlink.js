const client = require('../../index.js')
const dbClient = require('../../db/database.js')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, Colors, MessageFlags,
} = require('discord.js')
const { removeSync, statSync } = require('fs-extra')
const { userFilePath } = require('../../Function/Snapshots.js')

module.exports = {
    name: 'unlink',
    description: '연동된 BeatLeader / ScoreSaber 계정을 해제합니다 (스냅샷도 함께 삭제)',
    run: async (client, interaction) => {
        const id = interaction.user.id

        // 연동 여부 확인 (JSON 파일 or DB)
        let linked = false
        let scoreName = null
        try { statSync(userFilePath(id)); linked = true } catch (_) { }
        try {
            const r = await dbClient.query('SELECT score_name FROM bsscore WHERE user_id = $1', [id])
            if (r.rows.length > 0) { linked = true; scoreName = r.rows[0].score_name }
        } catch (e) { console.warn('[unlink] DB lookup 실패:', e?.message ?? e) }

        if (!linked) {
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(Colors.Orange).setTitle('연동 정보 없음')
                    .setDescription('현재 연동된 계정이 없습니다.')],
                flags: MessageFlags.Ephemeral,
            })
            return
        }

        const yes = new ButtonBuilder().setCustomId('unlink_yes').setStyle(ButtonStyle.Danger).setLabel('해제')
        const no = new ButtonBuilder().setCustomId('unlink_no').setStyle(ButtonStyle.Secondary).setLabel('취소')
        const row = new ActionRowBuilder().addComponents([yes, no])

        const confirm = new EmbedBuilder()
            .setColor(Colors.Orange)
            .setTitle('연동 해제 확인')
            .setDescription(`정말 연동을 해제하시겠습니까?${scoreName ? `\n현재 연동: **\`${scoreName}\`**` : ''}\n저장된 BL/SS 스냅샷도 함께 삭제됩니다.`)

        await interaction.reply({ embeds: [confirm], components: [row], flags: MessageFlags.Ephemeral })
        const replyMsg = await interaction.fetchReply()
        const collector = replyMsg.createMessageComponentCollector({
            filter: (b) => b.user.id === id,
            componentType: ComponentType.Button,
            time: 60_000,
        })
        collector.on('collect', async (button) => {
            if (button.customId === 'unlink_no') {
                await button.update({
                    embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription('취소되었습니다.')],
                    components: [],
                })
                collector.stop()
                return
            }
            try {
                try { removeSync(userFilePath(id)) } catch (e) { console.warn('[unlink] 파일 삭제 실패:', e?.message ?? e) }
                await dbClient.query('DELETE FROM bsscore WHERE user_id = $1', [id])
                await button.update({
                    embeds: [new EmbedBuilder().setColor(Colors.Green).setTitle('연동 해제 완료')
                        .setDescription('연동 정보와 스냅샷이 모두 삭제되었습니다. 다시 사용하려면 `/link | >link` 로 연동해주세요.')],
                    components: [],
                })
            } catch (err) {
                console.error('[unlink] failed:', err)
                await button.update({
                    embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('해제 실패').setDescription(`\`\`\`${(err?.message ?? String(err)).slice(0, 800)}\`\`\``)],
                    components: [],
                })
            }
            collector.stop()
        })
    },
}
