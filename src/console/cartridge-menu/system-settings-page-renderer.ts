import { Container, Graphics } from 'pixi.js';

import {
  getEffectiveMusicVolume,
  getEffectiveSfxVolume,
  type RoccoSoundProfile,
} from '../audio';
import type { RoccoDisplayProfile } from '../video/display';
import {
  ROCCO_CARTRIDGE_MENU_COLORS as C,
  ROCCO_CARTRIDGE_MENU_TOGGLE_W as TOGGLE_W,
  RoccoCartridgeMenuPixiUiPrimitives,
} from './pixi-ui-primitives';

const SETTINGS_TOP = 106;
const PANEL_X = 60;
const PANEL_W = 840;
const PANEL_INSET = 18;
const MODULE_PANEL_W = 320;
const DETAIL_PANEL_X = PANEL_X + MODULE_PANEL_W + 24;
const DETAIL_PANEL_W = PANEL_W - MODULE_PANEL_W - 24;
const OPTION_ROW_X = PANEL_X + 14;
const OPTION_ROW_W = PANEL_W - 28;
const OPTION_ROW_H = 46;
const MODULE_ROW_W = MODULE_PANEL_W - 28;
const MODULE_ROW_H = 50;

export const VIDEO_ROW_IDS = ['filters', 'brightness', 'contrast'] as const;
export const SOUND_ROW_IDS = ['master', 'music', 'effects'] as const;
export const FILTER_ROW_IDS = ['roundedCorners', 'crtMask', 'edgeVignette'] as const;

export type VideoRowId = (typeof VIDEO_ROW_IDS)[number];
export type SoundRowId = (typeof SOUND_ROW_IDS)[number];
export type FilterRowId = (typeof FILTER_ROW_IDS)[number];

export interface RoccoMenuSettingsOption {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly statusLabel: string;
  readonly description: string;
  readonly detailLabel?: string;
  readonly getValueLabel?: () => string;
  readonly activate?: () => Promise<void> | void;
}

interface RoccoSettingsHomeRenderOptions {
  settingsOptions: readonly RoccoMenuSettingsOption[];
  settingsSelectionId: string;
  displayProfile: RoccoDisplayProfile;
  soundProfile: RoccoSoundProfile;
  onSettingsRowPointerDown: (optionId: string) => void;
}

interface RoccoVideoSettingsRenderOptions {
  videoSelectionId: VideoRowId;
  displayProfile: RoccoDisplayProfile;
  onVideoRowPointerDown: (id: VideoRowId) => void;
  onVideoDecrease: (id: 'brightness' | 'contrast') => void;
  onVideoIncrease: (id: 'brightness' | 'contrast') => void;
}

interface RoccoFilterSettingsRenderOptions {
  filterSelectionId: FilterRowId;
  displayProfile: RoccoDisplayProfile;
  onFilterRowPointerDown: (id: FilterRowId) => void;
}

interface RoccoSoundSettingsRenderOptions {
  soundSelectionId: SoundRowId;
  soundProfile: RoccoSoundProfile;
  onSoundRowPointerDown: (id: SoundRowId) => void;
  onSoundDecrease: (id: SoundRowId) => void;
  onSoundIncrease: (id: SoundRowId) => void;
}

export class RoccoCartridgeMenuSystemSettingsRenderer {
  private readonly root: Container;
  private readonly ui: RoccoCartridgeMenuPixiUiPrimitives;

  constructor(root: Container, ui: RoccoCartridgeMenuPixiUiPrimitives) {
    this.root = root;
    this.ui = ui;
  }

  private drawPanel(x: number, y: number, width: number, height: number, title: string): void {
    this.ui.drawPanel(x, y, width, height, title, { panelInset: PANEL_INSET });
  }

  private drawDetailField(x: number, y: number, label: string, value: string): void {
    this.ui.drawDetailField(x, y, label, value, { valueOffset: 120 });
  }

