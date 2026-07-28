const axios = require('axios')
const path = require('path')
const fs = require('fs')
const config = require('../config.js')

const STATE_DIR = path.join(process.cwd(), 'data')
const STATE_FILE = path.join(STATE_DIR, 'kr_rank_snapshot.json')
const TOP_N = 100

// 서버 커스텀 이모지 — Saber_Bot 이 소속된 길드에 실제 존재해야 렌더됨.
const SS_EMOJI = '<:scoresaber_logo:1531387787356667934>'
const BL_EMOJI = '<:beatleader_logo:1531387849155547348>'

// 전송 대상 채널 ID (config.js). 없으면 콘솔에 [WOULD-SEND] 로만 남김.
const CHANNEL_ID = config.krRankChannelId

function formatUpdateMessage(tag, name, prevPP, currPP) {
    const emoji = tag === 'SS' ? SS_EMOJI : BL_EMOJI
    const platform = tag === 'SS' ? 'ScoreSaber' : 'BeatLeader'
    const delta = currPP - prevPP
    const sign = delta >= 0 ? '+ ' : '- '
    const absStr = Math.abs(delta).toFixed(4)
    return `${emoji}\`[${platform}] ${name} - ${currPP} PP (${sign}${absStr} PP)\``
}

let cachedChannel = null
async function getChannel() {
    if (cachedChannel) return cachedChannel
    if (!CHANNEL_ID) return null
    try {
        const client = require('../index.js')
        cachedChannel = await client.channels.fetch(CHANNEL_ID)
        return cachedChannel
    } catch (e) {
        console.warn('[kr-rank] 채널 fetch 실패:', e?.message ?? e)
        return null
    }
}

// 채널 최근 메시지 중 지난 DEDUP_WINDOW_MS 내에 동일 content 가 있으면 전송 스킵.
// 다중 프로세스(로컬+서버) 나 재시도로 인한 중복 방어.
const DEDUP_WINDOW_MS = 30 * 60_000
async function sendMessage(text) {
    const ch = await getChannel()
    if (!ch?.send) { console.log('[kr-rank WOULD-SEND]', text); return }
    try {
        const recent = await ch.messages.fetch({ limit: 30 }).catch(() => null)
        if (recent) {
            const cutoff = Date.now() - DEDUP_WINDOW_MS
            const dup = recent.find((m) => m.content === text && m.createdTimestamp >= cutoff)
            if (dup) {
                console.log('[kr-rank] 중복 감지 → 전송 스킵')
                return
            }
        }
        await ch.send({ content: text })
    } catch (e) {
        console.warn('[kr-rank] 채널 전송 실패:', e?.message ?? e)
    }
}

function loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) } catch (_) { return null }
}

function saveState(state) {
    try {
        if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true })
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
    } catch (e) {
        console.warn('[kr-rank] state 저장 실패:', e?.message ?? e)
    }
}

// ScoreSaber KR 상위 100명 — 50씩 두 페이지
async function fetchSSKRTop() {
    const pages = await Promise.all([1, 2].map((p) =>
        axios.get(`https://scoresaber.com/api/players?countries=KR&page=${p}`, { timeout: 15_000 })
            .then((r) => r.data?.players ?? [])
            .catch((e) => { console.warn(`[kr-rank] SS p${p} 실패:`, e?.message ?? e); return [] })
    ))
    return pages.flat().slice(0, TOP_N).map((p) => ({ id: String(p.id), name: p.name, pp: Number(p.pp ?? 0) }))
}

// BeatLeader KR 상위 100명 — 한 페이지에 100 요청
async function fetchBLKRTop() {
    try {
        const r = await axios.get('https://api.beatleader.xyz/players', {
            params: { countries: 'kr', page: 1, count: TOP_N, sortBy: 'pp', order: 'desc' },
            timeout: 15_000,
        })
        const arr = r.data?.data ?? []
        return arr.slice(0, TOP_N).map((p) => ({ id: String(p.id), name: p.name, pp: Number(p.pp ?? 0) }))
    } catch (e) {
        console.warn('[kr-rank] BL 실패:', e?.message ?? e)
        return []
    }
}

// PP 변동이 표시 임계 미만 (0.001 PP) 이면 SS/BL 시스템 재계산 잡음으로 간주 — 스킵.
const MIN_DELTA_PP = 0.001

// (1) PP 변동 (콘솔 로그 + 디스코드 전송), (2) 새로 등장한 유저 (콘솔 로그만) 를 처리.
// 스냅샷 파일이 아예 없던 첫 실행 때도 100+100명 모두 [신규] 로 찍힘 (디스코드 전송 안 함 — 스팸 방지).
async function diffAndLog(tag, players, prevMap) {
    const nextMap = {}
    const toSend = []
    for (const p of players) {
        nextMap[p.id] = { name: p.name, pp: p.pp }
        const prev = prevMap?.[p.id]
        if (!prev) {
            console.log(`[${tag} 신규] ${p.name} · ${p.pp.toFixed(2)}pp (Top ${TOP_N} 진입)`)
            continue
        }
        if (Math.abs(p.pp - prev.pp) < MIN_DELTA_PP) continue    // 무의미한 미세 변동 스킵
        console.log(`[${tag} 갱신] ${p.name} · ${prev.pp.toFixed(2)}pp → ${p.pp.toFixed(2)}pp`)
        toSend.push(formatUpdateMessage(tag, p.name, prev.pp, p.pp))
    }
    for (const m of toSend) await sendMessage(m)
    return nextMap
}

let running = false
async function tick() {
    if (running) return
    running = true
    try {
        const state = loadState() ?? { ss: null, bl: null }
        const [ss, bl] = await Promise.all([fetchSSKRTop(), fetchBLKRTop()])
        const next = {
            ss: ss.length ? await diffAndLog('SS', ss, state.ss) : state.ss,
            bl: bl.length ? await diffAndLog('BL', bl, state.bl) : state.bl,
            updatedAt: new Date().toISOString(),
        }
        saveState(next)
    } finally {
        running = false
    }
}

module.exports = { tick }
