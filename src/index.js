
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

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
const DEATH_COOLDOWN = 5 * 60 * 60 * 1000;

const DATA_DIR = path.join(__dirname, '..', 'data');
const SAVE_FILE = path.join(DATA_DIR, 'story-progress.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadProgress() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      return JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Could not load saved progress:', error);
  }

  return {};
}

const progress = loadProgress();

function saveProgress() {
  const tempFile = `${SAVE_FILE}.tmp`;

  fs.writeFileSync(tempFile, JSON.stringify(progress, null, 2));
  fs.renameSync(tempFile, SAVE_FILE);
}

function getPlayer(userId) {
  if (!progress[userId]) {
    progress[userId] = {
      completed: [],
      active: null,
      cooldowns: {}
    };
    saveProgress();
  }

  return progress[userId];
}

// All player-facing text and story content is in English.
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
    previous: null,
    scenes: {
      start: {
        text: 'Rain follows you to Grandma’s house. She opens the door before you knock. “You are late,” she whispers. “Your room is waiting.”',
        choices: [
          { label: 'Enter the house', to: 'hall' },
          { label: 'Ask how she knew you were coming', to: 'question' },
          { label: 'Leave immediately', to: 'road' }
        ]
      },
      hall: {
        text: 'Family photographs cover the hallway. In every photograph, someone stands behind you with their face scratched out. Grandma calls from the kitchen.',
        choices: [
          { label: 'Go to the kitchen', to: 'kitchen' },
          { label: 'Examine the photographs', to: 'photos' },
          { label: 'Go upstairs', to: 'upstairs' }
        ]
      },
      question: {
        text: 'Grandma smiles. “You called me yesterday.” Your phone has no record of the call. She reaches for your hand with freezing fingers.',
        choices: [
          { label: 'Pretend everything is normal', to: 'kitchen' },
          { label: 'Demand an explanation', to: 'bad_end' },
          { label: 'Run inside and lock the door', to: 'hall' }
        ]
      },
      road: {
        text: 'The road beyond the gate looks unfamiliar. Your phone shows a map with no roads at all. Through the rain, you see Grandma standing beside your car.',
        choices: [
          { label: 'Return to the house', to: 'hall' },
          { label: 'Walk into the woods', to: 'woods' },
          { label: 'Try to drive away', to: 'bad_end' }
        ]
      },
      photos: {
        text: 'Behind one photograph, you find a key and a note: “Do not let her see you awake after midnight.” The clock reads 11:47 PM.',
        choices: [
          { label: 'Take the key upstairs', to: 'upstairs' },
          { label: 'Show Grandma the note', to: 'bad_end' },
          { label: 'Hide in the pantry', to: 'pantry' }
        ]
      },
      kitchen: {
        text: 'Grandma has set the table for three. The third plate contains a photograph of you sleeping. She asks you to eat.',
        choices: [
          { label: 'Eat the food', to: 'bad_end' },
          { label: 'Ask about the third place', to: 'pantry' },
          { label: 'Pretend to eat, then escape', to: 'upstairs' }
        ]
      },
      upstairs: {
        text: 'Your bedroom door is locked. The key fits. Inside, a second version of you is sleeping beneath the covers. It opens its eyes.',
        choices: [
          { label: 'Wake the other you', to: 'bad_end' },
          { label: 'Search the desk for clues', to: 'clue' },
          { label: 'Back away quietly', to: 'pantry' }
        ]
      },
      pantry: {
        text: 'From inside the pantry, you hear Grandma talking to someone. “The next one will be easier,” she says. A small door leads beneath the house.',
        choices: [
          { label: 'Open the small door', to: 'tunnel' },
          { label: 'Wait until midnight', to: 'midnight' },
          { label: 'Leave the pantry', to: 'bad_end' }
        ]
      },
      woods: {
        text: 'The trees form a circle around the house. A path leads to a stone well. Something inside the well is repeating your name.',
        choices: [
          { label: 'Look into the well', to: 'bad_end' },
          { label: 'Follow the path back', to: 'hall' },
          { label: 'Climb over the stone wall', to: 'clue' }
        ]
      },
      clue: {
        text: 'The desk contains a diary. Every page describes the same weekend, ending with your disappearance. The final page says: “At midnight, the house forgets its guests.”',
        choices: [
          { label: 'Wait for midnight in the bedroom', to: 'midnight' },
          { label: 'Take the diary to the pantry', to: 'pantry' },
          { label: 'Burn the diary', to: 'bad_end' }
        ]
      },
      tunnel: {
        text: 'The tunnel leads beneath the house to a locked iron gate. Your key opens it. Beyond it, you see a road and the first light of dawn.',
        choices: [
          { label: 'Walk through the gate', to: 'win' },
          { label: 'Return to warn Grandma', to: 'bad_end' },
          { label: 'Wait for someone to arrive', to: 'bad_end' }
        ]
      },
      midnight: {
        text: 'The clock strikes twelve. The house goes silent. Grandma stands in the doorway, staring at you. “You were supposed to be asleep.”',
        choices: [
          { label: 'Use the key on the hidden door', to: 'tunnel' },
          { label: 'Tell her you know the truth', to: 'bad_end' },
          { label: 'Hide under the bed', to: 'bad_end' }
        ]
      },
      bad_end: {
        ending: 'death',
        text: 'The walls begin to breathe. Grandma embraces you, and the house closes around you. By morning, your photograph hangs in the hallway.'
      },
      win: {
        ending: 'win',
        text: 'You cross the gate as the sun rises. The house disappears behind the fog. In your pocket, the diary has one new sentence: “See you next weekend.”'
      }
    }
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
    previous: "Grandma's House",
    scenes: {
      start: {
        text: 'Grandpa leaves you alone in the cabin. Three knocks sound from the locked room. He told you never to open it.',
        choices: [
          { label: 'Inspect the locked room', to: 'room' },
          { label: 'Go to the attic', to: 'attic' },
          { label: 'Follow Grandpa outside', to: 'yard' }
        ]
      },
      room: {
        text: 'A voice behind the door says your name. The handle turns by itself. You notice a key hanging beside the fireplace.',
        choices: [
          { label: 'Use the key', to: 'inside' },
          { label: 'Call for Grandpa', to: 'bad_end' },
          { label: 'Take the key to the attic', to: 'attic' }
        ]
      },
      attic: {
        text: 'Dust covers the attic floor, except for fresh footprints leading to a mirror. Your reflection is standing still while you move.',
        choices: [
          { label: 'Cover the mirror', to: 'journal' },
          { label: 'Touch the reflection', to: 'bad_end' },
          { label: 'Search the boxes', to: 'journal' }
        ]
      },
      yard: {
        text: 'Grandpa stands at the tree line. A voice calls from the dark in his exact voice: “Come here.” The real Grandpa grabs your shoulder.',
        choices: [
          { label: 'Follow the real Grandpa inside', to: 'journal' },
          { label: 'Answer the voice', to: 'bad_end' },
          { label: 'Hide behind the shed', to: 'shed' }
        ]
      },
      inside: {
        text: 'The locked room contains dozens of clocks, all stopped at the same time. A journal lies open on a chair.',
        choices: [
          { label: 'Read the journal', to: 'journal' },
          { label: 'Break the clocks', to: 'bad_end' },
          { label: 'Leave the room and lock it', to: 'shed' }
        ]
      },
      journal: {
        text: 'The journal explains that the thing outside can imitate anyone, but it cannot cross a threshold unless invited. Grandpa has been guarding the cabin for years.',
        choices: [
          { label: 'Ask Grandpa for the cabin key', to: 'shed' },
          { label: 'Prepare the front door', to: 'final' },
          { label: 'Invite the voice inside', to: 'bad_end' }
        ]
      },
      shed: {
        text: 'Behind the shed, you find an old bell and a note: “Ring it at sunrise, never before.” The sky is beginning to lighten.',
        choices: [
          { label: 'Take the bell to the front door', to: 'final' },
          { label: 'Ring it immediately', to: 'bad_end' },
          { label: 'Return to the attic', to: 'attic' }
        ]
      },
      final: {
        text: 'The voice pounds on the door, now sounding like you. Grandpa nods toward the bell as the first ray of sunlight reaches the window.',
        choices: [
          { label: 'Ring the bell at sunrise', to: 'win' },
          { label: 'Open the door to check', to: 'bad_end' },
          { label: 'Hide and wait', to: 'bad_end' }
        ]
      },
      bad_end: {
        ending: 'death',
        text: 'The cabin grows unnaturally quiet. Something wearing a familiar face steps inside. Grandpa’s rules were the only thing keeping it out.'
      },
      win: {
        ending: 'win',
        text: 'The bell rings once. The voice outside fades into the forest. Grandpa locks the door and finally smiles. “Now you understand why we have rules.”'
      }
    }
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
    previous: 'Vacation with Grandpa',
    scenes: {
      start: {
        text: 'Your uncle stops the car beside a trail. The road behind you has vanished into thick fog. He insists the trail leads to safety.',
        choices: [
          { label: 'Follow the trail', to: 'trail' },
          { label: 'Inspect the car', to: 'car' },
          { label: 'Climb the nearest hill', to: 'hill' }
        ]
      },
      trail: {
        text: 'You pass a tree marked with three cuts. Minutes later, you pass the same tree again. Your uncle refuses to look at it.',
        choices: [
          { label: 'Mark the tree with a fourth cut', to: 'marks' },
          { label: 'Leave the trail', to: 'river' },
          { label: 'Accuse your uncle of lying', to: 'bad_end' }
        ]
      },
      car: {
        text: 'The car keys are missing. Under the seat you find a compass that points toward the ground.',
        choices: [
          { label: 'Keep the compass', to: 'river' },
          { label: 'Throw it away', to: 'bad_end' },
          { label: 'Search the trunk', to: 'marks' }
        ]
      },
      hill: {
        text: 'From the hill, you see a river, a ruined watchtower and a circle of trees. Your uncle is already waiting at the bottom.',
        choices: [
          { label: 'Head toward the river', to: 'river' },
          { label: 'Explore the watchtower', to: 'tower' },
          { label: 'Follow your uncle', to: 'bad_end' }
        ]
      },
      marks: {
        text: 'The fourth cut appears on the tree before you make it. Someone has been predicting your movements. A narrow animal path leads downhill.',
        choices: [
          { label: 'Follow the animal path', to: 'river' },
          { label: 'Stay beside the tree', to: 'bad_end' },
          { label: 'Go to the watchtower', to: 'tower' }
        ]
      },
      river: {
        text: 'The river flows uphill. Beside it, you find a backpack containing a map with a single safe route marked in red.',
        choices: [
          { label: 'Follow the red route', to: 'tower' },
          { label: 'Drink from the river', to: 'bad_end' },
          { label: 'Walk against the current', to: 'final' }
        ]
      },
      tower: {
        text: 'The watchtower contains a radio. A weak signal repeats: “Do not trust the person travelling with you.” Your uncle is approaching the stairs.',
        choices: [
          { label: 'Use the radio to call for help', to: 'final' },
          { label: 'Hide in the tower', to: 'bad_end' },
          { label: 'Escape through the back window', to: 'final' }
        ]
      },
      final: {
        text: 'The fog splits around a clearing. Your uncle appears at the far end, smiling without blinking. Beyond him is a real road.',
        choices: [
          { label: 'Run toward the road without looking back', to: 'win' },
          { label: 'Wait for your uncle', to: 'bad_end' },
          { label: 'Return to the forest', to: 'bad_end' }
        ]
      },
      bad_end: {
        ending: 'death',
        text: 'The forest closes around you. Your footsteps continue even after you stop walking. Somewhere nearby, your uncle calls your name.'
      },
      win: {
        ending: 'win',
        text: 'You reach the road and flag down a passing vehicle. When you look back, the clearing is gone. Your uncle’s name is missing from every family photograph.'
      }
    }
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
    previous: 'Lost in the Forest with Uncle',
    scenes: {
      start: {
        text: 'The receptionist gives you a key marked 707. The elevator buttons skip from six to eight. Your aunt says the stairs are forbidden.',
        choices: [
          { label: 'Take the stairs', to: 'stairs' },
          { label: 'Ask the receptionist about room 707', to: 'desk' },
          { label: 'Follow your aunt', to: 'room' }
        ]
      },
      stairs: {
        text: 'Between floors six and eight, you find a landing that should not exist. A door bears your name.',
        choices: [
          { label: 'Open the door', to: 'room' },
          { label: 'Continue upward', to: 'corridor' },
          { label: 'Go back downstairs', to: 'desk' }
        ]
      },
      desk: {
        text: 'The receptionist turns a guestbook toward you. Your name appears on every page, dating back more than a hundred years.',
        choices: [
          { label: 'Tear out the page', to: 'bad_end' },
          { label: 'Copy the room number beside your name', to: 'corridor' },
          { label: 'Demand to leave', to: 'stairs' }
        ]
      },
      room: {
        text: 'Room 707 is perfectly clean, but the mirror shows a ruined version of the room. Someone knocks from inside the mirror.',
        choices: [
          { label: 'Cover the mirror', to: 'closet' },
          { label: 'Answer the knock', to: 'bad_end' },
          { label: 'Search the bedside table', to: 'note' }
        ]
      },
      corridor: {
        text: 'The corridor stretches impossibly far. Every door has the same number. At the end, a service bell sits beneath a sign: “For guests who wish to depart.”',
        choices: [
          { label: 'Ring the service bell', to: 'note' },
          { label: 'Open a random door', to: 'bad_end' },
          { label: 'Return to room 707', to: 'room' }
        ]
      },
      closet: {
        text: 'Behind the mirror, the closet contains a uniform and a brass key. A note says the hotel must never receive its own key back.',
        choices: [
          { label: 'Take the brass key', to: 'note' },
          { label: 'Put on the uniform', to: 'bad_end' },
          { label: 'Leave the closet', to: 'corridor' }
        ]
      },
      note: {
        text: 'Your aunt’s handwriting appears on a note: “The front door is real only before dawn.” A clock shows 4:58 AM.',
        choices: [
          { label: 'Head to the lobby', to: 'final' },
          { label: 'Wake your aunt', to: 'bad_end' },
          { label: 'Wait until sunrise', to: 'final' }
        ]
      },
      final: {
        text: 'The lobby is empty. The front doors stand open, but your aunt is calling from the elevator. The clock approaches five.',
        choices: [
          { label: 'Walk through the front doors', to: 'win' },
          { label: 'Enter the elevator', to: 'bad_end' },
          { label: 'Go back for your luggage', to: 'bad_end' }
        ]
      },
      bad_end: {
        ending: 'death',
        text: 'The hotel adds another room to its impossible floor. The next guest will find your name in the guestbook.'
      },
      win: {
        ending: 'win',
        text: 'You step outside as dawn breaks. Behind you, the hotel sign reads “No Vacancy.” Your aunt is nowhere to be seen.'
      }
    }
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
    previous: 'Hotel with Aunt',
    scenes: {
      start: {
        text: 'The receptionist hands you a completed medical form. Your signature is already at the bottom. The doctor calls you from behind a locked door.',
        choices: [
          { label: 'Enter the doctor’s office', to: 'office' },
          { label: 'Inspect the medical form', to: 'form' },
          { label: 'Leave the clinic', to: 'hall' }
        ]
      },
      office: {
        text: 'The doctor asks whether you remember the previous visits. You have never met him before, but he shows you photographs of yourself in this room.',
        choices: [
          { label: 'Ask to see your medical file', to: 'records' },
          { label: 'Pretend to remember', to: 'test' },
          { label: 'Run into the hallway', to: 'hall' }
        ]
      },
      form: {
        text: 'The form lists three instructions: never accept an injection, never enter room 12, and never trust a doctor without a shadow.',
        choices: [
          { label: 'Look for the doctor’s shadow', to: 'office' },
          { label: 'Find room 12', to: 'room12' },
          { label: 'Search the reception desk', to: 'records' }
        ]
      },
      hall: {
        text: 'The hallway has no exit signs. A patient behind a closed door whispers that the doctor is testing how people respond to fear.',
        choices: [
          { label: 'Help the patient', to: 'room12' },
          { label: 'Find the emergency exit', to: 'records' },
          { label: 'Return to the doctor', to: 'office' }
        ]
      },
      records: {
        text: 'The file contains years of notes describing your dreams. The last page is dated tomorrow. It mentions a key hidden in the examination room.',
        choices: [
          { label: 'Find the examination room', to: 'test' },
          { label: 'Take the file and escape', to: 'final' },
          { label: 'Show the file to the doctor', to: 'bad_end' }
        ]
      },
      test: {
        text: 'A tray holds an empty syringe and a brass key. The doctor watches through a one-way window. A warning is scratched into the glass.',
        choices: [
          { label: 'Take the key', to: 'room12' },
          { label: 'Accept the injection', to: 'bad_end' },
          { label: 'Break the window', to: 'bad_end' }
        ]
      },
      room12: {
        text: 'Room 12 contains a patient who looks exactly like you. They beg you to turn off the machine beside the bed.',
        choices: [
          { label: 'Turn off the machine', to: 'final' },
          { label: 'Ask the patient what happened', to: 'records' },
          { label: 'Release the patient immediately', to: 'bad_end' }
        ]
      },
      final: {
        text: 'The alarm begins to ring. The doctor blocks the hallway, but his reflection is missing. Behind him, the emergency exit unlocks.',
        choices: [
          { label: 'Escape through the emergency exit', to: 'win' },
          { label: 'Confront the doctor', to: 'bad_end' },
          { label: 'Return to the examination room', to: 'bad_end' }
        ]
      },
      bad_end: {
        ending: 'death',
        text: 'The lights go out. When they return, a new file sits on the doctor’s desk. Your name is printed on its cover.'
      },
      win: {
        ending: 'win',
        text: 'You escape into the morning sunlight. The clinic vanishes when you turn around. In your hand, the medical file now reads: “Case closed.”'
      }
    }
  }
];

