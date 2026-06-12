const { Events, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const client = require('../index.js');

module.exports = {
    name: 'Component',
};

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    const component = interaction.component;
    if (component.customId == 'helpmenu') {
        const option = component.options[0];
        console.log(option.value)
        const embed = new EmbedBuilder()
        const embedset = (name, des, aliases) => {
            embed.setTitle(`**` + name + `**`)
            embed.setDescription(`${des}`)
            embed.addFields({ name: `Aliases (별명)`, value: `${aliases.sort((a, b) => b.localeCompare(a))}` })
        }
        let cmds = client.cmds.get(option.value);
        switch (option.value) {
            case 'help':
                await interaction.deferUpdate()
                embedset(cmds.name, cmds.description, cmds.aliases)
                await interaction.channel.send({ content: `${interaction.user}`, embeds: [embed], allowedMentions: { repliedUser: false } })
                break
        }
    }
})