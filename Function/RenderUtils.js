// puppeteer HTML 템플릿에서 공용으로 쓰는 이스케이프/색상/URL 검증.

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => (
        c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;'
        : c === '"' ? '&quot;' : '&#39;'
    ))
}

const DIFF_PILL = {
    Easy:       { label: 'Easy',    bg: '#3178c6', fg: '#e6f2ff' },
    Normal:     { label: 'Normal',  bg: '#2b8a3e', fg: '#e6ffef' },
    Hard:       { label: 'Hard',    bg: '#e0a800', fg: '#2a1d00' },
    Expert:     { label: 'Expert',  bg: '#c92a2a', fg: '#ffe0e0' },
    ExpertPlus: { label: 'Expert+', bg: '#6f42c1', fg: '#eee6ff' },
}

function pill(diff) {
    const d = DIFF_PILL[diff] ?? { label: diff ?? '?', bg: '#495057', fg: '#dee2e6' }
    return `<span class="pill" style="background:${d.bg};color:${d.fg}">${esc(d.label)}</span>`
}

// CSS background-image:url('...') 안에 넣어도 안전한 URL 만 통과.
// - 반드시 http(s) 스킴
// - 공백/따옴표/괄호/역슬래시/제어문자 금지 (CSS 문자열/함수 이스케이프 방지)
function safeAssetURL(url) {
    if (typeof url !== 'string' || !url) return ''
    if (!/^https?:\/\//i.test(url)) return ''
    if (/[\s'"<>\\()]|[\x00-\x1f]/.test(url)) return ''
    return url
}

// Steam / Discord / BL / SS player ID 는 모두 숫자만. 5~25자리로 범위 제한.
const PLAYER_ID_RE = /^\d{5,25}$/
function isValidPlayerId(s) {
    return typeof s === 'string' && PLAYER_ID_RE.test(s)
}

// /rec, /top30 이미지 첨부와 함께 붙이는 안내 문구.
const ATTACHMENT_FOOTER = '자세한 내용 및 플레이리스트는 https://bs-archive-eight.vercel.app 에서 확인 및 다운로드가 가능합니다.'

module.exports = { esc, DIFF_PILL, pill, safeAssetURL, isValidPlayerId, ATTACHMENT_FOOTER }
