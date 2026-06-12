const { EmbedBuilder, Colors, embedLength } = require('discord.js')
const axios = require('axios')
const dbClient = require('../db/database.js');
const { readFileSync, stat } = require('fs-extra');
const { getSnapshot } = require('./Snapshots.js');

function hmdlist(hmdId) {
    // 기기 정보 리턴
    if (hmdId == 61) return "Oculus Quest Pro"
    if (hmdId == 512) return "Oculus Quest 3"
    if (hmdId == 256) return "Oculus Quest 2"
    if (hmdId == 128) return "HTC Vive Cosmos"
    if (hmdId == 64) return "Valve Index"
    if (hmdId == 59) return "Medion Eraser"
    if (hmdId == 58) return "VRidge"
    if (hmdId == 57) return "Cloud XR"
    if (hmdId == 56) return "Asus WMR"
    if (hmdId == 55) return "Huawei VR"
    if (hmdId == 54) return "Vaporeon"
    if (hmdId == 53) return "hedy"
    if (hmdId == 52) return "glasses20"
    if (hmdId == 51) return "Vive DVT"
    if (hmdId == 50) return "e3"
    if (hmdId == 49) return "Dell Visor"
    if (hmdId == 48) return "Arpara"
    if (hmdId == 47) return "Vive Focus"
    if (hmdId == 46) return "Acer WMR"
    if (hmdId == 45) return "Lenovo Explorer"
    if (hmdId == 44) return "Disco"
    if (hmdId == 43) return "Qiyu Dream"
    if (hmdId == 42) return "Samsung WMR"
    if (hmdId == 41) return "HP Reverb"
    if (hmdId == 40) return "Pimax Artisan"
    if (hmdId == 39) return "Pimax 5K"
    if (hmdId == 38) return "Pimax 8K"
    if (hmdId == 37) return "Miramar"
    if (hmdId == 36) return "Vive Elite"
    if (hmdId == 35) return "Vive Pro 2"
    if (hmdId == 34) return "Pico Neo 3"
    if (hmdId == 33) return "Pico Neo 2"
    if (hmdId == 32) return "Oculus Quest"
    if (hmdId == 16) return "Oculus Rift S"
    if (hmdId == 8) return "Windows MR"
    if (hmdId == 4) return "HTC Vive Pro"
    if (hmdId == 2) return "HTC Vive"
    if (hmdId == 1) return "Oculus Cv 1"
    if (hmdId == 0) return "Unknown headset"
}

