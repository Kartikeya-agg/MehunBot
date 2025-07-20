export default {
	noUserProvided: 'No user provided.',
	noSubcommand: 'No subcommand provided.',
	noUser: 'No user provided.',
	userAlreadyBlacklisted: 'User is already blacklisted.',
	userNotBlacklisted: 'User is not blacklisted.',
	userAddedToBlacklist: 'User added to blacklist.',
	userRemovedFromBlacklist: 'User removed from blacklist.',
	noBlacklistedUsers: 'No blacklisted users.',
	blacklistedUsersEmbed: {
		title: 'Blacklisted Users',
		description: 'Here are all the blacklisted users.',
		color: 'Red'
	},
	mentionRoles: 'Mention the roles which can view tickets.',
	ticketEmbed: {
		title: 'Ticket',
		description: 'Click on the button 🎫 to create a ticket.',
		color: 'Blue'
	},
	ticketButton: {
		label: 'Create Ticket',
		emoji: '🎫'
	},
	ticketCreated: 'Ticket created {channel}.',
	ticketDeleted: 'Ticket deleted.',
	ticketNotSetup: 'Ticket system not setup.',
	ticketAlreadyOpen: 'Ticket is already open.',
	ticketError: 'An error occurred while creating the ticket.',
	ticketWelcomeEmbed: {
		title: 'Welcome to your ticket!',
		description: 'Please describe your issue and we will get back to you as soon as possible.',
		color: 'Blue',
		button: 'Close Ticket',
		//Cross
		emoji: '❌'
	},
	ticketNotFound: 'Ticket not found.',
	ticketCloseEmbed: {
		title: 'Do you want to close the ticket?',
		description: 'Click on the button to close the ticket.'
	},
	closeMessage: `Closing ticket in 5 seconds.`,
	ticketLogEmbed: {
		title: 'Ticket for {user}',
		description: 'Here is the ticket log. {link}',
		color: 'Blue'
	},
	ticketCloseCancelled: 'Ticket close cancelled.',

	//GIVEAWAY

	lastChance: `⚠️ **LAST CHANCE TO ENTER !** ⚠️`,
	color: '#FF0000',
	invalidChannel: 'Invalid channel.',
	giveaway: (false ? '@everyone\n\n' : '') + '🎉🎉 **GIVEAWAY** 🎉🎉',
	giveawayEnded: (false ? '@everyone\n\n' : '') + '🎉🎉 **GIVEAWAY ENDED** 🎉🎉',
	title: '{this.prize}',
	inviteToParticipate: 'React with 🎉 to participate!',
	winMessage: 'Congratulations, {winners}! You won **{this.prize}**!',
	drawing: 'Drawing: {timestamp}',
	dropMessage: 'Be the first to react with 🎉 !',
	embedFooter: '{this.winnerCount} winner(s)',
	noWinner: 'Giveaway cancelled, no valid participations.',
	winners: 'Winner(s):',
	endedAt: 'Ended at',
	hostedBy: 'Hosted by: {this.hostedBy}',
	giveawayStarted: 'Giveaway started!',
	giveawayNotFound: 'Giveaway not found.',
	giveawayAlreadyEnded: 'Giveaway already ended.',
	giveawayAlreadyPaused: 'Giveaway already paused.',
	giveawayPaused: 'Giveaway paused.',
	giveawayNotPaused: 'Giveaway is not paused.',
	giveawayUnpaused: 'Giveaway unpaused.',
	giveawayNotEnded: 'The giveaway is not ended yet.',
	giveawayRerolled: 'Giveaway rerolled!',

	//Moderation
	invalidDuration: 'Invalid duration.',
	guildOnly: 'This command can only be used in a guild.',
	banSuccess: 'Successfully banned {user} ({user.id})',
	kickSuccess: 'Successfully kicked {user} ({user.id})',
	userNotFound: 'User not found.',
	userNotMuted: 'User is not muted.',
	dbError: 'An error occurred while fetching data from the database.',
	mutedRoleNotSet: 'Muted role not setup.',
	userUnmuted: 'User unmuted.',
	noPermission: 'You do not have permission to use this command.',

	//Role Menu
	roleEmbed: {
		title: 'Role Menu',
		description: 'Click on the button to get the role.',
		color: 'Blue'
	},

	//Welcome Message
	welcomeMessage: 'Welcome {user} to {guild}! You are the {memberCount}th member. Invited by {inviter}.',
	welcomeMessagewithoutinviter: 'Welcome {user} to {guild}! You are the {memberCount}th member.'
};