function getStory(storyId) {
  return STORIES.find(story => story.id === storyId);
}

function isUnlocked(player, storyIndex) {
  if (storyIndex === 0) return true;

  const previousStory = STORIES[storyIndex - 1];
  return player.completed.includes(previousStory.id);
}

function createStoryEmbed(story) {
  const embed = new EmbedBuilder()
    .setColor(0xF28C28)
    .setTitle(story.title)
    .setDescription(`**Lore**\n\n${story.lore}`)
    .setImage(story.image)
    .setFooter({ text: `STORY_TELLER_PANEL:${story.id}` });

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

function createChoiceRows(userId, story, sceneId, scene) {
  const buttons = scene.choices.map((choice, index) =>
    new ButtonBuilder()
      .setCustomId(
        `game:choose:${userId}:${story.id}:${sceneId}:${index}`
      )
      .setLabel(choice.label)
      .setStyle(ButtonStyle.Secondary)
  );

  const rows = [];

  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
    );
  }

  return rows;
}

function createSceneEmbed(story, scene) {
  return new EmbedBuilder()
    .setColor(0xF28C28)
    .setTitle(story.title)
    .setDescription(scene.text)
    .setFooter({ text: 'Choose carefully. Your decisions have consequences.' });
}

async function showScene(interaction, userId, story) {
  const player = getPlayer(userId);
  const active = player.active;

  if (!active || active.storyId !== story.id) {
    return interaction.editReply({
      content: 'You do not have an active session for this story.',
      embeds: [],
      components: []
    });
  }

  const scene = story.scenes[active.sceneId];

  if (!scene) {
    return interaction.editReply({
      content: 'This scene could not be found. Your progress has been preserved.',
      embeds: [],
      components: []
    });
  }

  if (scene.ending) {
    if (scene.ending === 'death') {
      player.active = null;
      player.cooldowns[story.id] = Date.now() + DEATH_COOLDOWN;
      saveProgress();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xB91C1C)
            .setTitle(`${story.title} — Game Over`)
            .setDescription(
              `${scene.text}\n\n` +
              '**You died.** You can try this story again in five hours.'
            )
        ],
        components: []
      });
    }

    if (scene.ending === 'win') {
      if (!player.completed.includes(story.id)) {
        player.completed.push(story.id);
      }

      player.active = null;
      delete player.cooldowns[story.id];
      saveProgress();

      const nextIndex = STORIES.findIndex(item => item.id === story.id) + 1;
      const nextStory = STORIES[nextIndex];

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x248046)
            .setTitle(`${story.title} — Story Completed`)
            .setDescription(
              `${scene.text}\n\n` +
              (nextStory
                ? `**Unlocked:** ${nextStory.title}`
                : '**Congratulations! You have completed all available stories.**')
            )
        ],
        components: []
      });
    }
  }

  return interaction.editReply({
    content: '',
    embeds: [createSceneEmbed(story, scene)],
    components: createChoiceRows(userId, story, active.sceneId, scene)
  });
}

