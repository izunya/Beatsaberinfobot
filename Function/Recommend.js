const axios = require('axios')

const ANALYZE_URL = 'https://bs-archive-eight.vercel.app/api/analyze'

// 탭 → 후보 배열 key + 헤더 텍스트 매핑
const TAB_META = {
    update: { key: 'refreshCandidates', label: '기록 갱신 추천', subtitle: '이미 친 곡 중에서 현재 기록 대비 갱신 여지가 커 보이는 곡입니다.' },
    unplayed: { key: 'tryCandidates', label: '미기록 추천', subtitle: '아직 도전하지 않은 곡 중에서 실력에 잘 맞는 후보입니다.' },
    old: { key: 'oldCandidates', label: '오래된 기록', subtitle: '오래 전에 세운 기록 중에서 갱신 여지가 커 보이는 곡입니다.' },
}

async function fetchAnalyze(playerQuery) {
    const r = await axios.get(ANALYZE_URL, {
        params: { player: playerQuery },
        timeout: 20_000,
    })
    return r.data
}

// tab, page(0-based), perPage → 슬라이스 + 메타
function sliceCandidates(analyze, tab, page = 0, perPage = 10) {
    const meta = TAB_META[tab] ?? TAB_META.update
    const arr = Array.isArray(analyze?.[meta.key]) ? analyze[meta.key] : []
    const total = arr.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const p = Math.max(0, Math.min(page, totalPages - 1))
    const items = arr.slice(p * perPage, p * perPage + perPage)
    return { items, page: p, totalPages, total, tab, ...meta }
}

module.exports = { fetchAnalyze, sliceCandidates }
