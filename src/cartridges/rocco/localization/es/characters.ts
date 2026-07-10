import type { RoccoTextCatalog } from '../types';
import { spanishStanRootChoices } from './stan';

export const spanishRoccoText: RoccoTextCatalog['rocco'] = {
  introThoughtLine: 'Aquí está lo suficientemente hondo...',
  introHelpLine: 'Tal vez tú me puedas ayudar.',
  selfTalkLines: [
    'Es raro hablar conmigo mismo.',
    'Nadie me está mirando y, aun así, me siento visto.',
    'Respira, Rocco. Peores ideas han tenido secuela.',
    'No estoy bien, pero estoy hablando. Es algo.',
    'Soy Rocco.',
  ],
};

export const spanishPelikanText: RoccoTextCatalog['pelikan'] = {
  lookLines: [
    'Se planta como un sacerdote del mal tiempo.',
    'Ese pico podría partir un secreto en dos.',
    'Me mira como si supiera por qué he venido.',
    'El pájaro es feo de una forma que ha sobrevivido a todo.',
  ],
  kickLines: [
    'No. No voy a empezar una pelea que en secreto quiero perder.',
    'Si me acerco, me hará daño de una forma muy literal.',
    'Esa cosa es más vieja que mi valentía.',
    'No. Incluso la desesperación tiene estándares.',
  ],
  grabLines: [
    'Nada de tocar al pájaro. Ya tengo bastantes malos finales en cola.',
    'Tocarlo suena a elegir dolor sin motivo.',
    'Necesito estos dedos para lo que venga después de este minuto.',
    'Prefiero mis manos pegadas y mis arrepentimientos abstractos.',
  ],
  talkLines: [
    'Tienes pinta de no haberte disculpado jamás con nadie.',
    'No estoy delicioso. Solo cansado.',
    'Si sabes una razón para darme la vuelta, ahora es el momento.',
    'Vengo en son de paz y con muy poca esperanza.',
  ],
};

export const spanishStanText: RoccoTextCatalog['stan'] = {
  lookLines: [
    'Un viejo dormido en una silla, a plena luz del día.',
    'Duerme con la seguridad de alguien que nunca se ha roto en público.',
    'Está profundamente dormido. Le envidio la constancia.',
    'Ese hombre parece más del muelle que la madera misma.',
  ],
  grabLines: [
    'Parece más grande que yo.',
    'Si lo toco, me va a hacer daño.',
    'No. No voy a despertar a un señor que puede aplastarme.',
    'Tiene ventaja de tamaño y, de alguna forma, también de edad.',
  ],
  kickLines: [
    'Parece más grande que yo.',
    'Si lo despierto así, me va a hacer daño.',
    'Ni hablar. Así es como acabo en el mar.',
    'Prefiero que mi miedo siga siendo teórico.',
  ],
  doorWakeThoughtLines: [
    'Qué raro, me pareció escuchar la puerta de la tienda.',
    'Extraño... juraría que oí la puerta de la tienda.',
    '¿Esa era la puerta de la tienda? Qué raro.',
    'Me pareció oír la tienda abrirse. Raro.',
    'La puerta de la tienda... creí escucharla. Qué extraño.',
    'Vaya, creo que acabo de oír la puerta de la tienda.',
    'Qué curioso, juraría que sonó la puerta de la tienda.',
  ],
  rootChoices: spanishStanRootChoices,
};
