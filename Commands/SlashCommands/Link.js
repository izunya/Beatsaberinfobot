const client = require('../../index.js')
const dbClient = require('../../db/database.js')
const axios = require('axios');
const { CommandInteraction, Colors, ButtonStyle, ButtonBuilder, ComponentType, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const { ko, en } = require('../../Languages/Langs.js');
const { writeFileSync, readFileSync, accessSync, stat } = require('fs-extra');

module.exports = {
    name: "link",
    description: "Discord에서 자신의 BeatLeader | ScoreSaber 정보를 확인해보세요!",
    options: [{
        name: 'userid',
        description: '자신의 BeatLeader | ScoreSaber ID를 입력해주세요',
        type: ApplicationCommandOptionType.String,
        required: true,
    }],
    /**
     *
     * @param {client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const beatsaber = interaction.options.getString('userid');
        await interaction.deferReply();
        if (beatsaber) {
            const embed = new EmbedBuilder()
            embed.setTitle('ERROR!')
            embed.setFooter({ text: client.config.izuna })
            try {
                const bl = await axios.get(`http://api.beatleader.xyz/player/${beatsaber}`)
                const ss = await axios.get(`http://scoresaber.com/api/player/${beatsaber}/basic`)
                let useri = bl.data
                if (bl.data.pp <= 0.5) {
                    useri = ss.data
                }
                embed.setColor(Colors.Red)
                embed.setDescription(ko.NotFoundAccount + en.NotFoundAccount)
                if (useri.pp <= 0.5) return await interaction.editReply({ embeds: [embed] })
                const yourac = new EmbedBuilder()
                yourac.setTitle(`**\`${useri.name}\`** ${ko.isYourAccount}\n**\`${useri.name}\`** ${en.isYourAccount}`)
                yourac.setColor(Colors.Blurple)
                yourac.setFooter({ text: client.config.izuna })
                const checkyes = new ButtonBuilder()
                checkyes.setCustomId('yes')
                checkyes.setStyle(ButtonStyle.Primary)
                checkyes.setLabel('네!')
                const checkno = new ButtonBuilder()
                checkno.setCustomId('no')
                checkno.setStyle(ButtonStyle.Danger)
                checkno.setLabel('아니요')
                const row = new ActionRowBuilder().addComponents([checkyes, checkno])
                await interaction.editReply({ embeds: [yourac], components: [row] }).then(() => {
                    const filter = i => { return i.user.id === interaction.member.id }
                    const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, });
                    collector.on("collect", async i => {
                        switch (i.customId) {
                            case 'yes':
                                const user = i.user.username.toLocaleLowerCase().toString().replaceAll(" ", "").replaceAll("\'", "").replaceAll("\"", "")
                                embed.setDescription(ko.Alreadysaved + en.Alreadysaved)
                                embed.setColor(Colors.Red)
                                const al = await stat(`${process.cwd()}/User/${i.user.id}.json`).catch(() => { return })
                                if (al) {
                                    await i.update({ embeds: [embed], components: [] })
                                    collector.stop()
                                    break;
                                }
                                const embed1 = new EmbedBuilder()
                                embed1.setTitle('SUCCESS')
                                embed1.setColor(Colors.Aqua)
                                embed1.setDescription(`**\`${useri.name}\`** 의 계정 정보가 디스코드와 연동되었습니다! \n확인 방법은 **%\`${useri.name}\`** 혹은 **/rank** 로 확인가능합니다!`)
                                // dbClient.query(`insert into bsscore(name,score,user_id, score_name) values('${user}','${beatsaber}','${i.user.id}','${useri.name}')`)
                                const User = {
                                    data: {
                                        name: user,
                                        score: beatsaber,
                                        user_id: i.user.id,
                                        score_name: useri.name,
                                        scores: []
                                    }
                                }
                                writeFileSync(`${process.cwd()}/User/${i.user.id}.json`, JSON.stringify(User, null, 2))
                                await i.update({ embeds: [embed1], components: [] })
                                collector.stop()
                                break
                            case 'no':
                                embed.setColor(Colors.Red)
                                embed.setDescription(ko.Canceled + en.Canceled)
                                await i.update({ embeds: [embed], components: [] })
                                collector.stop()
                                break
                        }
                    })
                })
            } catch (err) {
                console.log(err)
                embed.setColor(Colors.Red)
                embed.setDescription(ko.FormatError + en.FormatError)
                return await interaction.editReply({ embeds: [embed] })
            }
        }
    }
}