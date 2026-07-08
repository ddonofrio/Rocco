import { Application, Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { RoccoCartridgeMenu } from '../../../src/engine/cartridge-menu/cartridge-menu';

interface RoccoCartridgeMenuTestAccess {
  render(): void;
  activateSettingsSelection(): void;
  settingsSelectionId: string;
  onSettingsRowPointerDown(optionId: string): void;
}

describe('RoccoCartridgeMenu', () => {
  it('selects a settings row on first pointer click and activates it on the second', () => {
    const menu = new RoccoCartridgeMenu({
      stage: new Container(),
    } as Application);
    const menuAccess = menu as unknown as RoccoCartridgeMenuTestAccess;

    const renderSpy = vi
      .spyOn(menuAccess, 'render')
      .mockImplementation(() => undefined);
    const activateSpy = vi
      .spyOn(menuAccess, 'activateSettingsSelection')
      .mockImplementation(() => undefined);

    menuAccess.settingsSelectionId = 'video';

    menuAccess.onSettingsRowPointerDown('development-kit.developer-mode');

    expect(menuAccess.settingsSelectionId).toBe('development-kit.developer-mode');
    expect(activateSpy).not.toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalledTimes(1);

    renderSpy.mockClear();

    menuAccess.onSettingsRowPointerDown('development-kit.developer-mode');

    expect(activateSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).not.toHaveBeenCalled();
  });
});
