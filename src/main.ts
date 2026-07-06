import './style.css';

import { registerSW } from 'virtual:pwa-register';
import { GameRuntime } from './engine/runtime';
import { viewport } from './engine/video';

registerSW({ immediate: true });

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('Could not find #app');
}

const viewportHost = new viewport.RoccoViewportHost({
  root: appRoot,
  designWidth: 960,
  designHeight: 540,
  backgroundColor: '#11130f',
});
viewportHost.mount();

const runtime = new GameRuntime({
  mount: viewportHost.getStageElement(),
  viewportHost,
  developerModeEnabled: false,
  onDisplayProfileChange: (profile) => {
    viewportHost.setDisplayProfile(profile);
  },
});
await runtime.init();

window.addEventListener('beforeunload', () => {
  void runtime.dispose();
  viewportHost.unmount();
});
