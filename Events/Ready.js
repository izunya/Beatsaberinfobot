const { ActivityType, PresenceUpdateStatus, Events } = require('discord.js');
const client = require('../index.js');
module.exports = {
    name: 'ready'
}

client.on(Events.ClientReady, (client) => {
    console.log("Bot Ready!" + `\nLogged in as ${client.user.tag} | ${client.user.id}!`);
    client.user.setPresence({ activities: [{name:'>help | /help', type:ActivityType.Playing}], status: PresenceUpdateStatus.Online })
    setInterval(() => {
        client.user.setPresence({ activities: [{name:'>help | /help', type:ActivityType.Playing}], status: PresenceUpdateStatus.Online })
    },60000)
})