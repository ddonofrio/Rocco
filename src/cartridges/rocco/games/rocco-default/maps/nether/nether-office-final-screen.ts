import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import { netherOfficeFinalMusicUri } from './nether-office-final-screen-assets';

const NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID = 'rocco-nether-office-final-screen';
const NETHER_OFFICE_FINAL_SCREEN_TITLE_ID = 'rocco-nether-office-final-screen-title';
const NETHER_OFFICE_FINAL_MUSIC_ID = 'rocco-nether-office-final-music';

function showBlackScreen(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.closeMenu();
  engine.video.gridMenus.closeMenu();
  engine.video.messages.clearMessages();
  engine.video.titles.removeTitle(NETHER_OFFICE_FINAL_SCREEN_TITLE_ID);
  engine.video.primitives.addPrimitive({
    id: NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID,
    kind: 'rect',
    renderLayer: 'overlay.primitives',
    zIndex: 10_000,
    color: '#000000',
    alpha: 1,
    visible: true,
    x: 0,
    y: 0,
    width: ROCCO_DESIGN_WIDTH,
    height: ROCCO_DESIGN_HEIGHT,
    fill: true,
  });
}

function showCenteredTitle(engine: CartridgeSdkV1Runtime, text: string): void {
  engine.video.titles.addTitle({
    id: NETHER_OFFICE_FINAL_SCREEN_TITLE_ID,
    text,
    renderLayer: 'overlay.titles',
    zIndex: 10_001,
    x: ROCCO_DESIGN_WIDTH / 2,
    y: ROCCO_DESIGN_HEIGHT / 2,
    anchor: { x: 0.5, y: 0.5 },
    style: {
      fill: '#d7e6c5',
      fontFamily: 'Cascadia Mono, Lucida Console, monospace',
      fontSize: 28,
      fontWeight: '700',
      align: 'center',
    },
    visible: true,
  });
}

function startNetherOfficeFinalMusic(engine: CartridgeSdkV1Runtime): void {
  engine.jukebox.stopPlaylist();
  engine.audio.unregisterSound(NETHER_OFFICE_FINAL_MUSIC_ID);
  engine.audio.registerSound({
    id: NETHER_OFFICE_FINAL_MUSIC_ID,
    uri: netherOfficeFinalMusicUri,
    volume: 0.5,
  });
  engine.audio.playSound(NETHER_OFFICE_FINAL_MUSIC_ID, {
    volume: 0.5,
    restart: true,
  });
}

export function showNetherOfficeBlackScreen(engine: CartridgeSdkV1Runtime): void {
  showBlackScreen(engine);
}

export function showNetherOfficeFinalScreen(engine: CartridgeSdkV1Runtime): void {
  showBlackScreen(engine);
  showCenteredTitle(engine, 'pantalla final aqu\u{00ED}');
  startNetherOfficeFinalMusic(engine);
}

export function clearNetherOfficeFinalScreen(engine: CartridgeSdkV1Runtime): void {
  engine.audio.unregisterSound(NETHER_OFFICE_FINAL_MUSIC_ID);
  engine.video.primitives.removePrimitive(NETHER_OFFICE_FINAL_SCREEN_PRIMITIVE_ID);
  engine.video.titles.removeTitle(NETHER_OFFICE_FINAL_SCREEN_TITLE_ID);
}
