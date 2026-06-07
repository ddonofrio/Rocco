export const VERBS = ['look', 'use', 'talk', 'take'] as const;

export type Verb = (typeof VERBS)[number];

export function isVerb(candidate: string): candidate is Verb {
  return VERBS.includes(candidate as Verb);
}

export function executeVerb(verb: Verb, target: string): string {
  const normalizedTarget = target.trim() || 'nothing in particular';

  switch (verb) {
    case 'look':
      return `You look at ${normalizedTarget}. There are secrets in every pixel.`;
    case 'use':
      return `You try to use ${normalizedTarget}. There is no script for that yet.`;
    case 'talk':
      return `You talk to ${normalizedTarget}. Roco nods in silence.`;
    case 'take':
      return `You try to take ${normalizedTarget}. It seems fixed to the scene.`;
    default:
      return `Unknown verb: ${verb}`;
  }
}
