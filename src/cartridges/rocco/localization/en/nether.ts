import type { RoccoTextCatalog } from '../types';

export const englishNetherText: RoccoTextCatalog['nether'] = {
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
    secondReplyThoughtLines: [
      'Wait... is that me?',
      'Am I a video game character?',
    ],
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
};
