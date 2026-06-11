const { Client, Collection, Partials, GatewayIntentBits } = require('discord.js');
const { scheduleJob, RecurrenceRule, Range } = require('node-schedule');
require('dotenv').config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildScheduledEvent, Partials.ThreadMember]
})
module.exports = client;

client.cmds = new Collection();
client.modcmds = new Collection();
client.slcmds = new Collection();
client.config = require('./config.js');

const { rlw } = require('./Interface/Builder.js')

rlw()

const RRl = new RecurrenceRule();
RRl.dayOfWeek = [0, new Range(0, 6)];
RRl.minute = 0o0;
RRl.tz = 'Asia/Seoul'

scheduleJob(RRl, async function () {
    await rlw()
})


require('./handler')(client);
client.login(process.env.TOKEN)