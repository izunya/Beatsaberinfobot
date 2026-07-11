const axios = require('axios')

const BL_API = 'https://api.beatleader.xyz'
const RENDERER = 'https://render.beatleader.xyz/'

// 각 축을 자기 "최대 PP" 기준으로 재스케일 (BL 웹사이트 SkillTriangleChart 와 동일)
const TRI_MAX = { tech: 1300, acc: 15000, pass: 6000 }

// 스킬 트라이앵글 히스토리 (월별, [0] = 최신)
// 각 항목: { timestamp, pp, techPp, accPp, passPp, improvements, newScores }
async function getTriangleHistory(playerId, context = 'general') {
    try {
        const r = await axios.get(
            `${BL_API}/player/${encodeURIComponent(playerId)}/history/triangle?leaderboardContext=${context}`,
            { timeout: 10_000 },
        )
        return Array.isArray(r.data) && r.data.length ? r.data : null
    } catch (e) {
        if (e?.response?.status === 404) return null
        throw e
    }
}

// gif URL (BL 웹사이트 "Create gif!" 와 동일)
function triangleGifUrl(playerId, context = 'general') {
    return `${RENDERER}animatedloop/700x340/2/1.2/skill-triangle-history/${context}/triangle/${encodeURIComponent(playerId)}`
}

// gif 다운로드 — 실패 시 null
async function fetchTriangleGif(playerId, context = 'general') {
    try {
        const r = await axios.get(triangleGifUrl(playerId, context), {
            responseType: 'arraybuffer',
            timeout: 15_000,
        })
        const buf = Buffer.from(r.data)
        return buf.length > 0 ? buf : null
    } catch (_) {
        return null
    }
}

// techPp/accPp/passPp → 트라이앵글 퍼센트 (합 100%)
function computeTrianglePercents({ techPp = 0, accPp = 0, passPp = 0 }) {
    const sTech = TRI_MAX.acc / TRI_MAX.tech
    const sPass = TRI_MAX.acc / TRI_MAX.pass
    const total = techPp * sTech + accPp + passPp * sPass
    if (total <= 0) return { tech: 0, acc: 0, pass: 0 }
    return {
        tech: (techPp * sTech) / total * 100,
        acc: accPp / total * 100,
        pass: (passPp * sPass) / total * 100,
    }
}

async function fetchBLPlayer(id) {
    try {
        const r = await axios.get(`${BL_API}/player/${encodeURIComponent(id)}`, { timeout: 8_000 })
        return { name: r.data?.name ?? null, avatar: r.data?.avatar ?? null }
    } catch (_) {
        return { name: null, avatar: null }
    }
}

module.exports = { getTriangleHistory, triangleGifUrl, fetchTriangleGif, computeTrianglePercents, fetchBLPlayer }
