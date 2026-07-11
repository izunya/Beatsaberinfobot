const client = require('../../index.js')
const { bl, ss } = require('../../Function/Scores.js')
const { respondLinkedAutocomplete } = require('../../Function/LinkedAutocomplete.js')
const { pickUserFromOptions } = require('../../Function/OptionPicker.js')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, ApplicationCommandOptionType, Colors, MessageFlags,
} = require('discord.js')

module.exports = {
    name: 'rank',
    description: 'Discord에서 자신의 BeatLeader | ScoreSaber 정보를 확인하세요!',
    options: [
        {
            name: 'linked',
            description: '이 서버에서 연동된 사람의 정보를 확인합니다 (이름 입력 → 자동완성)',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true,
        },
        {
            name: 'user',
            description: '해당 유저의 BeatLeader | ScoreSaber 정보를 확인해보세요!',
            type: ApplicationCommandOptionType.Mentionable,
            required: false,
        },
        {
            name: 'user_id',
            description: '해당 UserId를 가진 유저의 BeatLeader | ScoreSaber 정보를 확인해보세요!',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: 'steam_id',
            description: '해당 SteamId를 가진 유저의 BeatLeader | ScoreSaber 정보를 확인해보세요!',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],

    autocomplete: respondLinkedAutocomplete,

    run: async (client, interaction) => {
        const { pickedUserId, directScore } = pickUserFromOptions(interaction)
        const user_id = pickedUserId || interaction.user.id

        const blbutton = new ButtonBuilder().setLabel('BeatLeader').setStyle(ButtonStyle.Secondary).setCustomId('bl')
        const ssbutton = new ButtonBuilder().setLabel('ScoreSaber').setStyle(ButtonStyle.Secondary).setCustomId('ss')
        const cancel = new ButtonBuilder().setLabel('취소').setStyle(ButtonStyle.Danger).setCustomId('cancel')
        const row = new ActionRowBuilder().addComponents([blbutton, ssbutton, cancel])
        const embed = new EmbedBuilder().setColor(Colors.Green).setTitle('BeatLeader | ScoreSaber').setDescription('아래 버튼을 선택해보세요!')

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral }).then((i) => {
            const filter = (button) => button.user.id === interaction.user.id
            const collector = i.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 })
            collector.on('collect', async (button) => {
                if (button.customId === 'bl') {
                    blbutton.setDisabled(true); ssbutton.setDisabled(true)
                    await button.update({ components: [row] })
                    const blembed = await bl(user_id, directScore)
                    await button.channel.send({ embeds: [blembed], components: [], content: `${button.user}` })
                    await button.deleteReply()
                } else if (button.customId === 'ss') {
                    blbutton.setDisabled(true); ssbutton.setDisabled(true)
                    await button.update({ components: [row] })
                    const ssembed = await ss(user_id, directScore)
                    await button.channel.send({ embeds: [ssembed], components: [], content: `${button.user}` })
                    await button.deleteReply()
                } else if (button.customId === 'cancel') {
                    await button.deferUpdate()
                    await button.deleteReply()
                }
            })
        })
    },
}
