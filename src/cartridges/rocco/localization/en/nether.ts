import type { RoccoTextCatalog } from '../types';

export const englishNetherText: RoccoTextCatalog['nether'] = {
  arrivalThoughtLine: 'What is this place?',
  securityCameraBribe: {
    thanksLine: 'Thanks!',
    securityLine: 'Security!',
    roccoReactionLine: 'Seriously?',
  },
  intercom: {
    lookLines: [
      'It is an industrial intercom.',
      'A round speaker sits behind a gray-green metal plate full of holes.',
      'It has a talk button and looks like it has been here forever.',
      'It looks like part of the building security system.',
    ],
    firstChoices: {
      helloAnyoneThere: 'Hello, is anybody there?',
      helloImRocco: "Hello, I'm Rocco.",
      turnOffCamera: 'Can you turn the camera off?',
      whereAmI: 'Where am I?',
    },
    firstReplyLine: 'Keep this channel clear. We are in the middle of an emergency.',
    secondChoices: {
      whatHappened: 'What happened?',
      iDoNotKnowHowIGotHere: "Listen, I don't know how I got here.",
      whatEmergency: 'What emergency?',
      helpMeGetOut: 'Help me get out of here.',
    },
    secondReplyLines: [
      "Are you blind? I can see you're speaking from ring 0...",
      "Can't you see what's happening?",
      'The graphics engine is about to explode!',
      "And we can't reset the console because...",
      'The main character of the game has escaped.',
    ],
    secondReplyThoughtLines: ['Wait... is that me?', 'Am I a video game character?'],
    thirdChoices: {
      whatIfNotFound: "Hey... what happens if you don't find him?",
      howToResetConsole: 'How do you reset the console?',
      whereIsAnExit: 'Where is an exit?',
      labCoatQuestion: 'Did you know about the lab coat in the cabinet?',
      niceVoice: 'Nice voice.',
    },
    thirdReplyLines: [
      "If he doesn't turn up and we reset the console...",
      "there's no telling what will happen, but nothing good.",
      'Return to your workstation immediately!',
    ],
    finalChoice: 'Hello?',
    securityAlertLine: 'Security!',
  },
  timbre: {
    lookLines: ['It is a golden doorbell.'],
  },
  officeArrival: {
    caughtLine: 'Police! I found Rocco!',
    welcomeLine: 'I have been waiting for you! Come in.',
    dialogue: {
      firstChoices: [
        { label: 'Hello sir, I am Rocco.', reply: 'Hello sir...' },
        { label: 'Hello, could you tell me how to get out of here?', reply: 'Hello, could you...' },
        { label: 'Your coat is much cleaner than mine.', reply: 'Your coat...' },
        { label: 'You remind me of someone.', reply: 'You remind me...' },
      ],
      firstGuyspriteLines: [
        "I know, you are Rulo, the owner's nephew. I imagined you younger.",
        'My name is Guysprite, Guysprite Treepgood. I am responsible for resetting the game.',
        'Your uncle played a joke on me. He told me you would not arrive until next week.',
      ],
      secondChoices: [
        { label: 'There must be a mistake, I am Rocco.', reply: 'There must be...' },
        { label: 'That is right, he sent me early after all.', reply: 'That is right...' },
        { label: 'How do you reset the console? What is that about?', reply: 'How do you...' },
      ],
      secondGuyspriteLines: [
        'With everything going on, you would not believe it. Everyone is mad.',
        'Rocco, the main character of the game, found a glitch...',
        '...and escaped the game. Now he is wandering around the console...',
        '...and nobody knows where he is...',
        'Have you seen him?',
      ],
      thirdChoices: [
        { label: 'Er... but I am him!', reply: 'Er... but...' },
        { label: 'No, I have not seen him.', reply: 'No, I have...' },
        { label: 'Do you ever let anyone speak?', reply: 'Do you ever...' },
        { label: 'The worst part is that there are people like that.', reply: 'The worst...' },
      ],
      finalGuyspriteLines: [
        'When I spoke to your uncle and he told me you were coming as an intern...',
        '...I was over the moon. We need two people here and they have...',
        '...left me alone since they built all this...',
        '...but you should have seen it before. I built this little kitchen myself. Would you like a coffee?',
      ],
      systemBeepsLine: '[Machine beeps] Beep beep beep beep beep beep...',
      postCoffeeGuyspriteLines: [
        'Oh, it looks like the system has been restored...',
        '...you are perfect timing, let us leave that coffee for later...',
        'Come on, let us go to the other side of the room.',
      ],
      departureReminderLines: [
        'Come on, after you. Let us sit at the controls.',
        'I am right behind you, let us go!',
        'Wait... you... you are Rocco! SECURITY!',
      ],
      guyspriteTalkLine: 'Hurry up!',
      guyspriteLookLines: [
        'He is as talkative as he is nervous.',
        'He talks as much as he trembles.',
        'It looks like the words come out before the thoughts.',
        'He does not stop talking, not even when he breathes.',
        'He is more nervous than a coffee maker about to explode.',
      ],
    },
  },
  doorHandle: {
    lookLines: ['It looks like a mechanism to open the door from the outside.'],
  },
  ascendingPipes: {
    lookLines: [
      'These pipes run from the floor to the ceiling.',
      'This place is packed with them.',
      'They are gray metal and look sturdy.',
      'This one has a wheel valve in the middle.',
    ],
  },
  wheelValve: {
    lookLines: [
      'It is the usual wheel with five metal spokes.',
      'A big, heavy valve wheel.',
      'The spokes are a bit rusty but still firm.',
    ],
    grabLines: ["No way I'm touching anything here, this is about to blow."],
  },
};
