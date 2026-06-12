const client = require('../../index.js')
const dbClient = require('../../db/database.js')
const axios = require('axios');
const { CommandInteraction, Colors, ButtonStyle, ButtonBuilder, ComponentType, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const { ko, en } = require('../../Languages/Langs.js');
const { writeFileSync, readFileSync, accessSync, stat } = require('fs-extra');
const { scanBL, scanSS } = require('../../Function/Scan.js');
const { saveSnapshot } = require('../../Function/Snapshots.js');

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
                                // 다른 디스코드 유저가 이미 같은 플레이어 ID 연동했는지 검사
                                try {
                                    const taken = await dbClient.query(
                                        'SELECT user_id FROM bsscore WHERE score = $1 LIMIT 1',
                                        [beatsaber]
                                    )
                                    if (taken.rows.length > 0 && taken.rows[0].user_id !== i.user.id) {
                                        embed.setColor(Colors.Red)
                                        embed.setDescription('이 플레이어 ID 는 이미 다른 유저가 연동했습니다.')
                                        await i.update({ embeds: [embed], components: [] })
                                        collector.stop()
                                        break;
                                    }
                                } catch (e) { console.warn('[link] 중복 검사 실패:', e?.message ?? e) }
                                const embed1 = new EmbedBuilder()
                                embed1.setTitle('SUCCESS')
                                embed1.setColor(Colors.Aqua)
                                embed1.setDescription(`**\`${useri.name}\`** 의 계정 정보가 디스코드와 연동되었습니다!\n\`/rank | ${client.config?.prefix ?? '>'}rank\`, \`/scan | ${client.config?.prefix ?? '>'}scan\` 으로 확인 가능합니다.`)
                                await dbClient.query(
                                    `INSERT INTO bsscore (user_id, name, score, score_name)
                                     VALUES ($1, $2, $3, $4)
                                     ON CONFLICT (user_id) DO UPDATE
                                     SET name = EXCLUDED.name,
                                         score = EXCLUDED.score,
                                         score_name = EXCLUDED.score_name`,
                                    [i.user.id, user, beatsaber, useri.name]
                                )
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
                                // 초기 스냅샷 저장 — /rank 즉시 사용 가능하도록
                                const [blInit, ssInit] = await Promise.all([
                                    scanBL(beatsaber, null).catch((e) => { console.warn('[link] BL initial scan 실패:', e?.message ?? e); return null }),
                                    scanSS(beatsaber, null).catch((e) => { console.warn('[link] SS initial scan 실패:', e?.message ?? e); return null }),
                                ])
                                if (blInit) saveSnapshot(i.user.id, 'bl', blInit.newSnap)
                                if (ssInit) saveSnapshot(i.user.id, 'ss', ssInit.newSnap)
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