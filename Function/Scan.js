const axios = require('axios')
const { EmbedBuilder, Colors } = require('discord.js')
const { getSnapshot, saveSnapshot } = require('./Snapshots.js')
const { revealRankedSection } = require('./RankedPager.js')
const { mdText, mdLinkLabel, inlineCode, urlParam } = require('./Escape.js')

// ─── BL ────────────────────────────────────────────────────
async function scanBL(score, prevSnap) {
    // player + top3 병렬 fetch
    const [pResp, tResp] = await Promise.all([
        axios.get(`https://api.beatleader.xyz/player/${score}`),
        axios.get(`https://api.beatleader.xyz/player/${score}/scores?sortBy=pp&order=desc&page=1&count=3`),
    ])
    const blu = pResp.data
    const top3 = tResp.data?.data ?? []

    const baseline = prevSnap?.lastNewRankedScoreTime ?? 0
    const newRanked = []
    let newestTimepost = baseline
    if (baseline > 0) {
        outer: for (let page = 1; page <= 10; page++) {
            const resp = (await axios.get(`https://api.beatleader.xyz/player/${score}/scores?sortBy=date&order=desc&page=${page}&count=50`)).data?.data ?? []
            if (resp.length === 0) break
            for (const s of resp) {
                const tp = s?.timepost ?? 0
                if (tp <= baseline) break outer
                if ((s?.pp ?? 0) > 0) {
                    newRanked.push(s)
                    if (tp > newestTimepost) newestTimepost = tp
                }
            }
            if (resp.length < 50) break
        }
    } else {
        const resp = (await axios.get(`https://api.beatleader.xyz/player/${score}/scores?sortBy=date&order=desc&page=1&count=10`)).data?.data ?? []
        for (const s of resp) {
            if ((s?.pp ?? 0) > 0 && (s?.timepost ?? 0) > newestTimepost) newestTimepost = s.timepost
        }
    }
    newRanked.sort((a, b) => (b?.pp ?? 0) - (a?.pp ?? 0))

    const newSnap = {
        lastScanAt: Math.floor(Date.now() / 1000),
        player: blu,
        topScores: top3,
        lastNewRankedScoreTime: newestTimepost,
    }
    return { player: blu, prev: prevSnap, newSnap, newRanked }
}

// ─── SS ────────────────────────────────────────────────────
async function scanSS(score, prevSnap) {
    const [pResp, tResp] = await Promise.all([
        axios.get(`https://scoresaber.com/api/v2/players/${score}`),
        axios.get(`https://scoresaber.com/api/v2/players/${score}/scores?limit=3&sort=top&page=1`),
    ])
    const ssu = pResp.data
    const top3 = tResp.data?.data ?? []
    const baseline = prevSnap?.lastNewRankedScoreTime ?? 0
    const newRanked = []
    let newestUnix = baseline
    const scoreUnix = (s) => s?.score?.createdAt ? Math.floor(new Date(s.score.createdAt).getTime() / 1000) : 0
    if (baseline > 0) {
        outer: for (let page = 1; page <= 10; page++) {
            const resp = (await axios.get(`https://scoresaber.com/api/v2/players/${score}/scores?limit=50&sort=recent&page=${page}`)).data?.data ?? []
            if (resp.length === 0) break
            for (const e of resp) {
                const u = scoreUnix(e)
                if (u <= baseline) break outer
                if ((e?.score?.pp ?? 0) > 0) {
                    newRanked.push(e)
                    if (u > newestUnix) newestUnix = u
                }
            }
            if (resp.length < 50) break
        }
    } else {
        const resp = (await axios.get(`https://scoresaber.com/api/v2/players/${score}/scores?limit=10&sort=recent&page=1`)).data?.data ?? []
        for (const e of resp) {
            const u = scoreUnix(e)
            if ((e?.score?.pp ?? 0) > 0 && u > newestUnix) newestUnix = u
        }
    }
    newRanked.sort((a, b) => (b?.score?.pp ?? 0) - (a?.score?.pp ?? 0))
    const newSnap = {
        lastScanAt: Math.floor(Date.now() / 1000),
        player: ssu,
        topScores: top3,
        lastNewRankedScoreTime: newestUnix,
    }
    return { player: ssu, prev: prevSnap, newSnap, newRanked }
}

