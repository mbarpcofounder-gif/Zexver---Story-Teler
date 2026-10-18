
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const STORY_CHANNEL_ID = '1561460412371701790';
const PANEL_DELAY = 10 * 60 * 1000;

const STORIES = [
  {
    id: 'grandmas-house',
    title: "Grandma's House",
    lore: [
      'Years have passed since your last visit to your grandmother.',
      'When she invites you to spend a weekend at her old house, you expect a quiet family visit.',
      'But the moment you arrive, something feels wrong. The rooms seem unfamiliar, old photographs show faces you cannot recognize, and your grandmother remembers things you have never told her.',
      'She insists that everything is exactly as it should be.',
      'Perhaps you should believe her. After all, she is family.'
    ].join('\n\n'),
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=85',
    previous: null
  },
  {
    id: 'vacation-with-grandpa',
    title: 'Vacation with Grandpa',
    lore: [
      'Your grandfather has invited you to spend a week at his remote cabin, far away from the noise of the city.',
      'Before sunset, he gives you a list of rules. Never enter the locked room. Never answer a voice calling from outside after dark. And no matter what you hear in the attic, never tell him about it.',
      'You laugh at first.',
      'Grandpa does not.'
    ].join('\n\n'),
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=85',
    previous: "Grandma's House"
  },
  {
    id: 'lost-in-the-forest',
    title: 'Lost in the Forest with Uncle',
    lore: [
      'What was supposed to be a peaceful family trip becomes a nightmare when your uncle takes a shortcut through an unfamiliar forest.',
      'After an hour, the road disappears. After two, your phone loses its signal. Then you notice the same broken tree for the third time.',
      'Your uncle claims the forest is playing tricks on you, but you catch him checking a map with trembling hands.',
      'He knows where you are. He simply does not want you to know.'
    ].join('\n\n'),
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85',
    previous: 'Vacation with Grandpa'
  },
  {
    id: 'hotel-with-aunt',
    title: 'Hotel with Aunt',
    lore: [
      'Your aunt has booked a weekend at a luxurious old hotel that has stood beside the highway for over a century.',
      'The staff greet her by name, even though she claims this is her first visit. Your room is on the seventh floor, but the elevator has no seventh-floor button.',
      'At night, someone knocks on your door and whispers your name.',
      'When you ask your aunt about it the next morning, she tells you that you must have been dreaming. Then she quietly asks whether you opened the door.'
    ].join('\n\n'),
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
    previous: 'Lost in the Forest with Uncle'
  },
  {
    id: 'visit-to-the-doctor',
    title: 'A Visit to the Doctor',
    lore: [
      'Your parents insist that you visit a new doctor after you begin experiencing strange dreams.',
      'The clinic looks ordinary at first, although the waiting room is completely empty. The receptionist already knows your name and hands you a form containing answers to questions you have not been asked yet.',
      'Behind a closed door, a patient begs to be released.',
      'The doctor finally calls you in and smiles as if you have met many times before.',
      '"Excellent," he says, checking a file. "You are finally ready for the next stage."'
    ].join('\n\n'),
    image: 'https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?auto=format&fit=crop&w=1200&q=85&sat=-100&exp=-45',
    previous: 'Hotel with Aunt'
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createStoryEmbed(story) {
  const embed = new EmbedBuilder()
    .setColor(0xF28C28)
    .setTitle(story.title)
    .setDescription(`**Lore**\n\n${story.lore}`)
    .setImage(story.image)
    .setFooter({
      text: `STORY_TELLER_PANEL:${story.id}`
    });

  if (story.previous) {
    embed.addFields({
      name: 'Unlock Requirement',
      value: `Complete **${story.previous}** to unlock this story.`
    });
  } else {
    embed.addFields({
      name: 'Story Status',
      value: 'The first story in your journey.'
    });
  }

  return embed;
}

function createStoryButton(story) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`story:play:${story.id}`)
      .setLabel('Play Story')
      .setStyle(ButtonStyle.Primary)
  );
}

async function publishStoryPanels() {
  const channel = await client.channels.fetch(STORY_CHANNEL_ID);

  if (!channel || !channel.isTextBased() || !channel.messages) {
    throw new Error(
      'The configured story channel is missing or is not a text channel.'
    );
  }

  for (let i = 0; i < STORIES.length; i++) {
    const story = STORIES[i];
    const marker = `STORY_TELLER_PANEL:${story.id}`;

    // Fetch messages again so previously sent panels are detected.
    const recentMessages = await channel.messages.fetch({ limit: 100 });

    const existingMessage = recentMessages.find(message =>
      message.author.id === client.user.id &&
      message.embeds.some(embed => embed.footer?.text === marker)
    );

    const payload = {
      embeds: [createStoryEmbed(story)],
      components: [createStoryButton(story)]
    };

    if (existingMessage) {
      await existingMessage.edit(payload);
      console.log(`Updated story panel: ${story.title}`);
    } else {
      await channel.send(payload);
      console.log(`Published story panel: ${story.title}`);
    }

    if (i < STORIES.length - 1) {
      console.log(
        `Waiting 10 minutes before the next panel (${i + 2}/${STORIES.length}).`
      );
      await sleep(PANEL_DELAY);
    }
  }

  console.log('All story panels have been published or updated.');
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Story Teller is online as ${readyClient.user.tag}`);

  try {
    await publishStoryPanels();
  } catch (error) {
    console.error('Could not publish the story panels:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('story:play:')) return;

  const storyId = interaction.customId.split(':')[2];
  const storyIndex = STORIES.findIndex(story => story.id === storyId);

  if (storyIndex === -1) {
    return interaction.reply({
      content: 'This story could not be found.',
      ephemeral: true
    });
  }

  const story = STORIES[storyIndex];

  if (storyIndex > 0) {
    return interaction.reply({
      content:
        `**${story.title}** is currently locked.\n\n` +
        `Complete **${story.previous}** first. ` +
        'Individual story unlocks and saved progress will be implemented with the gameplay system.',
      ephemeral: true
    });
  }

  return interaction.reply({
    content:
      "**Grandma's House** is ready to be connected to its branching gameplay.\n\n" +
      'The story scenes, choices and save system are the next development step.',
    ephemeral: true
  });
});

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
