const { EmbedBuilder, Colors, embedLength } = require('discord.js')
const axios = require('axios')
const dbClient = require('../db/database.js');
const { readFileSync, stat } = require('fs-extra');

function hmdlist(hmdId) {
    // 기기 정보 리턴
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

async function bl(id) {
    const embed = new EmbedBuilder();
    let score;
    // DB에 저장되어있는 유저 불러오기
    await stat(`${process.cwd()}/User/${id}.json`).catch(() => { return })
    try {
        const rfs = readFileSync(`${process.cwd()}/User/${id}.json`)
        const data = rfs.toLocaleString("utf-8")
        const useri = await JSON.parse(data)
        score = useri.data.score;
    } catch (e) {
        return;
    }

    // 플레이어 API 정보 불러오기.
    const blu = await axios.get(`https://api.beatleader.xyz/player/${score}`)
    // 기록되어있지 않은 사람 확인
    if (blu.data.pp <= 0 || blu.data == '' || blu.data == null || blu.data == undefined) {
        embed.setTitle(`**BeatLeader 정보**`)
        embed.setColor(Colors.Red)
        embed.setDescription(`BeatLeader | ScoresSaber 에서 정보를 찾을 수 없습니다!`)
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

    // 기기 정리
    let hmd = hmdlist(blu.data.scoreStats.topHMD)

    // 플랫폼 정리
    const platforms = function (platform) {
        if (platform == 'steam') return "PC 스팀"
        if (platform == 'oculuspc') return "PC 오큘러스"
        if (platform == 'oculus') return "퀘스트 오큘러스"
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

    // 스코어 정리
    const blus = await axios.get(`https://api.beatleader.xyz/player/${score}/scores?sortBy=pp&order=desc&page=1&count=3`)
    let ranks = [], songnames = [], authors = [], songlinks = [], diffs = [], mappers = [], pps = [], accs = [], leftaccs = [], rightaccs = [], badcuts = [], missednotes = [], wallhits = [], pauses = [], dts = [], totalmisss = []
    for (let i = 0; blus.data.data.length > i; i++) {
        ranks[i] = blus.data.data[i].rank.toLocaleString('ko-KR')
        songnames[i] = blus.data.data[i].leaderboard.song.name
        if (songnames[i].length > 50) songnames[i] = blus.data.data[i].leaderboard.song.name.substring(0, 50).concat("...");
        authors[i] = blus.data.data[i].leaderboard.song.author
        songlinks[i] = `https://beatleader.xyz/leaderboard/global/${blus.data.data[i].leaderboard.id}?1&search=${String(blus.data.data[0].player.name).replaceAll(" ", "+")}`
        diffs[i] = blus.data.data[i].leaderboard.difficulty.difficultyName.replaceAll("Plus", "+")
        mappers[i] = blus.data.data[i].leaderboard.song.mapper
        pps[i] = `${blus.data.data[i].pp.toFixed(2)}pp`
        accs[i] = `${(blus.data.data[i].accuracy * 100).toFixed(2)}%`
        leftaccs[i] = blus.data.data[i].accLeft.toFixed(2)
        rightaccs[i] = blus.data.data[i].accRight.toFixed(2)
        badcuts[i] = blus.data.data[i].badCuts
        if (blus.data.data[i].badCuts == undefined) badcuts[i] = 0
        missednotes[i] = blus.data.data[i].missedNotes
        if (blus.data.data[i].missedNotes == undefined) missednotes[i] = 0
        wallhits[i] = blus.data.data[i].wallHits
        if (blus.data.data[i].wallHits == undefined) wallhits[i] = 0
        pauses[i] = blus.data.data[i].pauses
        dts[i] = `<t:${blus.data.data[i].timepost}:R>`
        totalmisss[i] = badcuts + missednotes + wallhits
    }
    let tr = `
        🥇 **#${ranks[0]}** [**${authors[0]} - ${songnames[0]}**](${songlinks[0]}) ${diffs[0]} by **${mappers[0]}** / **${pps[0]} ${accs[0]}** [ L **${leftaccs[0]}** | R **${rightaccs[0]}** ] ${dts[0]}

        🥈 **#${ranks[1]}** [**${authors[1]} - ${songnames[1]}**](${songlinks[1]}) ${diffs[1]} by **${mappers[1]}** / **${pps[1]} ${accs[1]}** [ L **${leftaccs[1]}** | R **${rightaccs[1]}** ] ${dts[1]}

        🥉 **#${ranks[2]}** [**${authors[2]} - ${songnames[2]}**](${songlinks[2]}) ${diffs[2]} by **${mappers[2]}** / **${pps[2]} ${accs[2]}** [ L **${leftaccs[2]}** | R **${rightaccs[2]}** ] ${dts[2]}`
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
    embed.addFields({ name: '**클리어**', value: `**SS+** : ${SSP}\n**SS** : ${SS}\n**S+** : ${SP}\n**S** : ${S}\n**A** : ${A}` })
    embed.addFields({ name: '**세부 정보**', value: `**기종:** ${hmd}\n**플랫폼:** ${platforms(blu.data.scoreStats.topPlatform)}` })
    embed.addFields({ name: '**마지막 업데이트**', value: `<t:${blu.data.scoreStats.lastScoreTime}:R>` })
    if (blu.data.banned) embed.addFields({ name: '**차단된 시각**', value: `<t:${blu.data.banDescription.timeset}:R>` })
    embed.setFooter({ text: '랭크 | 언랭크 | 전체' })
    if (blu.data.clans.length >= 1) embed.addFields({ name: '클랜', value: clan })
    if (blu.data.socials.length >= 1) embed.addFields({ name: '소셜', value: social })
    // 보내기
    return embed
}

async function ss(id) {
    const embed = new EmbedBuilder();
    let score;
    // DB에 저장되어있는 유저 불러오기
    await stat(`${process.cwd()}/User/${id}.json`).catch(() => { return })
    try {
        const rfs = readFileSync(`${process.cwd()}/User/${id}.json`)
        const data = rfs.toLocaleString("utf-8")
        const useri = await JSON.parse(data)
        score = useri.data.score;
    } catch (e) {
        return;
    }
    // 플레이어 API 정보 불러오기.
    const ssu = await axios.get(`http://scoresaber.com/api/player/${score}/full`)
    const ssus = await axios.get(`http://scoresaber.com/api/player/${score}/scores?limit=1&sort=recent&page=1`)

    if (ssu.data.pp <= 0 || ssu.data == '' || ssu.data == null || ssu.data == undefined) {
        embed.setTitle(`**ScoreSaber 정보**`)
        embed.setColor(Discord.Colors.Red)
        embed.setDescription(`BeatLeader | ScoresSaber 에서 정보를 찾을 수 없습니다!`)
        return embed
    }

    // 랭킹 (전세계 , 국가)
    let rank = ssu.data.rank.toLocaleString('ko-KR')
    let crank = ssu.data.countryRank.toLocaleString('ko-KR')

    // PP정리
    let pp = ssu.data.pp.toFixed(2).toLocaleString('ko-KR')

    // 플레이 횟수 ( 랭 , 전체)
    let rpc = ssu.data.scoreStats.rankedPlayCount.toLocaleString('ko-KR')
    let apc = ssu.data.scoreStats.totalPlayCount.toLocaleString('ko-KR')

    // 전체 스코어 (랭 , 전체)
    let rts = ssu.data.scoreStats.totalRankedScore.toLocaleString('ko-KR')
    let ats = ssu.data.scoreStats.totalScore.toLocaleString('ko-KR')

    // 평균 정확도 ( 랭)  
    let AccRank = ssu.data.scoreStats.averageRankedAccuracy.toFixed(3)

    // 리플레이 
    let rp = ssu.data.scoreStats.replaysWatched.toLocaleString('ko-KR')

    // HMD
    let hmd = hmdlist(ssus.data.playerScores[0].score.hmd)

    // 프로필
    let profile = `[ScoreSaber](https://scoresaber.com/u/${ssu.data.id})`
    profile += `\n[Steam](https://steamcommunity.com/profiles/${ssu.data.id})`

    // 임베드 작성
    embed.setThumbnail(ssu.data.profilePicture)
    embed.setTitle(`**\`${ssu.data.name}\`'s ScoreSaber 정보**`)
    embed.addFields({ name: '**순위**', value: `[#${rank}](https://scoresaber.com/rankings) (:flag_${ssu.data.country.toLowerCase()}: [#${crank}](https://scoresaber.com/rankings?countries=${ssu.data.country}))`, inline: true })
    embed.addFields({ name: '**프로필**', value: `${profile}`, inline: true })
    embed.addFields({ name: '**PP**', value: `${pp}pp` })
    embed.addFields({ name: '**평균 랭크 정확도**', value: `${AccRank}%`, inline: true })
    embed.addFields({ name: '**플레이 카운트**', value: `${rpc} | ${apc}`, inline: true })
    embed.addFields({ name: '**총합 점수**', value: `${rts} | ${ats}`, inline: true })
    embed.addFields({ name: '**세부 정보**', value: `**기종:** ${hmd}\n**리플레이 본 횟수:** ${rp}` })
    embed.setFooter({ text: '랭크 | 언랭크' })
    console.log(ssu.data)
    // 보내기
    return embed
}

module.exports = { bl, ss }