const dbClient = require('../db/database.js')

// /rank, /triangle 등에서 재사용 — 현재 길드에서 봇에 연동된 사람만 자동완성 후보로.
// 라벨: `디스플레이네임 · 비트세이버 이름`, 값: discord user_id (string)
async function respondLinkedAutocomplete(interaction) {
    const focused = String(interaction.options.getFocused() ?? '').toLowerCase().trim()
    try {
        const guild = interaction.guild
        if (!guild) return await interaction.respond([])
        const r = await dbClient.query('SELECT user_id, name, score_name FROM bsscore')
        const choices = []
        for (const row of r.rows) {
            const m = guild.members.cache.get(String(row.user_id))
            if (!m) continue
            const dn = m.displayName ?? m.user?.username ?? row.name ?? row.user_id
            const sn = row.score_name || row.name || row.user_id
            if (focused
                && !String(dn).toLowerCase().includes(focused)
                && !String(sn).toLowerCase().includes(focused)
                && !String(row.name ?? '').toLowerCase().includes(focused)) continue
            choices.push({ name: `${dn} · ${sn}`.slice(0, 100), value: String(row.user_id) })
            if (choices.length >= 25) break
        }
        await interaction.respond(choices)
    } catch (e) {
        console.warn('[linked autocomplete]', e?.message ?? e)
        try { await interaction.respond([]) } catch (_) { }
    }
}

module.exports = { respondLinkedAutocomplete }
