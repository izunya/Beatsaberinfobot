const { Events, PermissionFlagsBits, ChannelType, Colors, EmbedBuilder, } = require('discord.js');
const client = require('../index.js');

module.exports = {
    name: 'Chat_Event',
};

let chat;

// 일반챗 자동대답 봇
client.on(Events.MessageCreate, async (message) => {
    if(message.channel.type != ChannelType.GuildText) return;
    if(message.author.bot) return;
    if(message.content.toLowerCase().startsWith(client.config.prefix)) return;
    console.log(message)
})

// 질문방 자동대답 봇

client.on(Events.ThreadCreate, async (thread) => {
    if(thread.type != ChannelType.PublicThread) return;
    console.log(thread)
})

client.on(Events.MessageCreate,async (message) => {
    if(message.channel.type != ChannelType.PublicThread) return;
})