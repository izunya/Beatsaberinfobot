const { Events, PermissionFlagsBits, ChannelType, ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const client = require('../index.js');
const {ko,en} = require('../Languages/Langs.js')

module.exports = {
    name: 'SlashCommand_Enable',
};

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
        const cmd = client.slcmds.get(interaction.commandName)
        if (cmd?.autocomplete) {
            try { await cmd.autocomplete(interaction) }
            catch (e) { console.warn('[autocomplete]', e?.message ?? e) }
        }
        return
    }
    // DM / user-install 등 guild 없는 경우 방어 — 봇은 길드 채널에서만 동작.
    if (!interaction.guild?.members?.me?.permissions?.has(PermissionFlagsBits.SendMessages)) return;
    if (interaction.user.bot) return;
    if (interaction.channel?.type === ChannelType.DM) return;
    if (interaction.isCommand()) {
        if(interaction.guildId == "521610949204115456"){if(interaction.channelId =="611665854542774275") return;}
        const cmd = client.slcmds.get(interaction.commandName);
        if (!cmd) return await interaction.reply({ content: ko.NotFoundCmd+en.NotFoundCmd, flags: MessageFlags.Ephemeral });
        if (cmd.permissions) {
            const userPerms = interaction.channel.permissionsFor(interaction.member);
            if (!userPerms || !userPerms.has(cmd.permissions)) return await interaction.reply({ content: ko.Permission+en.Permission, flags: MessageFlags.Ephemeral });
        }
        const args = [];
        for (let option of interaction.options.data) {
            if (option.type == ApplicationCommandOptionType.Subcommand) {
                if (option.name) args.push(option.name);
                option.options?.forEach((x) => {
                    if (x.value) args.push(x.value);
                });
            } else if (option.value) args.push(option.value)
        }
        console.log(`${cmd.name} | ${interaction.user.username} | ${interaction.member.id} | ${interaction.guild.name} | ${interaction.guild.id}`);
        try {
            await cmd.run(client, interaction, args);
            return;
        } catch (err) {
            await interaction.reply({ content: ko.Error+en.Error, flags: MessageFlags.Ephemeral }).catch(async () => {
                await interaction.reply({ content: ko.Error+en.Error, flags: MessageFlags.Ephemeral })
            })
            console.log(err);
            return;
        }
    }
})