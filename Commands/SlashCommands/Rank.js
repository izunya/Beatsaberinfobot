const client = require('../../index.js')
const { bl, ss } = require('../../Function/Scores.js')
const { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, ComponentType, ApplicationCommandOptionType, Colors, MessageFlags, } = require('discord.js')

module.exports = {
    name: 'rank',
    description: 'Discord에서 자신의 BeatLeader | ScoreSaber 정보를 확인하세요!',
    options: [{
        name: 'user',
        description: `해당 유저의 BeatLeader | ScoreSaber 정보를 확인해보세요!`,
        type: ApplicationCommandOptionType.Mentionable,
        required: false,
    },
    {
        name: 'user_id',
        description: '해당 UserId를 가진 유저의 BeatLeader | ScoreSaber 정보를 확인해보세요!',
        type: ApplicationCommandOptionType.String,
        required: false
    },
    {
        name: 'steam_id',
        description: '해당 SteamId를 가진 유저의 BeatLeader | ScoreSaber 정보를 확인해보세요!',
        type: ApplicationCommandOptionType.String,
        required: false

    }],
    /**
     * @param {client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     * */
    run: async (client, interaction, args) => {
        const user = interaction.options.data[0]
        let member = { user: { id: undefined } }
        let id = undefined
        if (!user) member = interaction.member
        if (user?.type == 3 && user?.name == 'user_id') member.user.id = interaction.client.users.cache.get(`${user.value}`)?.id
        if (user?.type == 3 && user?.name == 'steam_id') id = user.value
        if (user?.type == 9) member.user.id = user.member.id
        const user_id = member?.user?.id || id
        const blbutton = new ButtonBuilder()
        blbutton.setLabel('BeatLeader')
        blbutton.setStyle(ButtonStyle.Secondary)
        blbutton.setCustomId("bl")
        const ssbutton = new ButtonBuilder()
        ssbutton.setLabel('ScoreSaber')
        ssbutton.setStyle(ButtonStyle.Secondary)
        ssbutton.setCustomId("ss")
        const cancel = new ButtonBuilder()
        cancel.setLabel("취소")
        cancel.setStyle(ButtonStyle.Danger)
        cancel.setCustomId("cancel")
        const row = new ActionRowBuilder().addComponents([blbutton, ssbutton, cancel]);
        const embed = new EmbedBuilder()
        embed.setColor(Colors.Green)
        embed.setTitle('BeatLeader | ScoreSaber')
        embed.setDescription('아래 버튼을 선택해보세요!')
        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral }).then(i => {
            const filter = (button) => button.user.id === interaction.user.id;
            const collector = i.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });
            collector.on('collect', async (button) => {
                if (button.customId === 'bl') {
                    blbutton.setDisabled(true)
                    ssbutton.setDisabled(true)
                    await button.update({ components: [row] })
                    const blembed = await bl(user_id)
                    await button.channel.send({ embeds: [blembed], components: [], content: `${button.user}` })
                    await button.deleteReply()
                    return;
                } else if (button.customId === 'ss') {
                    blbutton.setDisabled(true)
                    ssbutton.setDisabled(true)
                    await button.update({ components: [row] })
                    const ssembed = await ss(user_id)
                    await button.channel.send({ embeds: [ssembed], components: [], content: `${button.user}` })
                    await button.deleteReply()
                    return;
                } else if (button.customId === 'cancel') {
                    await button.deferUpdate()
                    await button.deleteReply()
                }
            })
        })
    }
}
