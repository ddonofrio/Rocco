import { Application, Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { RoccoCartridgeMenu } from './cartridge-menu';

describe('RoccoCartridgeMenu', () => {
  it('selects a settings row on first pointer click and activates it on the second', () => {
    const menu = new RoccoCartridgeMenu({
      stage: new Container(),
    } as Application);

    const renderSpy = vi
      .spyOn(menu as never as { render(): void }, 'render')
      .mockImplementation(() => undefined);
    const activateSpy = vi
      .spyOn(
        menu as never as { activateSettingsSelection(): void },
        'activateSettingsSelection',
      )
      .mockImplementation(() => undefined);

    (
      menu as never as {
        settingsSelectionId: string;
        onSettingsRowPointerDown(optionId: string): void;
      }
    ).settingsSelectionId = 'video';

    (
      menu as never as {
        onSettingsRowPointerDown(optionId: string): void;
      }
    ).onSettingsRowPointerDown('development-kit.developer-mode');

    expect(
      (
        menu as never as {
          settingsSelectionId: string;
        }
      ).settingsSelectionId,
    ).toBe('development-kit.developer-mode');
    expect(activateSpy).not.toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalledTimes(1);

    renderSpy.mockClear();

    (
      menu as never as {
        onSettingsRowPointerDown(optionId: string): void;
      }
    ).onSettingsRowPointerDown('development-kit.developer-mode');

    expect(activateSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).not.toHaveBeenCalled();
  });
});
