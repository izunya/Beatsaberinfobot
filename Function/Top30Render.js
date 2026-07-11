const { renderHTMLToPNG } = require('./Browser.js')
const { esc, pill, safeAssetURL } = require('./RenderUtils.js')

// 정확도에 따라 색조 — 95%+ = mint, 93~95 = cyan, ~92 = blue-gray
function accBadgeColor(acc) {
    if (acc >= 95) return { bg: 'linear-gradient(90deg,#5ff1b5,#7ce6c5)', fg: '#08210a' }
    if (acc >= 93) return { bg: 'linear-gradient(90deg,#79dcff,#6fc0ec)', fg: '#0b2130' }
    return { bg: 'linear-gradient(90deg,#5f8ac8,#6d90b8)', fg: '#e8f0ff' }
}

function fmtDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

// 대략적인 SS PP 티어 (사이트의 DIAMOND III @ 13,677pp 를 앵커로 잡음)
function tierBadge(pp) {
    if (pp >= 20000) return { label: 'MASTER',      bg: '#ff9b52' }
    if (pp >= 17000) return { label: 'DIAMOND I',   bg: '#7fd0ff' }
    if (pp >= 15000) return { label: 'DIAMOND II',  bg: '#79dcff' }
    if (pp >= 13000) return { label: 'DIAMOND III', bg: '#6fc0ec' }
    if (pp >= 11000) return { label: 'PLATINUM I',  bg: '#c6d5e0' }
    if (pp >=  9000) return { label: 'PLATINUM II', bg: '#a6b7c4' }
    if (pp >=  7000) return { label: 'GOLD I',      bg: '#f5c542' }
    if (pp >=  5000) return { label: 'GOLD II',     bg: '#e0a800' }
    if (pp >=  3500) return { label: 'SILVER I',    bg: '#b8bec7' }
    if (pp >=  2200) return { label: 'SILVER II',   bg: '#8f959f' }
    if (pp >=  1200) return { label: 'BRONZE I',    bg: '#c98753' }
    if (pp >=   500) return { label: 'BRONZE II',   bg: '#a1653b' }
    return { label: 'IRON', bg: '#7a7d82' }
}

function statBlock(label, value) {
    return `
    <div class="stat">
        <div class="stat-l">${esc(label)}</div>
        <div class="stat-v">${esc(value)}</div>
    </div>`
}

function itemCard(item, i) {
    const rank = `#${i + 1}`
    const accN = Number(item.accuracy ?? 0)
    const acc = accN.toFixed(2)
    const starsStr = Number(item.stars ?? 0).toFixed(2)
    const pp = Number(item.pp ?? 0).toFixed(2)
    const cover = safeAssetURL(item.coverImage)
    const dateStr = fmtDate(item.timeSet)
    const badge = accBadgeColor(accN)

    return `
    <div class="tcard">
        <div class="tribbon">
            <span class="trank">${esc(rank)}</span>
            <span class="tacc" style="background:${badge.bg};color:${badge.fg}">${esc(acc)}</span>
        </div>
        <div class="tcover" ${cover ? `style="background-image:url('${cover}')"` : ''}>
            <span class="tstar">${esc(starsStr)}★</span>
        </div>
        <div class="tmeta">
            <div class="tsong">${esc(item.song ?? '-')}</div>
            <div class="tsub">${pill(item.difficulty)}<span class="tmapper">· ${esc(item.mapper ?? '-')}</span></div>
            <div class="tfoot"><span class="tpp">${esc(pp)}pp</span><span class="tdate">${esc(dateStr)}</span></div>
        </div>
    </div>`
}

