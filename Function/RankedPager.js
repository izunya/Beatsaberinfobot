const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, MessageFlags,
} = require('discord.js')

// token → { lines, headerName, playerName, expiresAt }
const CACHE = new Map()
const CACHE_TTL_MS = 30 * 60 * 1000
const PER_PAGE = 10

function newToken() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function remember(payload) {
    const token = newToken()
    CACHE.set(token, { ...payload, expiresAt: Date.now() + CACHE_TTL_MS })
    const t = setTimeout(() => CACHE.delete(token), CACHE_TTL_MS)
    t.unref?.()
    return token
}

function recall(token) {
    const v = CACHE.get(token)
    if (!v) return null
    if (v.expiresAt < Date.now()) { CACHE.delete(token); return null }
    return v
}

function buildPage(entry, page) {
    const total = entry.lines.length
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
    const p = Math.max(0, Math.min(page, totalPages - 1))
    const start = p * PER_PAGE
    const slice = entry.lines.slice(start, start + PER_PAGE)
    const title = entry.playerName ? `${entry.playerName} · ${entry.headerName}` : entry.headerName
    const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(title)
        .setDescription(slice.join('\n\n'))
        .setFooter({ text: `페이지 ${p + 1} / ${totalPages} · 총 ${total}곡` })
    return { embed, page: p, totalPages }
}

function pageRow(token, page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`bsi:rmap:page:${token}:${page - 1}`)
            .setLabel('◀ 이전')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`bsi:rmap:page:${token}:${page + 1}`)
            .setLabel('다음 ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
    )
}

function showButton(token, overflowCount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`bsi:rmap:show:${token}`)
            .setLabel(`나머지 ${overflowCount}곡 보기`)
            .setStyle(ButtonStyle.Primary),
    )
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const FIELD_LIMIT = 1024

// 청크별 edit 으로 점진적으로 펼치고, 1024자 한도를 넘은 분량부터 "나머지 N곡 보기" 버튼으로.
// target: { edit(payload) } — Message 또는 { edit: (p) => interaction.editReply(p) }
async function revealRankedSection(target, baseEmbed, lines, {
    headerName = '새 랭크맵', playerName = '', chunkSize = 2, delayMs = 900,
} = {}) {
    if (!lines || lines.length === 0) return

    // 1024 자 한도 내에서 몇 줄까지 들어가는지 미리 결정 ('\n\n' 구분자 포함)
    const inlineLines = []
    let runningLen = 0
    for (const ln of lines) {
        const addLen = inlineLines.length === 0 ? ln.length : runningLen + 2 + ln.length
        if (addLen > FIELD_LIMIT) break
        inlineLines.push(ln)
        runningLen = addLen
    }
    // 안전망 — 첫 줄 자체가 1024 초과인 경우 잘라서 1줄은 보여줌
    if (inlineLines.length === 0) inlineLines.push(lines[0].slice(0, FIELD_LIMIT - 1) + '…')

    const overflow = lines.slice(inlineLines.length)
    const hasMore = overflow.length > 0
    const total = lines.length

    const chunks = []
    for (let i = 0; i < inlineLines.length; i += chunkSize) chunks.push(inlineLines.slice(i, i + chunkSize))

    // 캐시에는 넘친 부분만 저장 — 버튼/페이지네이션이 보여주는 대상이 곧 overflow
    const token = hasMore ? remember({ lines: overflow, headerName, playerName }) : null

    const accumulated = []
    for (let i = 0; i < chunks.length; i++) {
        accumulated.push(...chunks[i])
        const isFinal = i === chunks.length - 1
        const e = EmbedBuilder.from(baseEmbed.data)
        const headerText = hasMore
            ? `**${headerName}** (${accumulated.length}/${inlineLines.length} · 나머지 ${overflow.length}곡)`
            : `**${headerName}** (${accumulated.length}/${total})`
        e.addFields({ name: headerText, value: accumulated.join('\n\n') })
        const components = isFinal && hasMore ? [showButton(token, overflow.length)] : []
        try {
            await target.edit({ embeds: [e], components })
        } catch (err) {
            console.warn('[ranked reveal] edit 실패:', err?.message ?? err)
            break
        }
        if (!isFinal) await sleep(delayMs)
    }
}

async function handleButton(interaction) {
    const parts = interaction.customId.split(':')
    if (parts[0] !== 'bsi' || parts[1] !== 'rmap') return
    const action = parts[2]
    const token = parts[3]
    const entry = recall(token)
    if (!entry) {
        await interaction.reply({
            content: '데이터가 만료되었습니다. `/scan | >scan` 으로 다시 스캔해주세요.',
            flags: MessageFlags.Ephemeral,
        })
        return
    }
    if (action === 'show') {
        const { embed, page, totalPages } = buildPage(entry, 0)
        await interaction.reply({
            embeds: [embed],
            components: totalPages > 1 ? [pageRow(token, page, totalPages)] : [],
            flags: MessageFlags.Ephemeral,
        })
        return
    }
    if (action === 'page') {
        const target = Number.parseInt(parts[4], 10) || 0
        const { embed, page, totalPages } = buildPage(entry, target)
        await interaction.update({
            embeds: [embed],
            components: totalPages > 1 ? [pageRow(token, page, totalPages)] : [],
        })
    }
}

module.exports = { revealRankedSection, handleButton }
