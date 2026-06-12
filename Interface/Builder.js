const Discord = require('discord.js');
const client = require('../index.js');
const axios = require('axios')
const fs = require('fs');
require('dotenv').config()

// Steam BBCode → Discord 마크다운
// 신규 포맷: [p]...[/p], [img src="..."], [previewyoutube="ID;full"][/previewyoutube]
// 기존 포맷: [img]URL[/img], [previewyoutube=ID;full][/previewyoutube]
async function str(contents) {
    // previewyoutube — 따옴표 유무 모두 허용
    const ytRegex = /\[previewyoutube\s*=\s*"?([^";\]]+);full"?\]\[\/previewyoutube\]/i
    const ytMatch = ytRegex.exec(contents)
    const ytURL = ytMatch ? ytMatch[1] : null

    let res = contents
        // [img]URL[/img] (구 포맷) → 줄바꿈
        .replace(/\[img\]({STEAM_CLAN_IMAGE}\/\d+\/[a-f\d]+\.(?:gif|jpg|jpeg|png))\[\/img\]/gi, '\n')
        // [img src="..."] (신 포맷, 자체 닫힘 태그) → 줄바꿈
        .replace(/\[img\b[^\]]*\]/gi, '\n')
        // 잔여 img 닫힘 등 잡기
        .replace(/\[\/img\]|\[list\]|\[\/list\]|\[u\]|\[\/u\]/gi, '')
        // [p]...[/p] 단락 태그 → 줄바꿈 (양 끝)
        .replace(/\[\/?p\]/gi, '\n')
        // [*] 목록 마커
        .replace(/\[\*\]/g, '• ')
        // [b][/b] 볼드 — 디스코드는 ** 사용, 단순 제거
        .replace(/\[\/?b\]/gi, '')
        // previewyoutube 치환 (있을 때만)
        .replace(/\[previewyoutube\s*=\s*"?[^"\]]+"?\]\[\/previewyoutube\]/gi, ytURL ? `https://youtu.be/${ytURL}` : '')
        // 연속 공백 줄바꿈 정리
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    return res
}

// 본문에서 첫 번째 이미지 URL 추출 (Steam CDN)
function extractImageURL(contents) {
    // 신: [img src="{STEAM_CLAN_IMAGE}/..."]  /  구: [img]{STEAM_CLAN_IMAGE}/...[/img]
    const re = /\[img(?:\s+src=["']([^"']+)["'][^\]]*\]|\]([^\[]+)\[\/img\])/i
    const m = re.exec(contents)
    const raw = m ? (m[1] || m[2]) : null
    if (!raw) return null
    return raw.replace('{STEAM_CLAN_IMAGE}', 'https://clan.akamai.steamstatic.com/images')
}

const webhookClient = new Discord.WebhookClient({ url: process.env.WEBHOOKS })
const url = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?access_token=2a1724406dcee2de5f5412077343662c&appid=620980&count=1'
async function rlw() {
    axios({
        method: 'get',
        url: url,
        responseType: 'json'
    }).then(async (response) => {
        const res = response.data.appnews.newsitems[0]
        const sts = await str(res.contents)
        const embed = new Discord.EmbedBuilder()
        const imageURL = extractImageURL(res.contents)
        const dates = fs.readFileSync('./res.txt', { encoding: 'utf-8' })
        if (dates == res.date) return false;
        fs.writeFileSync('./res.txt', `${res.date}`, { encoding: 'utf8' })
        embed.setTitle(`**${res.title}**`)
        embed.setURL(res.url)
        if (imageURL) embed.setImage(imageURL)
        embed.setDescription(sts)
        embed.setFooter({ text: 'BSPN' })
        embed.setTimestamp(parseInt(res.date) * 1000)
        webhookClient.send({
            username: 'Patch Note',
            embeds: [embed]
        })
    }).catch(function (error) {
        console.error(error);
    })
}

async function rl(message) {
    try{
        const response = await axios.get(url)
        const res = response.data.appnews.newsitems[0]
        const sts = await str(res.contents)
        const imageURL = extractImageURL(res.contents)
        // const dates = fs.readFileSync('./res.txt', { encoding: 'utf-8' })
        // if (dates == res.date) return;
        // fs.writeFileSync('./res.txt', `${res.date}`, { encoding: 'utf8' })
        const embed = new Discord.EmbedBuilder()
        embed.setTitle(`**${res.title}**`)
        embed.setURL(res.url)
        if (imageURL) embed.setImage(imageURL)
        embed.setDescription(sts)
        embed.setFooter({ text: 'BSPN' })
        embed.setTimestamp(parseInt(res.date) * 1000)
        message.reply({ embeds: [embed] })
        return;
    }catch(error){
        console.error(error);
    }
}


module.exports = { str, rlw, rl }
