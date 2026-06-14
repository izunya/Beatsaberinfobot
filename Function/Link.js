const axios = require('axios')
const {
    ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder,
    ComponentType, Colors,
    ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js')
const dbClient = require('../db/database.js')
const { writeFileSync, statSync } = require('fs-extra')
const { ko, en } = require('../Languages/Langs.js')
const { scanBL, scanSS } = require('./Scan.js')
const { saveSnapshots } = require('./Snapshots.js')

// ── pure helpers ─────────────────────────────────────────

async function tryDiscordLookup(discordId) {
    try {
        const r = await axios.get(`https://api.beatleader.xyz/player/discord/${discordId}`)
        return r.data?.id ?? null
    } catch (e) {
        if (e?.response?.status !== 404) console.warn('[link] discord lookup 실패:', e?.message ?? e)
        return null
    }
}

// playerId 로 BL + SS 검증 후 이름 반환 (둘 중 하나라도 활성이면 OK)
async function validatePlayer(playerId) {
    const [bl, ss] = await Promise.all([
        axios.get(`https://api.beatleader.xyz/player/${playerId}`).then((r) => r.data).catch(() => null),
        axios.get(`https://scoresaber.com/api/v2/players/${playerId}`).then((r) => r.data).catch(() => null),
    ])
    const blOK = bl && (bl.pp ?? 0) > 0.5
    const ssOK = ss && (ss.stats?.totalPP ?? 0) > 0.5
    if (!blOK && !ssOK) return null
    const name = blOK ? bl.name : ss.name
    return { name, blOK, ssOK }
}

// 실제 저장. ok=false 면 reason 으로 분기 (taken / alreadysaved / error)
async function saveLink(discordUserId, discordUsername, playerId, displayName) {
    try {
        const taken = await dbClient.query('SELECT user_id FROM bsscore WHERE score = $1 LIMIT 1', [playerId])
        if (taken.rows.length > 0 && taken.rows[0].user_id !== discordUserId) {
            return { ok: false, reason: 'taken' }
        }
    } catch (e) { console.warn('[link] 중복 검사 실패:', e?.message ?? e) }

    try {
        statSync(`${process.cwd()}/User/${discordUserId}.json`)
        return { ok: false, reason: 'alreadysaved' }
    } catch (_) { /* not present, OK */ }

    try {
        await dbClient.query(
            `INSERT INTO bsscore (user_id, name, score, score_name) VALUES ($1,$2,$3,$4)
             ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name, score=EXCLUDED.score, score_name=EXCLUDED.score_name`,
            [discordUserId, discordUsername, playerId, displayName],
        )
    } catch (e) { console.error('[link] DB insert 실패:', e?.message ?? e); return { ok: false, reason: 'error' } }

    const userObj = { data: { name: discordUsername, score: playerId, user_id: discordUserId, score_name: displayName, scores: [] } }
    writeFileSync(`${process.cwd()}/User/${discordUserId}.json`, JSON.stringify(userObj, null, 2))

    // 초기 스냅샷
    const [blInit, ssInit] = await Promise.all([
        scanBL(playerId, null).catch((e) => { console.warn('[link] BL initial scan 실패:', e?.message ?? e); return null }),
        scanSS(playerId, null).catch((e) => { console.warn('[link] SS initial scan 실패:', e?.message ?? e); return null }),
    ])
    saveSnapshots(discordUserId, { bl: blInit?.newSnap, ss: ssInit?.newSnap })

    return { ok: true }
}

// ── UI: 진입 컴포넌트 ────────────────────────────────────

function introPayload() {
    const discordBtn = new ButtonBuilder().setCustomId('link_discord').setStyle(ButtonStyle.Primary).setLabel('디스코드로 연동')
    const steamBtn = new ButtonBuilder().setCustomId('link_steam').setStyle(ButtonStyle.Secondary).setLabel('스팀 ID 로 연동')
    const row = new ActionRowBuilder().addComponents([discordBtn, steamBtn])
    const intro = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('연동 방법을 선택하세요')
        .setDescription('• **디스코드로 연동** — BeatLeader 에 Discord 가 연결돼 있으면 자동으로 찾습니다.\n• **스팀 ID 로 연동** — 직접 입력해서 연동합니다.')
    return { embeds: [intro], components: [row] }
}

// 버튼 클릭에서 모달 띄우고 제출 기다림 (모달 dismiss / timeout 시 null)
async function showSteamModal(btnInt) {
    const modal = new ModalBuilder()
        .setCustomId('link_steam_modal')
        .setTitle('플레이어 ID 입력')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('player_id')
                    .setLabel('SteamID64 또는 BL/SS 플레이어 ID')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(5)
                    .setMaxLength(30)
                    .setPlaceholder('예: 76561198000000000'),
            ),
        )
    await btnInt.showModal(modal)
    try {
        const submit = await btnInt.awaitModalSubmit({
            filter: (s) => s.user.id === btnInt.user.id && s.customId === 'link_steam_modal',
            time: 180_000,
        })
        return submit
    } catch (_) {
        return null
    }
}

