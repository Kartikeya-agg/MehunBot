import { ApplyOptions } from '@sapphire/decorators';
import { Command as Sapp } from '@sapphire/framework';
import { Pagination } from 'pagination.djs';
const commands: Command[] = [
    // Moderation
    {
        category: 'Moderation',
        name: 'blacklist',
        description: 'Disallow a user from using any of the bot’s commands'
    },
    {
        category: 'Moderation',
        name: 'ban',
        description: 'Ban a member from the server'
    },
    {
        category: 'Moderation',
        name: 'kick',
        description: 'Kick a member from the server'
    },
    {
        category: 'Moderation',
        name: 'mute',
        description: 'Temporarily mute a member in all text channels'
    },
    {
        category: 'Moderation',
        name: 'unmute',
        description: 'Remove a previously applied mute from a member'
    },

    // Giveaway
    {
        category: 'Giveaway',
        name: 'start-giveaway',
        description: 'Create and start a new giveaway'
    },
    {
        category: 'Giveaway',
        name: 'end-giveaway',
        description: 'Force-end an active giveaway early'
    },
    {
        category: 'Giveaway',
        name: 'reroll-giveaway',
        description: 'Pick new winner(s) for a finished giveaway'
    },
    {
        category: 'Giveaway',
        name: 'drop-giveaway',
        description: 'Hold a first-to-react “drop” giveaway'
    },
    {
        category: 'Giveaway',
        name: 'pause-giveaway',
        description: 'Pause an on-going giveaway'
    },
    {
        category: 'Giveaway',
        name: 'unpause-giveaway',
        description: 'Resume a previously paused giveaway'
    },

    // Admin
    {
        category: 'Admin',
        name: 'rolesetup',
        description: 'Interactive setup for server permission roles'
    },
    {
        category: 'Admin',
        name: 'ticket-setup',
        description: 'Configure the support ticket system'
    },
    {
        category: 'Admin',
        name: 'settings',
        description: 'Edit log, welcome and football channels or mod roles'
    },
    {
        category: 'Admin',
        name: 'relaychannel',
        description: 'Relay messages between channels'
    },
    {
        category: 'Admin',
        name: 'stickymessage',
        description: 'Create, remove or list repeating sticky messages'
    },
    {
        category: 'Admin',
        name: 'timed-message',
        description: 'Schedule automatic messages every X hours'
    },
    {
        category: 'Admin',
        name: 'welcome',
        description: 'Set the custom welcome message template'
    },
    {
        category: 'Admin',
        name: 'bot-kick',
        description: 'Make the bot leave a specified server (owner only)'
    },

    // Xbox
    {
        category: 'Xbox',
        name: 'profile',
        description: 'Display an Xbox Live user’s profile information'
    },
    {
        category: 'Xbox',
        name: 'xbox-channel',
        description: 'Choose the channel where Xbox notifications are sent'
    },
    {
        category: 'Xbox',
        name: 'xbox-games',
        description: 'Add or remove games to filter Xbox notifications'
    },
    {
        category: 'Xbox',
        name: 'claim',
        description: 'Claim an Xbox account to your Discord identity'
    },
    {
        category: 'Xbox',
        name: 'remove-claim',
        description: 'Remove an existing claim on an Xbox account'
    },

    // Misc.
    {
        category: 'Misc.',
        name: 'custom-messages',
        description: 'Set the bot’s custom response messages'
    },
    {
        category: 'Misc.',
        name: 'embed',
        description: 'Quickly build and send rich embed messages'
    },
    {
        category: 'Misc.',
        name: 'emote',
        description: 'Steal and save an emote from another server'
    },
    {
        category: 'Misc.',
        name: 'ping',
        description: 'Check the bot’s current latency'
    },
    {
        category: 'Misc.',
        name: 'poll',
        description: 'Create a yes/no or multiple-choice poll'
    },
    {
        category: 'Misc.',
        name: 'help',
        description: 'Display this interactive help menu'
    }
];
@ApplyOptions<Sapp.Options>({
	description: 'A basic slash command'
})
export class UserCommand extends Sapp {
	public override registerApplicationCommands(registry: Sapp.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: Sapp.ChatInputCommandInteraction) {
		const result = commands.reduce((acc: Record<string, Command[]>, command: Command) => {
			if (!acc[command.category]) {
				acc[command.category] = [];
			}
			acc[command.category].push(command);
			return acc;
		}, {});

		const output = Object.entries(result).map(([category, commands]) => {
			const value = commands
				.slice(0, 5)
				.map((command) => `${command.name}: ${command.description}`)
				.join('\n');
			return { name: category, value };
		});
		const pagination = new Pagination(interaction).setTitle('Help').setFields(output).paginateFields(true);

		return pagination.render();

		// return interaction.reply({ content: 'Hello world!' });
	}
}

interface Command {
	category: string;
	name: string;
	description: string;
}