function buildHTML({ player, summary, top30, generatedAt }) {
    const cards = top30.slice(0, 30).map((it, i) => itemCard(it, i)).join('')
    const t = tierBadge(Number(player?.pp ?? 0))
    const rankedPlayCount = Number(player?.rankedPlayCount ?? 0).toLocaleString('ko-KR')
    const gen = generatedAt || fmtDate(new Date().toISOString())
    const stats = [
        statBlock('총 PP', Number(player?.pp ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
        statBlock('글로벌', `#${Number(player?.rank ?? 0).toLocaleString('ko-KR')}`),
        statBlock('국가', `#${Number(player?.countryRank ?? 0).toLocaleString('ko-KR')}`),
        statBlock('평균 ACC', `${Number(summary?.averageAccuracy ?? 0).toFixed(2)}%`),
        statBlock('Top PP', `${Number(summary?.bestPp ?? 0).toFixed(2)}pp`),
    ].join('')

    return `<!doctype html>
<html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
    background: radial-gradient(circle at 18% 8%, rgba(121,220,255,.16), transparent 28%),
                radial-gradient(circle at 86% 16%, rgba(154,99,255,.18), transparent 30%),
                linear-gradient(#0a1120, #07101d 55%, #060b14);
    color: #f7fbff;
    font-family: -apple-system, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    -webkit-font-smoothing: antialiased;
}
.frame { padding: 28px; width: 1580px; }
.brand-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.brand { color: #bff4ff; font-size: 14px; font-weight: 900; letter-spacing: 1.68px; text-transform: uppercase; }
.gen { color: #b8c8df; font-size: 13px; font-weight: 700; }

.header { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center;
    background: rgba(13,20,36,.88); border: 1px solid rgba(255,255,255,.12); border-radius: 24px;
    box-shadow: 0 24px 50px rgba(0,0,0,.28); padding: 22px 26px; margin-bottom: 20px; }
.player-block { display: flex; align-items: center; gap: 18px; min-width: 0; }
.avatar { width: 92px; height: 92px; border-radius: 20px; background-size: cover; background-position: center; background-color: #1a2033; border: 1px solid rgba(255,255,255,.1); flex-shrink: 0; }
.pinfo { min-width: 0; }
.pname-row { display: flex; align-items: center; gap: 12px; }
.pname { font-size: 34px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
.tier { padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 900; letter-spacing: 1.2px; color: #0b1a2a; }
.pmeta { color: #9fb0c9; font-size: 13px; margin-top: 6px; }
.pmeta .sep { color: #4a5975; margin: 0 6px; }
.pfoot { color: #b8c8df; font-size: 12px; margin-top: 6px; }

.stats-row { display: flex; gap: 24px; align-items: center; }
.stat { text-align: right; min-width: 90px; }
.stat-l { color: #9fb0c9; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
.stat-v { color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 2px; letter-spacing: -0.5px; }

.grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
.tcard {
    background: linear-gradient(180deg, #12203a, #0d1830);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 14px;
    overflow: hidden;
    display: flex; flex-direction: column;
}
.tribbon { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: rgba(0,0,0,.25); }
.trank { color: #cfd7e6; font-size: 12px; font-weight: 800; }
.tacc { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.tcover { aspect-ratio: 1 / 1; background-size: cover; background-position: center; background-color: #1a2033; position: relative; }
.tstar { position: absolute; bottom: 8px; right: 8px; padding: 3px 9px; border-radius: 8px; background: rgba(8,18,36,.85); color: #cfe5ff; font-size: 11px; font-weight: 700; border: 1px solid rgba(121,220,255,.25); }
.tmeta { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.tsong { color: #ffffff; font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tsub { display: flex; align-items: center; gap: 6px; overflow: hidden; }
.pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.tmapper { color: #8b90ac; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tfoot { display: flex; justify-content: space-between; align-items: center; }
.tpp { color: #79dcff; font-size: 13px; font-weight: 800; }
.tdate { color: #7a869f; font-size: 11px; }
</style></head>
<body>
<div class="frame">
  <div class="brand-row">
    <div class="brand">BS-Info Top 30 Board</div>
    <div class="gen">Generated ${esc(gen)}</div>
  </div>
  <div class="header">
    <div class="player-block">
      <div class="avatar" ${safeAssetURL(player?.profilePicture) ? `style="background-image:url('${safeAssetURL(player.profilePicture)}')"` : ''}></div>
      <div class="pinfo">
        <div class="pname-row">
          <span class="pname">${esc(player?.name ?? '?')}</span>
          <span class="tier" style="background:${t.bg}">${esc(t.label)}</span>
        </div>
        <div class="pmeta">${esc(player?.country ?? '')} <span class="sep">·</span> ID ${esc(player?.id ?? '')}</div>
        <div class="pfoot">랭크맵 플레이 ${esc(rankedPlayCount)}회 · Top 30 성과표</div>
      </div>
    </div>
    <div class="stats-row">${stats}</div>
  </div>
  <div class="grid">${cards}</div>
</div>
</body></html>`
}

async function renderTop30PNG(analyze) {
    const html = buildHTML({
        player: analyze?.player ?? {},
        summary: analyze?.summary ?? {},
        top30: Array.isArray(analyze?.top30) ? analyze.top30 : [],
    })
    // 1580×1900 를 2× 로 뜨면 ~11MB 로 커져 Discord 첨부 한도에 걸릴 수 있어 1.5× 로.
    return renderHTMLToPNG(html, { width: 1580, height: 1900, deviceScaleFactor: 1.5, selector: '.frame' })
}

module.exports = { renderTop30PNG }
