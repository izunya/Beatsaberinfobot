const client = require('../../index.js')
const { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, ComponentType, ApplicationCommandOptionType, Colors, } = require('discord.js')

module.exports = {
    name: 'scan',
    description: 'Scan Your BeatLeader | ScoreSaber Profile!',
    /**
     * @param {client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     * */
    run: async (client, interaction, args) => {
        try {
            // for(let i = 0; i < 100; i++){
            //     const blus = await axios.get(`https://api.beatleader.xyz/player/${score}/scores?sortBy=pp&order=desc&page=${i}&count=10`)
            //     const ssus = await axios.get(`http://scoresaber.com/api/player/${score}/scores?limit=10&sort=recent&page=${i}`)
            // }
        } catch (e) {
            return;
        }
    }
}
