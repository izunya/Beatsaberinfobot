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
client.slcmds = new Collection();
client.config = require('./config.js');

const { rlw } = require('./Interface/Builder.js')
const { tick: krRankTick } = require('./Function/KrRankTracker.js')

rlw()
krRankTick().catch((e) => console.warn('[kr-rank] 첫 tick 실패:', e?.message ?? e))

const patchnoteRule = new RecurrenceRule()
patchnoteRule.dayOfWeek = [0, new Range(0, 6)]
patchnoteRule.minute = 0
patchnoteRule.tz = 'Asia/Seoul'
scheduleJob(patchnoteRule, () => rlw())

// 매시 정각 KR 상위 100명 (SS + BL) PP 갱신 감지
const krRankRule = new RecurrenceRule()
krRankRule.minute = 0
krRankRule.tz = 'Asia/Seoul'
scheduleJob(krRankRule, () => krRankTick().catch((e) => console.warn('[kr-rank] tick 실패:', e?.message ?? e)))

require('./handler')(client);
client.login(process.env.TOKEN)