// ─── delta helpers ─────────────────────────────────────────
// 색·방향 매핑
//   inverted=false (PP/정확도/카운트 등): 커질수록 좋음 → up=green / down=red
//   inverted=true  (랭킹): 작아질수록 좋음 → down=green / up=red
function fmtDeltaNum(curr, prev, { decimals = 0, inverted = false, unit = '' } = {}) {
    if (prev == null) return ''
    const cN = Number(curr), pN = Number(prev)
    if (!Number.isFinite(cN) || !Number.isFinite(pN)) return ''
    const d = cN - pN
    if (d === 0) return ' (변동 없음)'
    const isGood = inverted ? d < 0 : d > 0
    const isUp = d > 0
    const icon = isGood
        ? (isUp ? '<:green_arrow_up:1520162546240323594>' : '<:green_arrow_down:1520162505878540450>')
        : (isUp ? '🔺' : '🔻')
    const abs = Math.abs(d)
    const val = decimals > 0 ? abs.toFixed(decimals) : Math.round(abs).toLocaleString('ko-KR')
    return ` ${icon} ${val}${unit}`
}

// ─── per-score line formatters ─────────────────────────────
function blScoreLine(s, playerName) {
    const lb = s?.leaderboard ?? {}
    const song = lb.song ?? {}
    const diff = lb.difficulty ?? {}
    const rk = (s?.rank ?? 0).toLocaleString('ko-KR')
    const pp = (s?.pp ?? 0).toFixed(2)
    const acc = ((s?.accuracy ?? 0) * 100).toFixed(2)
    const diffName = inlineCode((diff.difficultyName ?? '-').replaceAll('Plus', '+'))
    const name = mdLinkLabel(song.name ?? '-')
    const mapper = mdText(song.mapper ?? '-')
    const link = `https://beatleader.xyz/leaderboard/global/${lb.id ?? ''}?1&search=${urlParam(playerName)}`
    const when = s?.timepost ? ` · <t:${s.timepost}:R>` : ''
    return `**#${rk}** [${name}](${link}) \`[${diffName}]\` by ${mapper} · **${pp}pp ${acc}%**${when}`
}
const SS_DIFF_SHORT = { 1: 'E', 3: 'NM', 5: 'HD', 7: 'EX', 9: 'EX+' }
function ssScoreLine(e) {
    const sc = e?.score ?? {}
    const lb = e?.leaderboard ?? {}
    const map = lb.map ?? {}
    const rk = (sc.rank ?? 0).toLocaleString('ko-KR')
    const pp = (sc.pp ?? 0).toFixed(2)
    const acc = sc.accuracy && sc.accuracy > 0
        ? (sc.accuracy * 100).toFixed(2)
        : (lb.maxScore && sc.modifiedScore ? ((sc.modifiedScore / lb.maxScore) * 100).toFixed(2) : '?')
    const diff = SS_DIFF_SHORT[lb.difficulty?.difficulty] ?? '?'
    const name = mdLinkLabel(map.songName ?? '-')
    const mapper = mdText(map.levelAuthorName ?? '?')
    const link = lb.id ? `https://scoresaber.com/leaderboard/${lb.id}` : 'https://scoresaber.com'
    const unix = sc.createdAt ? Math.floor(new Date(sc.createdAt).getTime() / 1000) : null
    const when = unix ? ` · <t:${unix}:R>` : ''
    return `**#${rk}** [${name}](${link}) \`[${diff}]\` by ${mapper} · **${pp}pp ${acc}%**${when}`
}

