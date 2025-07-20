import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import {ActionRowBuilder, StringSelectMenuBuilder, TextInputStyle} from "discord.js";
import {timedMessages} from "../mongo";

@ApplyOptions<Command.Options>({
    description: 'A basic slash command',
    preconditions: ["GuildOnly", "GuildTextOnly"]
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a timed message')
                        .addStringOption((option) => option.setName('message').setDescription('The message to send').setRequired(true))
                        .addChannelOption(option => option.setName("channel").setDescription("The channel to send the message to").setRequired(true))
                        //Hour like every 2 hours
                        .addIntegerOption(option => option.setName("hours").setDescription(`Every x hours`).setRequired(true))
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a timed message')
                )
                .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List all timed messages'))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.inCachedGuild()) await interaction.guild!.fetch();
        if (!interaction.inCachedGuild()) return;
        if (!interaction.member.permissions.has("Administrator")) return interaction.reply({
            content: "You do not have the required permissions to use this command.",
            ephemeral: true
        });
        const subcommand = interaction.options.getSubcommand(true);
        if (!subcommand) return interaction.reply({content: "No subcommand provided", ephemeral: true});
        if (subcommand === 'add') {
            await interaction.deferReply({ephemeral: true});
            const message = interaction.options.getString('message', true);
            const channel = interaction.options.getChannel('channel', true);
            const hours = interaction.options.getInteger('hours', true);
            if (!channel) return interaction.editReply({content: "No channel provided"});
            if (hours < 1) return interaction.editReply({content: "Hours must be greater than 0"});
            const dbGuild = await timedMessages.findOne({guildId: interaction.guildId}) || await timedMessages.create({guildId: interaction.guildId});
            console.log(typeof dbGuild);
            if (!dbGuild) return interaction.editReply({content: "No database found"});
            const newMessage = {
                channelId: channel.id,
                message: message,
                time: hours, // Convert hours to milliseconds
            };
            dbGuild.messages!.push(newMessage);
            await dbGuild.save();
            return interaction.editReply({content: "Message added"});
        } else if (subcommand === 'remove') {
            await interaction.deferReply({ephemeral: true});
            const dbGuild = await timedMessages.findOne({guildId: interaction.guildId}) || await timedMessages.create({guildId: interaction.guildId});
            console.log(typeof dbGuild);
            if (!dbGuild) return interaction.editReply({content: "No database found"});
            const messages = dbGuild.messages;
            if (!messages || messages.length === 0) return interaction.editReply({content: "No messages found"});
            const stringSelectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('remove-timed-message')
                    .setPlaceholder('Select a message to remove')
                    .addOptions(messages.map((message, index) => {
                        return {
                            label: `Message ${index + 1}`,
                            value: index.toString()
                        }
                    }))
            );
            return interaction.editReply({content: "Select a message to remove", components: [stringSelectMenu]});
        } else if (subcommand === 'list') {
            const dbGuild = await timedMessages.findOne({guildId: interaction.guildId}) || await timedMessages.create({guildId: interaction.guildId});
            console.log(typeof dbGuild);
            if (!dbGuild) return interaction.reply({content: "No database found", ephemeral: true})
            if (!dbGuild.messages || dbGuild.messages.length === 0) return interaction.reply({content: "No messages found", ephemeral: true});
            const messages = dbGuild.messages.map((message, index) => `Message ${index + 1}: ${message.message} - Every ${message.time} hours`);
            return interaction.reply({content: messages.join('\n'), ephemeral: true});
        }

    }
}
