const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags,
} = require('discord.js')
const { sliceCandidates } = require('./Recommend.js')
const { renderRecommendPNG } = require('./RecommendRender.js')
const { ATTACHMENT_FOOTER } = require('./RenderUtils.js')

// token → { analyze, expiresAt }
const CACHE = new Map()
const CACHE_TTL_MS = 30 * 60 * 1000
const TAB_ORDER = ['update', 'unplayed', 'old']
const TAB_LABELS = { update: '기록 갱신', unplayed: '미기록 추천', old: '오래된 기록' }

function newToken() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function remember(payload) {
    const token = newToken()
    CACHE.set(token, { ...payload, expiresAt: Date.now() + CACHE_TTL_MS })
    setTimeout(() => CACHE.delete(token), CACHE_TTL_MS).unref?.()
    return token
}

function recall(token) {
    const v = CACHE.get(token)
    if (!v) return null
    if (v.expiresAt < Date.now()) { CACHE.delete(token); return null }
    return v
}

function tabsMeta() {
    return TAB_ORDER.map((k) => ({ key: k, name: TAB_LABELS[k] }))
}

function componentRows(token, tab, page, totalPages) {
    const tabRow = new ActionRowBuilder().addComponents(
        ...TAB_ORDER.map((k) =>
            new ButtonBuilder()
                .setCustomId(`bsi:rec:tab:${token}:${k}`)
                .setLabel(TAB_LABELS[k])
                .setStyle(k === tab ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(k === tab),
        ),
    )
    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bsi:rec:page:${token}:${tab}:${page - 1}`)
            .setLabel('◀ 이전').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
        new ButtonBuilder().setCustomId(`bsi:rec:noop`).setLabel(`${page + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId(`bsi:rec:page:${token}:${tab}:${page + 1}`)
            .setLabel('다음 ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    )
    return [tabRow, navRow]
}

async function buildPayload(entry, tab, page) {
    const slice = sliceCandidates(entry.analyze, tab, page, 10)
    const png = await renderRecommendPNG({
        analyze: entry.analyze,
        tab,
        page,
        sliceMeta: slice,
        tabsMeta: tabsMeta(),
    })
    const file = new AttachmentBuilder(png, { name: `recommend_${tab}_${slice.page + 1}.png` })
    return { slice, file }
}

// 최초 응답용 — token 캐시 저장 + 최초 payload 반환
async function createInitial(analyze, tab = 'update') {
    const token = remember({ analyze })
    const { slice, file } = await buildPayload({ analyze }, tab, 0)
    return {
        content: ATTACHMENT_FOOTER,
        files: [file],
        components: componentRows(token, tab, slice.page, slice.totalPages),
    }
}

async function handleButton(interaction) {
    const parts = interaction.customId.split(':')
    if (parts[0] !== 'bsi' || parts[1] !== 'rec') return
    const action = parts[2]
    if (action === 'noop') return interaction.deferUpdate().catch(() => { })
    const token = parts[3]
    const entry = recall(token)
    if (!entry) {
        await interaction.reply({ content: '데이터가 만료되었습니다. `/rec | >rec` 로 다시 요청해주세요.', flags: MessageFlags.Ephemeral })
        return
    }
    let tab, page
    if (action === 'tab') { tab = parts[4]; page = 0 }
    else if (action === 'page') { tab = parts[4]; page = Number.parseInt(parts[5], 10) || 0 }
    else return

    if (!TAB_ORDER.includes(tab)) return

    await interaction.deferUpdate()
    try {
        const { slice, file } = await buildPayload(entry, tab, page)
        // attachments: [] 없이 files 만 넣으면 이전 첨부가 잔류해 두 이미지가 겹쳐 보임 (discord.js v14)
        await interaction.editReply({
            content: ATTACHMENT_FOOTER,
            files: [file],
            attachments: [],
            components: componentRows(token, tab, slice.page, slice.totalPages),
        })
    } catch (e) {
        console.warn('[rec pager]', e?.message ?? e)
        try {
            await interaction.followUp({ content: '이미지 렌더링 실패.', flags: MessageFlags.Ephemeral })
        } catch (_) { }
    }
}

module.exports = { createInitial, handleButton, TAB_ORDER }