// ─── base embeds ──────────────────────────────────────────
function buildBLBaseEmbed({ player, prev, newRanked, isFirstScan }) {
    const e = new EmbedBuilder()
    e.setColor(isFirstScan ? Colors.Aqua : Colors.Green)
    if (player.avatar) e.setThumbnail(player.avatar)
    e.setTitle(`**\`${inlineCode(player.name)}\`** BeatLeader 스캔 결과`)
    const prevP = prev?.player
    const prevStats = prevP?.scoreStats ?? {}
    const stats = player.scoreStats ?? {}
    e.addFields(
        { name: '**PP**', value: `${(player.pp ?? 0).toFixed(2)}pp${fmtDeltaNum(player.pp, prevP?.pp, { decimals: 2, unit: 'pp' })}`, inline: true },
        { name: '**글로벌 랭킹**', value: `#${(player.rank ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(player.rank, prevP?.rank, { inverted: true })}`, inline: true },
        { name: '**국가 랭킹**', value: `#${(player.countryRank ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(player.countryRank, prevP?.countryRank, { inverted: true })}`, inline: true },
        { name: '**평균 랭크 정확도**', value: `${((stats.averageRankedAccuracy ?? 0) * 100).toFixed(3)}%${fmtDeltaNum((stats.averageRankedAccuracy ?? 0) * 100, prevStats.averageRankedAccuracy != null ? prevStats.averageRankedAccuracy * 100 : null, { decimals: 3, unit: '%' })}`, inline: true },
        { name: '**랭크 플레이**', value: `${(stats.rankedPlayCount ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(stats.rankedPlayCount, prevStats.rankedPlayCount)}`, inline: true },
        { name: '**최고 PP**', value: `${(stats.topPp ?? 0).toFixed(2)}pp${fmtDeltaNum(stats.topPp, prevStats.topPp, { decimals: 2, unit: 'pp' })}`, inline: true },
    )
    e.setDescription(isFirstScan
        ? '첫 스캔입니다. 다음 스캔부터 변화량과 새 랭크맵이 표시됩니다.'
        : `이전 스캔: <t:${prev.lastScanAt}:R>\n새 랭크맵 ${newRanked.length} 곡 발견`)
    return e
}
function buildSSBaseEmbed({ player, prev, newRanked, isFirstScan }) {
    const e = new EmbedBuilder()
    e.setColor(isFirstScan ? Colors.Aqua : Colors.Green)
    if (player.avatar) e.setThumbnail(player.avatar)
    e.setTitle(`**\`${inlineCode(player.name)}\`** ScoreSaber 스캔 결과`)
    const prevP = prev?.player
    const stats = player.stats ?? {}
    const prevStats = prevP?.stats ?? {}
    e.addFields(
        { name: '**PP**', value: `${(stats.totalPP ?? 0).toFixed(2)}pp${fmtDeltaNum(stats.totalPP, prevStats.totalPP, { decimals: 2, unit: 'pp' })}`, inline: true },
        { name: '**글로벌 랭킹**', value: `#${(stats.rank ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(stats.rank, prevStats.rank, { inverted: true })}`, inline: true },
        { name: '**국가 랭킹**', value: `#${(stats.countryRank ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(stats.countryRank, prevStats.countryRank, { inverted: true })}`, inline: true },
        { name: '**평균 정확도**', value: `${(stats.averageAccuracy ?? 0).toFixed(3)}%${fmtDeltaNum(stats.averageAccuracy, prevStats.averageAccuracy, { decimals: 3, unit: '%' })}`, inline: true },
        { name: '**랭크 플레이**', value: `${(stats.totalPlayedRankedLeaderboards ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(stats.totalPlayedRankedLeaderboards, prevStats.totalPlayedRankedLeaderboards)}`, inline: true },
        { name: '**리플레이 본 횟수**', value: `${(stats.totalReplayViews ?? 0).toLocaleString('ko-KR')}${fmtDeltaNum(stats.totalReplayViews, prevStats.totalReplayViews)}`, inline: true },
    )
    e.setDescription(isFirstScan
        ? '첫 스캔입니다. 다음 스캔부터 변화량과 새 랭크맵이 표시됩니다.'
        : `이전 스캔: <t:${prev.lastScanAt}:R>\n새 랭크맵 ${newRanked.length} 곡 발견`)
    return e
}

// ─── 변동 감지 ─────────────────────────────────────────────
// 첫 스캔(prev 없음)은 무조건 변동 있음으로 취급 — 베이스라인을 보여줘야 함
function hasBLChange(player, prev, newRanked) {
    if (!prev) return true
    if ((newRanked?.length ?? 0) > 0) return true
    const pp = prev.player ?? {}
    const ps = pp.scoreStats ?? {}
    const cs = player.scoreStats ?? {}
    return player.pp !== pp.pp
        || player.rank !== pp.rank
        || player.countryRank !== pp.countryRank
        || cs.averageRankedAccuracy !== ps.averageRankedAccuracy
        || cs.rankedPlayCount !== ps.rankedPlayCount
        || cs.topPp !== ps.topPp
}
function hasSSChange(player, prev, newRanked) {
    if (!prev) return true
    if ((newRanked?.length ?? 0) > 0) return true
    const pp = prev.player ?? {}
    const ps = pp.stats ?? {}
    const cs = player.stats ?? {}
    return cs.totalPP !== ps.totalPP
        || cs.rank !== ps.rank
        || cs.countryRank !== ps.countryRank
        || cs.averageAccuracy !== ps.averageAccuracy
        || cs.totalPlayedRankedLeaderboards !== ps.totalPlayedRankedLeaderboards
        || cs.totalReplayViews !== ps.totalReplayViews
}

module.exports = {
    scanBL, scanSS,
    blScoreLine, ssScoreLine,
    buildBLBaseEmbed, buildSSBaseEmbed,
    revealRankedSection,
    hasBLChange, hasSSChange,
    getSnapshot, saveSnapshot,
}
