const client = require('../../index.js')
const dbClient = require('../../db/database.js')
const axios = require('axios')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, Colors,
} = require('discord.js')
const { ko, en } = require('../../Languages/Langs.js')
const { writeFileSync, stat } = require('fs-extra')
const { scanBL, scanSS } = require('../../Function/Scan.js')
const { saveSnapshots } = require('../../Function/Snapshots.js')

module.exports = {
    name: 'link',
    aliases: ['연동', '링크', 'fovh'],
    description: 'BeatLeader / ScoreSaber 플레이어 ID 를 연동합니다 (인자: 플레이어 ID)',
    run: async (client, message, args) => {
        const beatsaber = args[0]
        if (!beatsaber) {
            await message.channel.send({
                embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('사용법').setDescription(`\`${client.config?.prefix ?? '>'}link <BeatLeader/ScoreSaber 플레이어 ID>\``)],
            })
            return
        }
        const embed = new EmbedBuilder().setTitle('ERROR!').setFooter({ text: client.config.izuna })
        try {
            const bl = await axios.get(`https://api.beatleader.xyz/player/${beatsaber}`)
            const ss = await axios.get(`https://scoresaber.com/api/v2/players/${beatsaber}`)
            let useri = bl.data
            if ((bl.data?.pp ?? 0) <= 0.5) useri = { ...ss.data, name: ss.data?.name }
            embed.setColor(Colors.Red)
            embed.setDescription(ko.NotFoundAccount + en.NotFoundAccount)
            const hasPP = (bl.data?.pp ?? 0) > 0.5 || (ss.data?.stats?.totalPP ?? 0) > 0.5
            if (!hasPP) return await message.channel.send({ embeds: [embed] })
            const yourac = new EmbedBuilder()
                .setTitle(`**\`${useri.name}\`** ${ko.isYourAccount}\n**\`${useri.name}\`** ${en.isYourAccount}`)
                .setColor(Colors.Blurple)
                .setFooter({ text: client.config.izuna })
            const yes = new ButtonBuilder().setCustomId('yes').setStyle(ButtonStyle.Primary).setLabel('네!')
            const no = new ButtonBuilder().setCustomId('no').setStyle(ButtonStyle.Danger).setLabel('아니요')
            const row = new ActionRowBuilder().addComponents([yes, no])
            const sent = await message.channel.send({ embeds: [yourac], components: [row] })

            const collector = sent.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                componentType: ComponentType.Button,
                time: 60_000,
            })
            collector.on('collect', async (i) => {
                if (i.customId === 'no') {
                    embed.setColor(Colors.Red).setDescription(ko.Canceled + en.Canceled)
                    await i.update({ embeds: [embed], components: [] })
                    collector.stop()
                    return
                }
                if (i.customId === 'yes') {
                    const user = i.user.username.toLocaleLowerCase().replaceAll(' ', '').replaceAll("'", '').replaceAll('"', '')
                    const al = await stat(`${process.cwd()}/User/${i.user.id}.json`).catch(() => null)
                    if (al) {
                        embed.setDescription(ko.Alreadysaved + en.Alreadysaved).setColor(Colors.Red)
                        await i.update({ embeds: [embed], components: [] })
                        collector.stop()
                        return
                    }
                    // 다른 디스코드 유저가 이미 같은 플레이어 ID 연동했는지 검사
                    try {
                        const taken = await dbClient.query(
                            'SELECT user_id FROM bsscore WHERE score = $1 LIMIT 1',
                            [beatsaber],
                        )
                        if (taken.rows.length > 0 && taken.rows[0].user_id !== i.user.id) {
                            embed.setColor(Colors.Red)
                            embed.setDescription('이 플레이어 ID 는 이미 다른 유저가 연동했습니다.')
                            await i.update({ embeds: [embed], components: [] })
                            collector.stop()
                            return
                        }
                    } catch (e) { console.warn('[link msg] 중복 검사 실패:', e?.message ?? e) }
                    const ok = new EmbedBuilder()
                        .setTitle('SUCCESS')
                        .setColor(Colors.Aqua)
                        .setDescription(`**\`${useri.name}\`** 의 계정 정보가 디스코드와 연동되었습니다!\n\`/rank | ${client.config?.prefix ?? '>'}rank\`, \`/scan | ${client.config?.prefix ?? '>'}scan\` 으로 확인 가능합니다.`)
                    try {
                        await dbClient.query(
                            `INSERT INTO bsscore (user_id, name, score, score_name) VALUES ($1,$2,$3,$4)
                             ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name, score=EXCLUDED.score, score_name=EXCLUDED.score_name`,
                            [i.user.id, user, beatsaber, useri.name],
                        )
                    } catch (e) { console.error('[link msg] DB insert 실패:', e?.message ?? e) }
                    const User = {
                        data: {
                            name: user, score: beatsaber, user_id: i.user.id,
                            score_name: useri.name, scores: [],
                        },
                    }
                    writeFileSync(`${process.cwd()}/User/${i.user.id}.json`, JSON.stringify(User, null, 2))
                    await i.update({ embeds: [ok], components: [] })
                    // 초기 스냅샷 저장 — /rank | >rank 즉시 사용 가능하도록
                    const [blInit, ssInit] = await Promise.all([
                        scanBL(beatsaber, null).catch((e) => { console.warn('[link msg] BL initial scan 실패:', e?.message ?? e); return null }),
                        scanSS(beatsaber, null).catch((e) => { console.warn('[link msg] SS initial scan 실패:', e?.message ?? e); return null }),
                    ])
                    saveSnapshots(i.user.id, { bl: blInit?.newSnap, ss: ssInit?.newSnap })
                    collector.stop()
                }
            })
        } catch (err) {
            console.error('[link msg] failed:', err)
            embed.setColor(Colors.Red).setDescription(ko.FormatError + en.FormatError)
            await message.channel.send({ embeds: [embed] })
        }
    },
}
