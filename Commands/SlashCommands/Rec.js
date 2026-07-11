const client = require('../../index.js')
const { EmbedBuilder, ApplicationCommandOptionType, Colors } = require('discord.js')
const { resolveScore } = require('../../Function/Resolve.js')
const { respondLinkedAutocomplete } = require('../../Function/LinkedAutocomplete.js')
const { fetchAnalyze } = require('../../Function/Recommend.js')
const { createInitial, TAB_ORDER } = require('../../Function/RecommendPager.js')
const { pickUserFromOptions } = require('../../Function/OptionPicker.js')

module.exports = {
    name: 'rec',
    description: '추천곡 (기록 갱신 / 미기록 / 오래된) 을 이미지로 보여줍니다',
    options: [
        { name: 'tab', description: '초기 탭', type: ApplicationCommandOptionType.String, required: false, choices: [
            { name: '기록 갱신', value: 'update' },
            { name: '미기록 추천', value: 'unplayed' },
            { name: '오래된 기록', value: 'old' },
        ] },
        { name: 'linked', description: '이 서버에서 연동된 사람 (자동완성)', type: ApplicationCommandOptionType.String, required: false, autocomplete: true },
        { name: 'user', description: '해당 유저', type: ApplicationCommandOptionType.Mentionable, required: false },
        { name: 'user_id', description: '해당 UserId', type: ApplicationCommandOptionType.String, required: false },
        { name: 'steam_id', description: '해당 SteamId', type: ApplicationCommandOptionType.String, required: false },
    ],

    autocomplete: respondLinkedAutocomplete,

    run: async (client, interaction) => {
        const { pickedUserId, directScore, extras } = pickUserFromOptions(interaction, ['tab'])
        const tab = TAB_ORDER.includes(extras.tab) ? extras.tab : 'update'
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

        let analyze
        try {
            analyze = await fetchAnalyze(score)
        } catch (e) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('추천곡 API 실패')
                    .setDescription(`\`${e?.message ?? e}\``)],
            })
            return
        }

        try {
            const payload = await createInitial(analyze, tab)
            await interaction.editReply(payload)
        } catch (e) {
            console.warn('[rec slash] render 실패:', e?.message ?? e)
            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('이미지 렌더링 실패')
                    .setDescription(`\`${e?.message ?? e}\``)],
            })
        }
    },
}
