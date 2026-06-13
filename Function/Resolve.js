const axios = require('axios')
const { readFileSync, stat } = require('fs-extra')
const dbClient = require('../db/database.js')

// Discord ID 로부터 BL/SS 플레이어 ID(score) 를 찾는다.
// 우선순위: directScore → User/<id>.json → DB bsscore → BL discord lookup
async function resolveScore(id, directScore) {
    if (directScore) return directScore
    try {
        await stat(`${process.cwd()}/User/${id}.json`)
        const raw = readFileSync(`${process.cwd()}/User/${id}.json`, 'utf-8')
        const u = JSON.parse(raw)
        if (u?.data?.score) return u.data.score
    } catch (_) { }
    try {
        const r = await dbClient.query(`SELECT score FROM bsscore WHERE user_id = $1`, [id])
        if (r.rows.length > 0) return r.rows[0].score
    } catch (e) { console.error('[resolveScore] DB lookup 실패:', e?.message ?? e) }
    try {
        const dc = await axios.get(`https://api.beatleader.xyz/player/discord/${id}`)
        if (dc.data?.id) return dc.data.id
    } catch (e) {
        if (e?.response?.status !== 404) console.warn('[resolveScore] BL discord lookup 실패:', e?.message ?? e)
    }
    return null
}

module.exports = { resolveScore }