async function bl(id, directScore) {
    const embed = new EmbedBuilder();
    let score = directScore;
    // steam_id 등 직접 지정 시 연동 정보 조회 건너뜀
    if (!score) {
        // DB에 저장되어있는 유저 불러오기
        await stat(`${process.cwd()}/User/${id}.json`).catch(() => { return })
        try {
            const rfs = readFileSync(`${process.cwd()}/User/${id}.json`)
            const data = rfs.toLocaleString("utf-8")
            const useri = await JSON.parse(data)
            score = useri.data.score;
        } catch (e) {
            // JSON 파일이 없거나 손상된 경우 DB 조회로 폴백
            try {
                const res = await dbClient.query(`SELECT score FROM bsscore WHERE user_id = $1`, [id])
                if (res.rows.length > 0) {
                    score = res.rows[0].score
                }
            } catch (dbErr) {
                console.error('[bl] DB fallback 실패:', dbErr?.message ?? dbErr)
            }
        }
        // 마지막 폴백: BL 의 Discord ID 조회 — 봇과 미연동돼있어도 BL 측에 연결돼있으면 찾음
        if (!score) {
            try {
                const dcResp = await axios.get(`https://api.beatleader.xyz/player/discord/${id}`)
                if (dcResp.data?.id) score = dcResp.data.id
            } catch (dcErr) {
                if (dcErr?.response?.status !== 404) {
                    console.warn('[bl] BL discord lookup 실패:', dcErr?.message ?? dcErr)
                }
            }
        }
        if (!score) {
            embed.setTitle('**BeatLeader 정보**')
            embed.setColor(Colors.Red)
            embed.setDescription('연동된 계정 정보를 찾을 수 없습니다. `/link | >link` 로 먼저 계정을 연동해주세요.')
            return embed
        }
    }
    // 플레이어 데이터 — 본인 조회는 스냅샷만 사용, steam_id 등 직접 조회는 라이브 API
    const snapBL = directScore ? null : getSnapshot(id, 'bl')
    if (!directScore && !snapBL) {
        embed.setTitle('**BeatLeader 정보**')
        embed.setColor(Colors.Orange)
        embed.setDescription('아직 스캔된 데이터가 없습니다. `/scan | >scan` 으로 먼저 프로필을 스캔해주세요.')
        return embed
    }
    const blu = snapBL ? { data: snapBL.player } : await axios.get(`https://api.beatleader.xyz/player/${score}`)
    // 기록되어있지 않은 사람 확인
    if (blu.data == '' || blu.data == null || blu.data == undefined) {
        embed.setTitle(`**BeatLeader 정보**`)
        embed.setColor(Colors.Red)
        embed.setDescription(`BeatLeader | ScoreSaber 에서 정보를 찾을 수 없습니다!`)
        return embed
    }
    // 랭킹 (전세계 , 국가)
    let rank = blu.data.rank.toLocaleString('ko-KR')
    let crank = blu.data.countryRank.toLocaleString('ko-KR')

    // PP정리
    let pp = blu.data.pp.toFixed(2).toLocaleString('ko-KR')

    // 플레이 횟수 (언랭 , 랭 , 전체)
    let pc = blu.data.scoreStats.unrankedPlayCount.toLocaleString('ko-KR')
    let rpc = blu.data.scoreStats.rankedPlayCount.toLocaleString('ko-KR')
    let apc = blu.data.scoreStats.totalPlayCount.toLocaleString('ko-KR')

    // 전체 스코어 (랭 , 전체 , 언랭)
    let rts = blu.data.scoreStats.totalRankedScore.toLocaleString('ko-KR')
    let ats = blu.data.scoreStats.totalScore.toLocaleString('ko-KR')
    let ts = blu.data.scoreStats.totalUnrankedScore.toLocaleString('ko-KR')
    // 평균 정확도 (언랭 , 랭)  
    let Acc = (blu.data.scoreStats.averageAccuracy * 100).toFixed(3)
    let AccRank = (blu.data.scoreStats.averageRankedAccuracy * 100).toFixed(3)

    // 기기 정리 — topHMD 값이 있을 때만 표시
    const rawTopHmd = blu.data.scoreStats.topHMD
    const hmd = (rawTopHmd != null) ? hmdlist(rawTopHmd) : null

    // 플랫폼 정리
    const platforms = function (platform) {
        if (platform == 'steam') return "PC 스팀"
        if (platform == 'oculuspc') return "PC 오큘러스"
        if (platform == 'oculus') return "퀘스트 오큘러스"
        return null
    }

    // 클리어별 랭크
    let SSP = blu.data.scoreStats.sspPlays.toLocaleString('ko-KR')
    let SS = blu.data.scoreStats.ssPlays.toLocaleString('ko-KR')
    let SP = blu.data.scoreStats.spPlays.toLocaleString('ko-KR')
    let S = blu.data.scoreStats.sPlays.toLocaleString('ko-KR')
    let A = blu.data.scoreStats.aPlays.toLocaleString('ko-KR')

    // 클랜 정리
    let clan = "";
    for (ctag of blu.data.clans) {
        clan += `${ctag.tag} `;
    }
    // 소셜 정리
    let social = "";
    for (stag of blu.data.socials) {
        social += `[${stag.service}](${stag.link}) `
    }

    // 스코어 정리 — 스냅샷에 topScores 있으면 그걸 사용
    const blus = snapBL ? { data: { data: snapBL.topScores ?? [] } } : await axios.get(`https://api.beatleader.xyz/player/${score}/scores?sortBy=pp&order=desc&page=1&count=3`)
    let ranks = [], songnames = [], authors = [], songlinks = [], diffs = [], mappers = [], pps = [], accs = [], leftaccs = [], rightaccs = [], badcuts = [], missednotes = [], wallhits = [], pauses = [], dts = [], totalmisss = []
    const playerName = blus.data.data?.[0]?.player?.name ?? blu.data.name ?? ''
    for (let i = 0; blus.data.data.length > i; i++) {
        const s = blus.data.data[i]
        const lb = s?.leaderboard ?? {}
        const song = lb.song ?? {}
        const diff = lb.difficulty ?? {}
        ranks[i] = (s?.rank ?? 0).toLocaleString('ko-KR')
        songnames[i] = song.name ?? '-'
        if (songnames[i].length > 50) songnames[i] = songnames[i].substring(0, 50).concat("...");
        authors[i] = song.author ?? '-'
        songlinks[i] = `https://beatleader.xyz/leaderboard/global/${lb.id ?? ''}?1&search=${String(playerName).replaceAll(" ", "+")}`
        diffs[i] = (diff.difficultyName ?? '-').replaceAll("Plus", "+")
        mappers[i] = song.mapper ?? '-'
        pps[i] = `${(s?.pp ?? 0).toFixed(2)}pp`
        accs[i] = `${((s?.accuracy ?? 0) * 100).toFixed(2)}%`
        leftaccs[i] = (s?.accLeft ?? 0).toFixed(2)
        rightaccs[i] = (s?.accRight ?? 0).toFixed(2)
        badcuts[i] = s?.badCuts ?? 0
        missednotes[i] = s?.missedNotes ?? 0
        wallhits[i] = s?.wallHits ?? 0
        pauses[i] = s?.pauses ?? 0
        dts[i] = `<t:${s?.timepost ?? 0}:R>`
        totalmisss[i] = badcuts[i] + missednotes[i] + wallhits[i]
    }
    const medals = ['🥇', '🥈', '🥉']
    let tr = ranks.map((_, i) =>
        `        ${medals[i] ?? '•'} **#${ranks[i]}** [**${authors[i]} - ${songnames[i]}**](${songlinks[i]}) ${diffs[i]} by **${mappers[i]}** / **${pps[i]} ${accs[i]}** [ L **${leftaccs[i]}** | R **${rightaccs[i]}** ] ${dts[i]}`
    ).join('\n\n')
    if (!tr) tr = '_기록 없음_'
    let profile = `[BeatLeader](https://www.beatleader.xyz/u/${blu.data.id})`
    if (blu.data.externalProfileUrl != '') profile += `\n[Steam](${blu.data.externalProfileUrl})`
    // 임베드 작성
    embed.setThumbnail(blu.data.avatar)
    embed.setTitle(`**\`${blu.data.name}\`'s BeatLeader 정보**`)
    if (blu.data.banned) embed.setTitle(`**\`${blu.data.name}\`'s BeatLeader 정보** [ 차단됨! ]`)
    embed.addFields({ name: '**순위**', value: `[#${rank}](https://www.beatleader.xyz/ranking/) (:flag_${blu.data.country.toLowerCase()}: [#${crank}](https://www.beatleader.xyz/ranking/1?countries=${blu.data.country}))`, inline: true })
    embed.addFields({ name: '**프로필**', value: `${profile}`, inline: true })
    embed.addFields({ name: '**PP**', value: `**현재:** ${pp}pp \n **최고:** ${blu.data.scoreStats.topPp.toFixed(2)}pp` })
    embed.addFields({ name: '**평균 정확도**', value: `${AccRank}% | ${Acc}% `, inline: true })
    embed.addFields({ name: '**플레이 카운트**', value: `${rpc} | ${pc} | ${apc}`, inline: true })
    embed.addFields({ name: '**총 점수**', value: `${rts} | ${ts} | ${ats}`, inline: true })
    embed.addFields({ name: '**평균 순위**', value: `#${blu.data.scoreStats.averageRankedRank.toFixed(2)} | #${blu.data.scoreStats.averageUnrankedRank.toFixed(2)} | #${blu.data.scoreStats.averageRank.toFixed(2)}`, inline: true })
    if (embedLength(embed.data) <= 2000) embed.addFields({ name: '최고 랭킹', value: `${tr}` })
    // TOP REPLAY 링크 — replay.beatleader.com (izudisbot info 임베드 호환)
    try {
        const replayLinks = blus.data.data
            .map((s, i) => s?.id ? `[\`[${i + 1}]\`](https://replay.beatleader.com/?scoreId=${s.id})` : null)
            .filter(Boolean)
        if (replayLinks.length > 0) {
            embed.addFields({ name: '**TOP REPLAY**', value: replayLinks.join(' '), inline: false })
        }
    } catch (e) { console.warn('[bl] replay link 생성 실패:', e?.message ?? e) }
    embed.addFields({ name: '**클리어**', value: `**SS+** : ${SSP}\n**SS** : ${SS}\n**S+** : ${SP}\n**S** : ${S}\n**A** : ${A}` })
    // 세부 정보 — 기종/플랫폼은 데이터 있을 때만 표시
    {
        const platformStr = platforms(blu.data.scoreStats.topPlatform)
        const parts = []
        if (hmd) parts.push(`**기종:** ${hmd}`)
        if (platformStr) parts.push(`**플랫폼:** ${platformStr}`)
        if (parts.length > 0) embed.addFields({ name: '**세부 정보**', value: parts.join('\n') })
    }
    // 가입일 — ss() 와 일관성, firstSeen 있을 때만
    if (blu.data.firstSeen) {
        const firstSeenUnix = Math.floor(new Date(blu.data.firstSeen).getTime() / 1000)
        if (Number.isFinite(firstSeenUnix)) {
            embed.addFields({ name: '**가입일**', value: `<t:${firstSeenUnix}:D> (<t:${firstSeenUnix}:R>)`, inline: false })
        }
    }
    if (blu.data.scoreStats?.lastScoreTime) embed.addFields({ name: '**마지막 업데이트**', value: `<t:${blu.data.scoreStats.lastScoreTime}:R>` })
    if (blu.data.banned) embed.addFields({ name: '**차단된 시각**', value: `<t:${blu.data.banDescription.timeset}:R>` })
    if (snapBL?.lastScanAt) {
        embed.setFooter({ text: `랭크 | 언랭크 | 전체 · 마지막 스캔: ${new Date(snapBL.lastScanAt * 1000).toLocaleString('ko-KR')}` })
    } else {
        embed.setFooter({ text: '랭크 | 언랭크 | 전체' })
    }
    if (blu.data.clans.length >= 1) embed.addFields({ name: '클랜', value: clan })
    if (blu.data.socials.length >= 1) embed.addFields({ name: '소셜', value: social })
    // 보내기
    return embed
}