async function startStory(interaction, story) {
  const userId = interaction.user.id;
  const player = getPlayer(userId);
  const storyIndex = STORIES.findIndex(item => item.id === story.id);

  if (!isUnlocked(player, storyIndex)) {
    return interaction.update({
      content:
        `**${story.title}** is locked.\n\n` +
        `Complete **${story.previous}** first.`,
      embeds: [],
      components: []
    });
  }

  const cooldownUntil = player.cooldowns[story.id] || 0;

  if (cooldownUntil > Date.now()) {
    const minutes = Math.ceil((cooldownUntil - Date.now()) / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return interaction.update({
      content:
        `You cannot retry **${story.title}** yet.\n\n` +
        `Time remaining: **${hours}h ${remainingMinutes}m**.`,
      embeds: [],
      components: []
    });
  }

  player.active = {
    storyId: story.id,
    sceneId: 'start'
  };
  saveProgress();

  await interaction.update({
    content: 'Your story is starting...',
    embeds: [],
    components: []
  });

  return showScene(interaction, userId, story);
}

async function publishStoryPanels() {
  const channel = await client.channels.fetch(STORY_CHANNEL_ID);

  if (!channel || !channel.isTextBased() || !channel.messages) {
    throw new Error('The configured story channel is missing or is not a text channel.');
  }

  for (let i = 0; i < STORIES.length; i++) {
    const story = STORIES[i];
    const recentMessages = await channel.messages.fetch({ limit: 100 });
    const marker = `STORY_TELLER_PANEL:${story.id}`;

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
      console.log('Waiting 10 minutes before the next story panel.');
      await new Promise(resolve => setTimeout(resolve, PANEL_DELAY));
    }
  }

  console.log('All story panels have been published or updated.');
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Story Teller is online as ${readyClient.user.tag}`);

  try {
    await publishStoryPanels();
  } catch (error) {
    console.error('Could not publish story panels:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isButton()) return;

    // Play Story opens a private content warning first.
    if (interaction.customId.startsWith('story:play:')) {
      const storyId = interaction.customId.split(':')[2];
      const story = getStory(storyId);

      if (!story) {
        return interaction.reply({
          content: 'This story could not be found.',
          ephemeral: true
        });
      }

      const player = getPlayer(interaction.user.id);
      const storyIndex = STORIES.findIndex(item => item.id === story.id);

      if (!isUnlocked(player, storyIndex)) {
        return interaction.reply({
          content: `This story is locked. Complete **${story.previous}** first.`,
          ephemeral: true
        });
      }

      const warningRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`story:confirm:${interaction.user.id}:${story.id}`)
          .setLabel('I Understand, Continue')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`story:cancel:${interaction.user.id}:${story.id}`)
          .setLabel('Cancel, Go Back')
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content:
          `**CONTENT WARNING — ${story.title}**\n\n` +
          'This story contains graphic scenes, disturbing content, and strong language. ' +
          'Some choices may lead to death and require you to wait five hours before trying again.\n\n' +
          '**Do you want to continue?**',
        components: [warningRow],
        ephemeral: true
      });
    }

    // Only the player who opened the warning can use its buttons.
    if (
      interaction.customId.startsWith('story:confirm:') ||
      interaction.customId.startsWith('story:cancel:')
    ) {
      const parts = interaction.customId.split(':');
      const action = parts[1];
      const ownerId = parts[2];
      const storyId = parts[3];

      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: 'This warning belongs to another player.',
          ephemeral: true
        });
      }

      if (action === 'cancel') {
        return interaction.update({
          content: 'Story cancelled. You can return whenever you are ready.',
          components: [],
          embeds: []
        });
      }

      const story = getStory(storyId);

      if (!story) {
        return interaction.update({
          content: 'This story could not be found.',
          components: [],
          embeds: []
        });
      }

      return startStory(interaction, story);
    }

    // Private gameplay choices.
    if (interaction.customId.startsWith('game:choose:')) {
      const parts = interaction.customId.split(':');
      const ownerId = parts[2];
      const storyId = parts[3];
      const sceneId = parts[4];
      const choiceIndex = Number(parts[5]);

      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: 'These choices belong to another player.',
          ephemeral: true
        });
      }

      const story = getStory(storyId);
      const player = getPlayer(ownerId);

      if (!story || !player.active ||
          player.active.storyId !== storyId ||
          player.active.sceneId !== sceneId) {
        return interaction.reply({
          content: 'This choice is no longer available. Start or continue your story again.',
          ephemeral: true
        });
      }

      const scene = story.scenes[sceneId];
      const choice = scene?.choices?.[choiceIndex];

      if (!choice) {
        return interaction.reply({
          content: 'This choice could not be found.',
          ephemeral: true
        });
      }

      player.active.sceneId = choice.to;
      saveProgress();

      await interaction.deferUpdate();
      return showScene(interaction, ownerId, story);
    }
  } catch (error) {
    console.error('Interaction error:', error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Something went wrong. Please try again.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
