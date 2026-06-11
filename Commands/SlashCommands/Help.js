const client = require('../../index.js')
const dbClient = require('../../db/database.js')
const axios = require('axios');
const { CommandInteraction, Colors, ButtonStyle, ButtonBuilder, ComponentType, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const { ko, en } = require('../../Languages/Langs.js');

module.exports = {
    name: "help",
    description: "Help!!!!",
    /**
     *
     * @param {client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        
    }
}