async function ss(id, directScore) {
    const embed = new EmbedBuilder();
    let score = directScore;
    // steam_id 등 직접 지정 시 연동 정보 조회 건너뜀
    if (!score) {
        // DB에 저장되어있는 유저 불러오기 — bl() 과 일관된 폴백 흐름
        await stat(`${process.cwd()}/User/${id}.json`).catch(() => { return })
        try {
            const rfs = readFileSync(`${process.cwd()}/User/${id}.json`)
            const data = rfs.toLocaleString("utf-8")
            const useri = await JSON.parse(data)
            score = useri.data.score;
        } catch (e) {
            // JSON 파일이 없거나 손상된 경우 DB 조회로 폴백
            try {
                const res = await dbClient.query(`SELECT score FROM bsscore WHERE user_id = $1`, [id])
                if (res.rows.length > 0) {
                    score = res.rows[0].score
                }
            } catch (dbErr) {
                console.error('[ss] DB fallback 실패:', dbErr?.message ?? dbErr)
            }
        }
        // 마지막 폴백: BL Discord lookup 으로 SteamID64 얻어서 SS 쪽에서 그대로 사용
        if (!score) {
            try {
                const dcResp = await axios.get(`https://api.beatleader.xyz/player/discord/${id}`)
                if (dcResp.data?.id) score = dcResp.data.id
            } catch (dcErr) {
                if (dcErr?.response?.status !== 404) {
                    console.warn('[ss] BL discord lookup 실패:', dcErr?.message ?? dcErr)
                }
            }
        }
        if (!score) {
            embed.setTitle('**ScoreSaber 정보**')
            embed.setColor(Colors.Red)
            embed.setDescription('연동된 계정 정보를 찾을 수 없습니다. `/link | >link` 로 먼저 계정을 연동해주세요.')
            return embed
        }
    }
    // 본인 조회는 스냅샷만, steam_id 직접 조회는 라이브 v2 API
    const snapSS = directScore ? null : getSnapshot(id, 'ss')
    if (!directScore && !snapSS) {
        embed.setTitle('**ScoreSaber 정보**')
        embed.setColor(Colors.Orange)
        embed.setDescription('아직 스캔된 데이터가 없습니다. `/scan | >scan` 으로 먼저 프로필을 스캔해주세요.')
        return embed
    }
    const ssu = snapSS ? { data: snapSS.player } : await axios.get(`https://scoresaber.com/api/v2/players/${score}`)
    const stats = ssu.data?.stats ?? {}

    if ((stats.totalPP ?? 0) <= 0 && (stats.totalPlayedLeaderboards ?? 0) <= 0) {
        embed.setTitle(`**ScoreSaber 정보**`)
        embed.setColor(Colors.Red)
        embed.setDescription(`BeatLeader | ScoreSaber 에서 정보를 찾을 수 없습니다!`)
        return embed
    }

    // 랭킹 (전세계 , 국가)
    let rank = (stats.rank ?? 0).toLocaleString('ko-KR')
    let crank = (stats.countryRank ?? 0).toLocaleString('ko-KR')

    // PP정리 (v2: stats.totalPP)
    let pp = (stats.totalPP ?? 0).toFixed(2).toLocaleString('ko-KR')

    // 플레이 횟수 ( 랭 , 전체 ) — v2: totalPlayedRankedLeaderboards / totalPlayedLeaderboards
    const rankedPlayCountNum = stats.totalPlayedRankedLeaderboards ?? 0
    const totalPlayCountNum = stats.totalPlayedLeaderboards ?? 0
    const unrankedPlayCountNum = Math.max(0, totalPlayCountNum - rankedPlayCountNum)
    let rpc = rankedPlayCountNum.toLocaleString('ko-KR')
    let apc = totalPlayCountNum.toLocaleString('ko-KR')
    const unrankedPC = unrankedPlayCountNum.toLocaleString('ko-KR')

    // 전체 스코어 (랭 , 전체) — v2 에서는 문자열로 옴, BigInt 로 변환해 안전 비교
    const rankedScoreBig = BigInt(stats.totalRankedScore ?? 0)
    const totalScoreBig = BigInt(stats.totalScore ?? 0)
    const unrankedScoreBig = totalScoreBig - rankedScoreBig
    let rts = rankedScoreBig.toLocaleString('ko-KR')
    let ats = totalScoreBig.toLocaleString('ko-KR')
    const uts = (unrankedScoreBig < 0n ? 0n : unrankedScoreBig).toLocaleString('ko-KR')

    // 평균 정확도 — v2 averageAccuracy 는 이미 % 단위
    let AccRank = (stats.averageAccuracy ?? 0).toFixed(3)

    // 리플레이 — v2: totalReplayViews
    let rp = (stats.totalReplayViews ?? 0).toLocaleString('ko-KR')

    // HMD — v2 는 문자열 ("Quest Pro" 등) 그대로 사용
    const device = stats.device ?? {}
    const hmd = device.hmd || null
    // CONTROLLER — v2 문자열 그대로
    const controllerL = device.controllerLeft || null
    const controllerR = device.controllerRight || null
    let controller = null
    if (controllerL || controllerR) {
        controller = (controllerL && controllerR && controllerL === controllerR)
            ? controllerL
            : `L: ${controllerL ?? 'Unknown'}, R: ${controllerR ?? 'Unknown'}`
    }

    // 프로필
    let profile = `[ScoreSaber](https://scoresaber.com/u/${ssu.data.id})`
    profile += `\n[Steam](https://steamcommunity.com/profiles/${ssu.data.id})`

    // 임베드 작성 — v2: avatar / country / createdAt
    embed.setThumbnail(ssu.data.avatar || null)
    embed.setTitle(`**\`${ssu.data.name}\`'s ScoreSaber 정보**`)
    {
        // ScoreSaber 랭킹 페이지는 50명 단위 — 본인이 위치한 페이지로 이동
        const rankPage = Math.max(1, Math.ceil((stats.rank ?? 1) / 50))
        const crankPage = Math.max(1, Math.ceil((stats.countryRank ?? 1) / 50))
        const countryLower = (ssu.data.country ?? '').toLowerCase()
        const globalUrl = `https://scoresaber.com/rankings?page=${rankPage}`
        const countryUrl = `https://scoresaber.com/rankings?page=${crankPage}&countries=${countryLower}`
        embed.addFields({ name: '**순위**', value: `[#${rank}](${globalUrl}) (:flag_${countryLower}: [#${crank}](${countryUrl}))`, inline: true })
    }
    embed.addFields({ name: '**프로필**', value: `${profile}`, inline: true })
    embed.addFields({ name: '**PP**', value: `${pp}pp` })
    embed.addFields({ name: '**평균 랭크 정확도**', value: `${AccRank}%`, inline: true })
    embed.addFields({ name: '**플레이 카운트**', value: `${rpc} | ${unrankedPC} | ${apc}`, inline: true })
    embed.addFields({ name: '**총합 점수**', value: `${rts} | ${uts} | ${ats}`, inline: true })
    // 세부 정보 — HMD/컨트롤러 있을 때만 (v2 device 정보), 없으면 리플레이 본 횟수만
    {
        const parts = []
        if (hmd) {
            const ctlPart = controller ? ` | 컨트롤러: ${controller}` : ''
            parts.push(`**기종:** 헤드셋: ${hmd}${ctlPart}`)
        }
        parts.push(`**리플레이 본 횟수:** ${rp}`)
        embed.addFields({ name: '**세부 정보**', value: parts.join('\n') })
    }
    // 가입일 — v2: createdAt
    if (ssu.data.createdAt) {
        const firstSeenUnix = Math.floor(new Date(ssu.data.createdAt).getTime() / 1000)
        if (Number.isFinite(firstSeenUnix)) {
            embed.addFields({ name: '**가입일**', value: `<t:${firstSeenUnix}:D> (<t:${firstSeenUnix}:R>)`, inline: false })
        }
    }
    // TOP PP / TOP REPLAY — izudisbot info 임베드 호환 (v2: data / leaderboard.map.* / score.createdAt)
    try {
        const ssTop = snapSS ? { data: { data: snapSS.topScores ?? [] } } : await axios.get(`https://scoresaber.com/api/v2/players/${score}/scores?limit=3&sort=top&page=1`)
        const playerScores = Array.isArray(ssTop.data?.data) ? ssTop.data.data : []
        const SS_MEDALS = ['🥇', '🥈', '🥉']
        const SS_DIFF_SHORT = { 1: 'E', 3: 'NM', 5: 'HD', 7: 'EX', 9: 'EX+' }
        const lines = playerScores.map((e, i) => {
            const sc = e?.score, lb = e?.leaderboard
            if (!sc || !lb) return null
            const map = lb.map ?? {}
            const medal = SS_MEDALS[i] ?? '🏅'
            const rk = sc.rank != null ? `#${sc.rank.toLocaleString('ko-KR')}` : '#?'
            const ppv = (sc.pp ?? 0).toFixed(2)
            const accv = (sc.accuracy && sc.accuracy > 0)
                ? sc.accuracy * 100
                : (lb.maxScore && sc.modifiedScore ? (sc.modifiedScore / lb.maxScore) * 100 : null)
            const accStr = accv != null ? `${accv.toFixed(2)}%` : '?%'
            const diff = SS_DIFF_SHORT[lb.difficulty?.difficulty] ?? '?'
            const songName = map.songName ?? '(unknown)'
            const mapper = map.levelAuthorName ?? '?'
            const link = lb.id ? `[${songName}](https://scoresaber.com/leaderboard/${lb.id})` : songName
            const unix = sc.createdAt ? Math.floor(new Date(sc.createdAt).getTime() / 1000) : null
            const when = unix ? ` · <t:${unix}:R>` : ''
            return `${medal} ${rk} ${link} \`[${diff}]\` by ${mapper} · **${ppv}pp ${accStr}**${when}`
        }).filter(Boolean)
        if (lines.length > 0) {
            embed.addFields({ name: '**TOP PP**', value: lines.join('\n'), inline: false })
        }
        const replayLinks = playerScores
            .map((e, i) => e?.score?.id ? `[\`[${i + 1}]\`](https://watch.scoresaber.com/?ssScoreId=${e.score.id}&autoPlay=true)` : null)
            .filter(Boolean)
        if (replayLinks.length > 0) {
            embed.addFields({ name: '**TOP REPLAY**', value: replayLinks.join(' '), inline: false })
        }
    } catch (e) { console.warn('[ss] top scores fetch 실패:', e?.message ?? e) }
    if (snapSS?.lastScanAt) {
        embed.setFooter({ text: `랭크 | 언랭크 | 전체 · 마지막 스캔: ${new Date(snapSS.lastScanAt * 1000).toLocaleString('ko-KR')}` })
    } else {
        embed.setFooter({ text: '랭크 | 언랭크 | 전체' })
    }
    // 보내기
    return embed
}

module.exports = { bl, ss }