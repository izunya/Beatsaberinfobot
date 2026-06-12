const Discord = require('discord.js');
const client = require('../index.js');
const axios = require('axios')
const fs = require('fs');
require('dotenv').config()

async function str(contents) {
    const ytRegex = /previewyoutube=([^;]+)/;
    const ytMatch = ytRegex.exec(contents)
    const ytURL = ytMatch ? ytMatch[1] : null
    let res = contents
        .replace(/\[img\]({STEAM_CLAN_IMAGE}\/\d+\/[a-f\d]+\.(?:gif|jpg|jpeg|png))\[\/img\]/, '\n')
        .replace(/\[img\]|\[\/img\]|\[list\]|\[\/list\]|\[u\]|\[\/u\]/g, '')
        .replace(/\[\*\]/g, '')
        .replace(/\n\n/g, '\n')
        .replace(/\[(\/)?b\]/g, '')
    if (ytURL) {
        res = res.replace(/\[previewyoutube=([^\]]+);full\]\[\/previewyoutube\]/, `https://youtu.be/${ytURL}`);
    } else {
        res = res.replace(/\[previewyoutube=([^\]]+);full\]\[\/previewyoutube\]/, '');
    }
    return res;
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
        const imageRegex = /\[img\]({STEAM_CLAN_IMAGE}\/\d+\/[a-f\d]+\.(?:gif|jpg|jpeg|png))\[\/img\]/;
        const imageMatch = imageRegex.exec(res.contents)
        const imageURL = imageMatch?.[1]?.replace('{STEAM_CLAN_IMAGE}', 'https://clan.akamai.steamstatic.com/images/')
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
        const imageRegex = /\[img\]({STEAM_CLAN_IMAGE}\/\d+\/[a-f\d]+\.(?:gif|jpg|jpeg|png))\[\/img\]/;
        const imageMatch = imageRegex.exec(res.contents)
        const imageURL = imageMatch?.[1]?.replace('{STEAM_CLAN_IMAGE}', 'https://clan.akamai.steamstatic.com/images/')
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