  private drawRowFrame(parent: Container, width: number, height: number, isSelected: boolean): void {
    const fillColor = isSelected ? C.itemBgSelected : C.itemBg;
    const borderColor = isSelected ? C.itemBorderSelected : C.itemBorder;
    parent.addChild(
      new Graphics()
        .rect(0, 0, width, height)
        .fill(fillColor)
        .rect(0, 0, width, height)
        .stroke({ color: borderColor, width: 1 }),
    );
  }

  private countEnabledFilters(displayProfile: RoccoDisplayProfile): number {
    return Number(displayProfile.roundedCorners)
      + Number(displayProfile.crtMask)
      + Number(displayProfile.edgeVignette);
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private getSettingsOptionLabelFill(isEnabled: boolean, isSelected: boolean): number {
    if (!isEnabled) {
      return C.itemDisabled;
    }

    return isSelected ? C.itemTitleSelected : C.itemTitle;
  }

  private drawSettingsOptionRows(
    settingsOptions: readonly RoccoMenuSettingsOption[],
    settingsSelectionId: string,
    onSettingsRowPointerDown: (optionId: string) => void,
  ): void {
    let rowY = SETTINGS_TOP + 42;
    for (const option of settingsOptions) {
      rowY = this.drawSettingsOptionRow(
        option,
        rowY,
        option.id === settingsSelectionId,
        onSettingsRowPointerDown,
      );
    }
  }

  private drawSettingsOptionRow(
    option: RoccoMenuSettingsOption,
    y: number,
    isSelected: boolean,
    onSettingsRowPointerDown: (optionId: string) => void,
  ): number {
    const row = this.ui.createInteractiveContainer(
      PANEL_X + 14,
      y,
      MODULE_ROW_W,
      MODULE_ROW_H,
      () => {
        onSettingsRowPointerDown(option.id);
      },
    );

    this.drawRowFrame(row, MODULE_ROW_W, MODULE_ROW_H, isSelected);

    const label = this.ui.makeText(option.label, {
      fontSize: 18,
      fontWeight: isSelected ? '700' : '400',
      fill: this.getSettingsOptionLabelFill(option.enabled, isSelected),
      letterSpacing: 2,
    });
    label.x = 14;
    label.y = 12;
    row.addChild(label);

    const status = this.ui.makeText(option.statusLabel, {
      fontSize: 10,
      fill: option.enabled ? C.detailValue : C.itemDisabled,
      letterSpacing: 1,
    });
    status.x = MODULE_ROW_W - status.width - 12;
    status.y = 18;
    row.addChild(status);

    this.root.addChild(row);
    return y + 58;
  }

  private drawSelectedSettingsDetail(
    selectedOption: RoccoMenuSettingsOption,
    displayProfile: RoccoDisplayProfile,
    soundProfile: RoccoSoundProfile,
  ): void {
    const title = this.ui.makeText(selectedOption.label, {
      fontSize: 24,
      fontWeight: '700',
      fill: selectedOption.enabled ? C.titleBrand : C.itemDisabled,
      letterSpacing: 3,
    });
    title.x = DETAIL_PANEL_X + PANEL_INSET;
    title.y = SETTINGS_TOP + 46;
    this.root.addChild(title);

    const desc = this.ui.makeText(selectedOption.description, {
      fontSize: 13,
      fill: C.detailValue,
      wordWrap: true,
      wordWrapWidth: DETAIL_PANEL_W - PANEL_INSET * 2,
      leading: 6,
    });
    desc.x = DETAIL_PANEL_X + PANEL_INSET;
    desc.y = SETTINGS_TOP + 88;
    this.root.addChild(desc);

    let detailY = SETTINGS_TOP + 170;
    for (const [label, value] of this.getSelectedSettingsDetailFields(
      selectedOption,
      displayProfile,
      soundProfile,
    )) {
      this.drawDetailField(DETAIL_PANEL_X + PANEL_INSET, detailY, label, value);
      detailY += 28;
    }
  }

  private getSelectedSettingsDetailFields(
    selectedOption: RoccoMenuSettingsOption,
    displayProfile: RoccoDisplayProfile,
    soundProfile: RoccoSoundProfile,
  ): Array<readonly [string, string]> {
    if (selectedOption.id === 'video') {
      return [
        ['FILTERS', `${this.countEnabledFilters(displayProfile)} / 3 ON`],
        ['BRIGHTNESS', this.formatPercent(displayProfile.brightness)],
        ['CONTRAST', this.formatPercent(displayProfile.contrast)],
      ];
    }

    if (selectedOption.id === 'sound') {
      return [
        ['MASTER', this.formatPercent(soundProfile.masterVolume)],
        ['MUSIC', this.formatPercent(getEffectiveMusicVolume(soundProfile))],
        ['SFX', this.formatPercent(getEffectiveSfxVolume(soundProfile))],
      ];
    }

    if (selectedOption.getValueLabel) {
      return [[selectedOption.detailLabel ?? 'VALUE', selectedOption.getValueLabel()]];
    }

    return [['STATUS', selectedOption.enabled ? 'AVAILABLE' : 'DISABLED']];
  }

  private drawVideoInfoGrid(): void {
    const fields: Array<[string, string]> = [
      ['DEFINITION', '960 x 540'],
      ['COLORS', '16.7M (24-BIT RGB)'],
      ['COLOR MODEL', 'NATIVE RGB'],
    ];

    const startX = PANEL_X + PANEL_INSET;
    const startY = SETTINGS_TOP + 48;
    const columnGap = 390;
    const rowGap = 34;

    for (const [index, [label, value]] of fields.entries()) {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.drawDetailField(startX + column * columnGap, startY + row * rowGap, label, value);
    }
  }

  private drawVideoOptionRow(
    id: VideoRowId,
    label: string,
    y: number,
    videoSelectionId: VideoRowId,
    displayProfile: RoccoDisplayProfile,
    onVideoRowPointerDown: (id: VideoRowId) => void,
    onVideoDecrease: (id: 'brightness' | 'contrast') => void,
    onVideoIncrease: (id: 'brightness' | 'contrast') => void,
  ): number {
    const isSelected = videoSelectionId === id;
    const row = this.ui.createInteractiveContainer(OPTION_ROW_X, y, OPTION_ROW_W, OPTION_ROW_H, () => {
      onVideoRowPointerDown(id);
    });

    this.drawRowFrame(row, OPTION_ROW_W, OPTION_ROW_H, isSelected);

    const text = this.ui.makeText(label, {
      fontSize: 16,
      fontWeight: isSelected ? '700' : '400',
      fill: isSelected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    text.x = 14;
    text.y = 13;
    row.addChild(text);

    if (id === 'filters') {
      const summary = this.ui.makeText(`${this.countEnabledFilters(displayProfile)} / 3 ON`, {
        fontSize: 11,
        fill: C.detailValue,
        letterSpacing: 1,
      });
      summary.x = OPTION_ROW_W - summary.width - 42;
      summary.y = 16;
      row.addChild(summary);

      const chevron = this.ui.makeText('>', {
        fontSize: 16,
        fill: isSelected ? C.titleBrand : C.detailValue,
      });
      chevron.x = OPTION_ROW_W - 18;
      chevron.y = 12;
      row.addChild(chevron);
    } else {
      const value = displayProfile[id];
      this.ui.drawAdjustControl(
        row,
        OPTION_ROW_W - 214,
        9,
        200,
        this.formatPercent(value),
        () => {
          onVideoDecrease(id);
        },
        () => {
          onVideoIncrease(id);
        },
      );
    }

    this.root.addChild(row);
    return y + 54;
  }

  private drawSoundInfoGrid(soundProfile: RoccoSoundProfile): void {
    const fields: Array<[string, string]> = [
      ['MASTER', this.formatPercent(soundProfile.masterVolume)],
      ['MUSIC OUTPUT', this.formatPercent(getEffectiveMusicVolume(soundProfile))],
      ['SFX OUTPUT', this.formatPercent(getEffectiveSfxVolume(soundProfile))],
      ['ROUTING', 'MASTER x CHANNEL'],
    ];

    const startX = PANEL_X + PANEL_INSET;
    const startY = SETTINGS_TOP + 48;
    const columnGap = 390;
    const rowGap = 34;

    for (const [index, [label, value]] of fields.entries()) {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.drawDetailField(startX + column * columnGap, startY + row * rowGap, label, value);
    }
  }

  private getSoundRowValue(id: SoundRowId, soundProfile: RoccoSoundProfile): number {
    if (id === 'master') {
      return soundProfile.masterVolume;
    }

    if (id === 'music') {
      return getEffectiveMusicVolume(soundProfile);
    }

    return getEffectiveSfxVolume(soundProfile);
  }

  private drawSoundOptionRow(
    id: SoundRowId,
    label: string,
    y: number,
    soundSelectionId: SoundRowId,
    soundProfile: RoccoSoundProfile,
    onSoundRowPointerDown: (id: SoundRowId) => void,
    onSoundDecrease: (id: SoundRowId) => void,
    onSoundIncrease: (id: SoundRowId) => void,
  ): number {
    const isSelected = soundSelectionId === id;
    const row = this.ui.createInteractiveContainer(OPTION_ROW_X, y, OPTION_ROW_W, OPTION_ROW_H, () => {
      onSoundRowPointerDown(id);
    });

    this.drawRowFrame(row, OPTION_ROW_W, OPTION_ROW_H, isSelected);

    const text = this.ui.makeText(label, {
      fontSize: 16,
      fontWeight: isSelected ? '700' : '400',
      fill: isSelected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    text.x = 14;
    text.y = 13;
    row.addChild(text);

    this.ui.drawAdjustControl(
      row,
      OPTION_ROW_W - 214,
      9,
      200,
      this.formatPercent(this.getSoundRowValue(id, soundProfile)),
      () => {
        onSoundDecrease(id);
      },
      () => {
        onSoundIncrease(id);
      },
    );

    this.root.addChild(row);
    return y + 54;
  }

  private drawFilterOptionRow(
    id: FilterRowId,
    label: string,
    y: number,
    filterSelectionId: FilterRowId,
    displayProfile: RoccoDisplayProfile,
    onFilterRowPointerDown: (id: FilterRowId) => void,
  ): number {
    const isSelected = filterSelectionId === id;
    const row = this.ui.createInteractiveContainer(OPTION_ROW_X, y, OPTION_ROW_W, OPTION_ROW_H, () => {
      onFilterRowPointerDown(id);
    });

    this.drawRowFrame(row, OPTION_ROW_W, OPTION_ROW_H, isSelected);

    const text = this.ui.makeText(label, {
      fontSize: 16,
      fontWeight: isSelected ? '700' : '400',
      fill: isSelected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    text.x = 14;
    text.y = 13;
    row.addChild(text);

    this.ui.drawToggleControl(row, OPTION_ROW_W - TOGGLE_W - 14, 11, displayProfile[id]);

    this.root.addChild(row);
    return y + 54;
  }

  drawSettingsHome({
    settingsOptions,
    settingsSelectionId,
    displayProfile,
    soundProfile,
    onSettingsRowPointerDown,
  }: RoccoSettingsHomeRenderOptions): void {
    const selectedOption = settingsOptions.find((option) => option.id === settingsSelectionId)
      ?? settingsOptions[0];
    if (!selectedOption) {
      return;
    }

    this.drawPanel(PANEL_X, SETTINGS_TOP, MODULE_PANEL_W, 286, 'MODULES');
    this.drawPanel(DETAIL_PANEL_X, SETTINGS_TOP, DETAIL_PANEL_W, 286, 'DETAIL');
    this.drawSettingsOptionRows(settingsOptions, settingsSelectionId, onSettingsRowPointerDown);
    this.drawSelectedSettingsDetail(selectedOption, displayProfile, soundProfile);
  }

  drawVideoSettings({
    videoSelectionId,
    displayProfile,
    onVideoRowPointerDown,
    onVideoDecrease,
    onVideoIncrease,
  }: RoccoVideoSettingsRenderOptions): void {
    this.drawPanel(PANEL_X, SETTINGS_TOP, PANEL_W, 114, 'VIDEO STATUS');
    this.drawVideoInfoGrid();

    this.drawPanel(PANEL_X, SETTINGS_TOP + 136, PANEL_W, 214, 'OPTIONS');

    let rowY = SETTINGS_TOP + 178;
    rowY = this.drawVideoOptionRow(
      'filters',
      'FILTERS',
      rowY,
      videoSelectionId,
      displayProfile,
      onVideoRowPointerDown,
      onVideoDecrease,
      onVideoIncrease,
    );
    rowY = this.drawVideoOptionRow(
      'brightness',
      'BRIGHTNESS',
      rowY,
      videoSelectionId,
      displayProfile,
      onVideoRowPointerDown,
      onVideoDecrease,
      onVideoIncrease,
    );
    this.drawVideoOptionRow(
      'contrast',
      'CONTRAST',
      rowY,
      videoSelectionId,
      displayProfile,
      onVideoRowPointerDown,
      onVideoDecrease,
      onVideoIncrease,
    );
  }

  drawFilterSettings({
    filterSelectionId,
    displayProfile,
    onFilterRowPointerDown,
  }: RoccoFilterSettingsRenderOptions): void {
    this.drawPanel(PANEL_X, SETTINGS_TOP, PANEL_W, 118, 'ACTIVE FILTERS');

    const desc = this.ui.makeText(
      'Toggle the built-in console display effects. Changes apply immediately and reset on the next boot.',
      {
        fontSize: 13,
        fill: C.detailValue,
        wordWrap: true,
        wordWrapWidth: PANEL_W - PANEL_INSET * 2,
        leading: 6,
      },
    );
    desc.x = PANEL_X + PANEL_INSET;
    desc.y = SETTINGS_TOP + 50;
    this.root.addChild(desc);

    this.drawPanel(PANEL_X, SETTINGS_TOP + 140, PANEL_W, 244, 'FILTERS');

    let rowY = SETTINGS_TOP + 182;
    rowY = this.drawFilterOptionRow(
      'roundedCorners',
      'ROUNDED CORNERS',
      rowY,
      filterSelectionId,
      displayProfile,
      onFilterRowPointerDown,
    );
    rowY = this.drawFilterOptionRow(
      'crtMask',
      'CRT SHADOW MASK',
      rowY,
      filterSelectionId,
      displayProfile,
      onFilterRowPointerDown,
    );
    this.drawFilterOptionRow(
      'edgeVignette',
      'EDGE VIGNETTE',
      rowY,
      filterSelectionId,
      displayProfile,
      onFilterRowPointerDown,
    );
  }

  drawSoundSettings({
    soundSelectionId,
    soundProfile,
    onSoundRowPointerDown,
    onSoundDecrease,
    onSoundIncrease,
  }: RoccoSoundSettingsRenderOptions): void {
    this.drawPanel(PANEL_X, SETTINGS_TOP, PANEL_W, 148, 'MIX STATUS');
    this.drawSoundInfoGrid(soundProfile);

    this.drawPanel(PANEL_X, SETTINGS_TOP + 170, PANEL_W, 214, 'CHANNELS');

    let rowY = SETTINGS_TOP + 212;
    rowY = this.drawSoundOptionRow(
      'master',
      'MASTER VOLUME',
      rowY,
      soundSelectionId,
      soundProfile,
      onSoundRowPointerDown,
      onSoundDecrease,
      onSoundIncrease,
    );
    rowY = this.drawSoundOptionRow(
      'music',
      'MUSIC VOLUME',
      rowY,
      soundSelectionId,
      soundProfile,
      onSoundRowPointerDown,
      onSoundDecrease,
      onSoundIncrease,
    );
    this.drawSoundOptionRow(
      'effects',
      'SFX VOLUME',
      rowY,
      soundSelectionId,
      soundProfile,
      onSoundRowPointerDown,
      onSoundDecrease,
      onSoundIncrease,
    );
  }
}