// validate → 네/아니요 확인 → 저장 → 결과 메시지
async function runConfirmFlow(triggerInt, parentMessage, discordUserId, playerId, prefix) {
    const v = await validatePlayer(playerId)
    if (!v) {
        await triggerInt.update({
            embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('계정을 찾을 수 없습니다')
                .setDescription(ko.NotFoundAccount + en.NotFoundAccount)],
            components: [],
        })
        return
    }

    const yes = new ButtonBuilder().setCustomId('link_yes').setStyle(ButtonStyle.Primary).setLabel('네!')
    const no = new ButtonBuilder().setCustomId('link_no').setStyle(ButtonStyle.Danger).setLabel('아니요')
    const row = new ActionRowBuilder().addComponents([yes, no])
    const confirmEmbed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`**\`${v.name}\`** ${ko.isYourAccount}\n**\`${v.name}\`** ${en.isYourAccount}`)
    await triggerInt.update({ embeds: [confirmEmbed], components: [row] })

    const collector = parentMessage.createMessageComponentCollector({
        filter: (b) => b.user.id === discordUserId,
        componentType: ComponentType.Button,
        time: 120_000,
        max: 1,
    })

    return await new Promise((resolve) => {
        collector.on('collect', async (b) => {
            if (b.customId === 'link_no') {
                await b.update({
                    embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription(ko.Canceled + en.Canceled)],
                    components: [],
                })
                return
            }
            if (b.customId === 'link_yes') {
                const username = b.user.username.toLocaleLowerCase().replaceAll(' ', '').replaceAll("'", '').replaceAll('"', '')
                const result = await saveLink(b.user.id, username, playerId, v.name)
                if (!result.ok) {
                    let desc = '저장 중 오류가 발생했습니다.'
                    if (result.reason === 'taken') desc = '이 플레이어 ID 는 이미 다른 유저가 연동했습니다.'
                    else if (result.reason === 'alreadysaved') desc = ko.Alreadysaved + en.Alreadysaved
                    await b.update({
                        embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('연동 실패').setDescription(desc)],
                        components: [],
                    })
                    return
                }
                const ok = new EmbedBuilder()
                    .setTitle('SUCCESS')
                    .setColor(Colors.Aqua)
                    .setDescription(`**\`${v.name}\`** 의 계정 정보가 디스코드와 연동되었습니다!\n\`/rank | ${prefix}rank\`, \`/scan | ${prefix}scan\` 으로 확인 가능합니다.`)
                await b.update({ embeds: [ok], components: [] })
            }
        })
        collector.on('end', () => resolve())
    })
}

// 진입 후 버튼 컬렉터 → discord/steam 분기 → (디스코드 자동) or (모달) → 확인 → 저장
async function runLinkFlow(parentMessage, discordUserId, prefix) {
    const collector = parentMessage.createMessageComponentCollector({
        filter: (b) => b.user.id === discordUserId,
        componentType: ComponentType.Button,
        time: 300_000,
        max: 1,
    })
    return await new Promise((resolve) => {
        collector.on('collect', async (btn) => {
            try {
                if (btn.customId === 'link_discord') {
                    const found = await tryDiscordLookup(discordUserId)
                    if (found) {
                        // 동일한 confirm flow 사용 — btn.update 가 ephemeral 도 정상 처리
                        await runConfirmFlow(btn, parentMessage, discordUserId, found, prefix)
                        return resolve()
                    }
                    // 디스코드 미연동 → 모달로 전환
                    const submit = await showSteamModal(btn)
                    if (!submit) return resolve()
                    const pid = submit.fields.getTextInputValue('player_id').trim()
                    await runConfirmFlow(submit, parentMessage, discordUserId, pid, prefix)
                    return resolve()
                }
                if (btn.customId === 'link_steam') {
                    const submit = await showSteamModal(btn)
                    if (!submit) return resolve()
                    const pid = submit.fields.getTextInputValue('player_id').trim()
                    await runConfirmFlow(submit, parentMessage, discordUserId, pid, prefix)
                    return resolve()
                }
                resolve()
            } catch (err) {
                console.error('[link flow]', err)
                resolve()
            }
        })
        collector.on('end', (_collected, reason) => { if (reason !== 'limit') resolve() })
    })
}

module.exports = { introPayload, runLinkFlow, tryDiscordLookup, validatePlayer, saveLink }
