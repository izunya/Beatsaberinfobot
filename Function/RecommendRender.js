const { renderHTMLToPNG } = require('./Browser.js')
const { esc, pill, safeAssetURL } = require('./RenderUtils.js')

function itemCard(item, i, tab) {
    const rank = `#${i + 1}`
    const cover = safeAssetURL(item.coverImage)
    const song = esc(item.song ?? '-')
    const mapper = esc(item.mapper ?? '-')
    const targetAcc = Number(item.targetAccuracy ?? 0).toFixed(2)
    const acc = Number(item.accuracy ?? 0).toFixed(2)
    const pp = Number(item.pp ?? 0).toFixed(2)
    const targetPp = Number(item.targetPp ?? 0).toFixed(0)
    const gain = Number(item.estimatedGainPp ?? 0).toFixed(2)
    const reasons = Array.isArray(item.reasons) ? item.reasons.join(' · ') : ''

    // 탭별 수치 라인 구성
    let numLine
    if (tab === 'unplayed') {
        // 미기록: 예상 목표 % 만 + 예상 pp
        numLine = `<span class="num-target">목표 <b>${targetAcc}%</b></span> · <span class="num-est">예상 <b>${pp}pp</b></span>`
    } else {
        // update/old: 현재 → 목표 → 추정 pp, 예상 증가
        const gainSign = Number(item.estimatedGainPp ?? 0) >= 0 ? '+' : ''
        numLine = `현재 <b>${acc}%</b> → 목표 <b>${targetAcc}%</b> · <b>${pp}pp</b> → 추정 <b>${targetPp}pp</b> · 예상 증가 <b class="gain">${gainSign}${gain}pp</b>`
    }

    return `
    <div class="card">
      <div class="rank">${esc(rank)}</div>
      <div class="cover" ${cover ? `style="background-image:url('${cover}')"` : ''}></div>
      <div class="meta">
        <div class="title-row">
          <span class="song">${song}</span>
          ${pill(item.difficulty)}
          <span class="mapper">· ${mapper}</span>
        </div>
        <div class="num-row">${numLine}</div>
        <div class="reason-row">${esc(reasons)}</div>
      </div>
    </div>`
}

function buildHTML({ player, items, page, totalPages, total, label, subtitle, tab, tabsMeta }) {
    const rows = items.map((it, i) => itemCard(it, page * 10 + i, tab)).join('')
    const tabBtns = tabsMeta.map((t) => `
        <div class="tab ${t.key === tab ? 'active' : ''}">${esc(t.name)}</div>
    `).join('')

    return `<!doctype html>
<html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #0b0d18; color: #e6e8f0; font-family: -apple-system, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; -webkit-font-smoothing: antialiased; }
.frame { padding: 28px; }
.wrap { border: 1px solid #2a2f4a; border-radius: 16px; background: linear-gradient(180deg, #12152a, #0e1122); padding: 24px 26px; }
.eyebrow { color: #7aa2ff; font-size: 12px; letter-spacing: 3px; font-weight: 700; }
.title { color: #fff; font-size: 26px; font-weight: 800; margin-top: 6px; }
.desc { color: #b6bad0; font-size: 13px; margin-top: 10px; line-height: 1.5; }
.notice { color: #7a7f9a; font-size: 12px; margin-top: 4px; }
.tabs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 18px; }
.tab { padding: 12px 16px; border-radius: 10px; background: #171a2f; border: 1px solid #262a44; color: #b6bad0; text-align: left; font-size: 14px; font-weight: 600; }
.tab.active { background: #10233b; border-color: #3a6ac2; color: #cfe0ff; box-shadow: inset 0 0 0 1px #3a6ac2; }
.section { margin-top: 18px; border: 1px solid #262a44; border-radius: 14px; padding: 18px 20px; background: #10132a; }
.section-hdr { display: flex; align-items: center; justify-content: space-between; }
.section-title { color: #fff; font-size: 18px; font-weight: 700; }
.section-sub { color: #8b90ac; font-size: 12px; margin-top: 6px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.card { display: grid; grid-template-columns: 30px 72px 1fr; gap: 12px; align-items: center; padding: 12px; border: 1px solid #262a44; border-radius: 12px; background: #141733; min-width: 0; }
.rank { color: #a6afd0; font-weight: 700; font-size: 13px; text-align: center; }
.cover { width: 72px; height: 72px; border-radius: 8px; background-size: cover; background-position: center; background-color: #1c2043; background-repeat: no-repeat; }
.meta { min-width: 0; }
.title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.song { color: #fff; font-size: 14px; font-weight: 700; flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mapper { color: #8b90ac; font-size: 12px; flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.pill { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; flex: 0 0 auto; }
.num-row { color: #d0d3e6; font-size: 12px; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.num-row b { color: #fff; }
.num-row .gain { color: #6be26b; }
.num-target b, .num-est b { color: #ffd666; }
.reason-row { color: #6f7395; font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; color: #7a7f9a; font-size: 12px; }
.footer .player { color: #cfd3ea; font-weight: 700; }
</style></head>
<body>
<div class="frame"><div class="wrap">
  <div class="eyebrow">RECOMMENDATION</div>
  <div class="title">추천곡</div>
  <div class="desc">원하는 추천 기준을 선택해서 추천 후보를 따로 확인할 수 있습니다.</div>
  <div class="notice">추천곡의 추정 PP와 예상 증가량은 ScoreSaber PP 커브 기반 계산값이며, 실제 ScoreSaber 반영 PP와 다를 수 있습니다.</div>
  <div class="tabs">${tabBtns}</div>
  <div class="section">
    <div class="section-hdr">
      <div>
        <div class="section-title">${esc(label)}</div>
        <div class="section-sub">${esc(subtitle)}</div>
      </div>
    </div>
    <div class="grid">${rows}</div>
    <div class="footer">
      <div>플레이어 <span class="player">${esc(player?.name ?? '?')}</span> · #${esc(player?.rank ?? '?')} · ${esc((player?.pp ?? 0).toFixed ? player.pp.toFixed(2) : player?.pp)}pp</div>
      <div>${esc(page + 1)} / ${esc(totalPages)} 페이지 · 총 ${esc(total)}곡</div>
    </div>
  </div>
</div></div>
</body></html>`
}

// 페이지에 넣을 아이템 개수만큼 렌더해서 PNG 버퍼 반환
async function renderRecommendPNG({ analyze, tab, page, sliceMeta, tabsMeta }) {
    const html = buildHTML({
        player: analyze?.player ?? {},
        items: sliceMeta.items,
        page: sliceMeta.page,
        totalPages: sliceMeta.totalPages,
        total: sliceMeta.total,
        label: sliceMeta.label,
        subtitle: sliceMeta.subtitle,
        tab,
        tabsMeta,
    })
    return renderHTMLToPNG(html, { width: 1200, height: 1600, selector: '.frame' })
}

module.exports = { renderRecommendPNG }
