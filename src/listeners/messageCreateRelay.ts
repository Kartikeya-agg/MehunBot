import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {Message} from "discord.js";
import {relay} from "../mongo";

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate
})
export class UserEvent extends Listener {
    public override async run(message: Message) {
        if (message.author.bot) return;
		if (!message.inGuild()) return;
        const db = await relay.findOne({guildId: message.guildId});
        if (!db || !db.relay) return;
        const relayed = db.relay.find(r => r.source === message.channel.id);
        if (!relayed) return;
        const destination = message.guild?.channels.cache.get(relayed.destination) || await message.guild?.channels.fetch(relayed.destination);
        if (!destination) return;
        if (message.content && destination.isTextBased()) {
            return destination.send({content: message.content, files: message.attachments.map(a => a.url)});
        } else if (!message.content && destination.isTextBased()) {
            return destination.send({files: message.attachments.map(a => a.url)});
        }


        return;

    }
}
