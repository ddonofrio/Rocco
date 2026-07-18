import { resolveRoccoSoundProfile, type RoccoSoundProfile } from '../audio';
import type { RoccoCartridgeBootSetting, RoccoCartridgeManifest } from '../cartridges/types';
import { resolveRoccoDisplayProfile, type RoccoDisplayProfile } from '../video/display';
import type { FilterRowId, SoundRowId, VideoRowId } from './system-settings-page-renderer';

export type RoccoCartridgeMenuPage = 'cartridges' | 'settings' | 'video' | 'sound' | 'filters';

export interface RoccoCartridgeMenuSessionOptions {
  initialLocales?: Record<string, string>;
  initialDisplayProfile?: Partial<RoccoDisplayProfile>;
  initialSoundProfile?: Partial<RoccoSoundProfile>;
  bootSettings?: readonly RoccoCartridgeBootSetting[];
}

export class RoccoCartridgeMenuSession {
  private manifestsValue: readonly RoccoCartridgeManifest[] = [];
  private selectedLocalesValue = new Map<string, string>();
  private scrollOffsetValue = 0;
  private selectedIndexValue = 0;
  private pageValue: RoccoCartridgeMenuPage = 'cartridges';
  private settingsSelectionIdValue = 'video';
  private videoSelectionIdValue: VideoRowId = 'filters';
  private soundSelectionIdValue: SoundRowId = 'master';
  private filterSelectionIdValue: FilterRowId = 'roundedCorners';
  private displayProfileValue = resolveRoccoDisplayProfile();
  private soundProfileValue = resolveRoccoSoundProfile();
  private bootSettingsValue: readonly RoccoCartridgeBootSetting[] = [];

  private alignScrollToSelection(visibleItems: number): void {
    if (this.selectedIndexValue < this.scrollOffsetValue) {
      this.scrollOffsetValue = this.selectedIndexValue;
      return;
    }

    const safeVisibleItems = Math.max(1, visibleItems);
    if (this.selectedIndexValue >= this.scrollOffsetValue + safeVisibleItems) {
      this.scrollOffsetValue = this.selectedIndexValue - safeVisibleItems + 1;
    }
  }

  private clampIndex(index: number, length: number): number {
    if (length <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(length - 1, index));
  }

  private moveInCycle<T extends string>(values: readonly T[], current: T, delta: -1 | 1): T {
    const currentIndex = Math.max(0, values.indexOf(current));
    const nextIndex = (currentIndex + delta + values.length) % values.length;
    return values[nextIndex] ?? current;
  }

  begin(
    manifests: readonly RoccoCartridgeManifest[],
    options: RoccoCartridgeMenuSessionOptions = {},
  ): void {
    this.manifestsValue = manifests;
    this.selectedLocalesValue = new Map(Object.entries(options.initialLocales ?? {}));
    this.scrollOffsetValue = 0;
    this.selectedIndexValue = 0;
    this.pageValue = 'cartridges';
    this.settingsSelectionIdValue = 'video';
    this.videoSelectionIdValue = 'filters';
    this.soundSelectionIdValue = 'master';
    this.filterSelectionIdValue = 'roundedCorners';
    this.displayProfileValue = resolveRoccoDisplayProfile(options.initialDisplayProfile);
    this.soundProfileValue = resolveRoccoSoundProfile(options.initialSoundProfile);
    this.bootSettingsValue = options.bootSettings ?? [];
  }

  get manifests(): readonly RoccoCartridgeManifest[] {
    return this.manifestsValue;
  }

  get selectedManifest(): RoccoCartridgeManifest | undefined {
    return this.manifestsValue[this.selectedIndexValue];
  }

  get scrollOffset(): number {
    return this.scrollOffsetValue;
  }

  get selectedIndex(): number {
    return this.selectedIndexValue;
  }

  selectCartridge(index: number): boolean {
    const nextIndex = this.clampIndex(index, this.manifestsValue.length);
    if (nextIndex === this.selectedIndexValue) {
      return false;
    }

    this.selectedIndexValue = nextIndex;
    return true;
  }

  moveCartridgeSelection(delta: number, visibleItems: number): boolean {
    const nextIndex = this.clampIndex(this.selectedIndexValue + delta, this.manifestsValue.length);
    if (nextIndex === this.selectedIndexValue) {
      return false;
    }

    this.selectedIndexValue = nextIndex;
    this.alignScrollToSelection(visibleItems);
    return true;
  }

  scrollCartridgeList(delta: number, visibleItems: number): boolean {
    const maxScroll = Math.max(0, this.manifestsValue.length - Math.max(1, visibleItems));
    const nextOffset = Math.min(maxScroll, Math.max(0, this.scrollOffsetValue + delta));
    if (nextOffset === this.scrollOffsetValue) {
      return false;
    }

    this.scrollOffsetValue = nextOffset;
    return true;
  }

  get page(): RoccoCartridgeMenuPage {
    return this.pageValue;
  }

  openCartridgeSelection(): void {
    this.pageValue = 'cartridges';
  }

  openSettings(): void {
    this.pageValue = 'settings';
  }

  openVideoSettings(): void {
    this.pageValue = 'video';
  }

  openSoundSettings(): void {
    this.pageValue = 'sound';
  }

  openFilterSettings(): void {
    this.pageValue = 'filters';
  }

  returnFromVideoSettings(): void {
    this.pageValue = 'settings';
    this.settingsSelectionIdValue = 'video';
  }

  returnFromSoundSettings(): void {
    this.pageValue = 'settings';
    this.settingsSelectionIdValue = 'sound';
  }

  returnFromFilterSettings(): void {
    this.pageValue = 'video';
    this.videoSelectionIdValue = 'filters';
  }

  routeBuiltInSettingsSelection(optionId: string): boolean {
    switch (optionId) {
      case 'video': {
        this.openVideoSettings();
        return true;
      }
      case 'sound': {
        this.openSoundSettings();
        return true;
      }
      case 'back': {
        this.openCartridgeSelection();
        return true;
      }
      default: {
        return false;
      }
    }
  }

  get settingsSelectionId(): string {
    return this.settingsSelectionIdValue;
  }

  set settingsSelectionId(value: string) {
    this.settingsSelectionIdValue = value;
  }

  moveSettingsSelection(values: readonly string[], delta: -1 | 1): void {
    this.settingsSelectionIdValue = this.moveInCycle(values, this.settingsSelectionIdValue, delta);
  }

  get videoSelectionId(): VideoRowId {
    return this.videoSelectionIdValue;
  }

  set videoSelectionId(value: VideoRowId) {
    this.videoSelectionIdValue = value;
  }

  moveVideoSelection(values: readonly VideoRowId[], delta: -1 | 1): void {
    this.videoSelectionIdValue = this.moveInCycle(values, this.videoSelectionIdValue, delta);
  }

  get soundSelectionId(): SoundRowId {
    return this.soundSelectionIdValue;
  }

  set soundSelectionId(value: SoundRowId) {
    this.soundSelectionIdValue = value;
  }

  moveSoundSelection(values: readonly SoundRowId[], delta: -1 | 1): void {
    this.soundSelectionIdValue = this.moveInCycle(values, this.soundSelectionIdValue, delta);
  }

  get filterSelectionId(): FilterRowId {
    return this.filterSelectionIdValue;
  }

  set filterSelectionId(value: FilterRowId) {
    this.filterSelectionIdValue = value;
  }

  moveFilterSelection(values: readonly FilterRowId[], delta: -1 | 1): void {
    this.filterSelectionIdValue = this.moveInCycle(values, this.filterSelectionIdValue, delta);
  }

  get displayProfile(): RoccoDisplayProfile {
    return this.displayProfileValue;
  }

  updateDisplayProfile(profile: Partial<RoccoDisplayProfile>): RoccoDisplayProfile {
    this.displayProfileValue = resolveRoccoDisplayProfile({
      ...this.displayProfileValue,
      ...profile,
    });
    return this.displayProfileValue;
  }

  get soundProfile(): RoccoSoundProfile {
    return this.soundProfileValue;
  }

  updateSoundProfile(profile: Partial<RoccoSoundProfile>): RoccoSoundProfile {
    this.soundProfileValue = resolveRoccoSoundProfile({
      ...this.soundProfileValue,
      ...profile,
    });
    return this.soundProfileValue;
  }

  get bootSettings(): readonly RoccoCartridgeBootSetting[] {
    return this.bootSettingsValue;
  }

  selectLocale(manifestId: string, locale: string): void {
    this.selectedLocalesValue.set(manifestId, locale);
  }

  getManifestLocales(manifest: RoccoCartridgeManifest): string[] {
    return ['en', ...Object.keys(manifest.localizations ?? {})];
  }

  getSelectedLocale(manifest: RoccoCartridgeManifest): string {
    const locales = this.getManifestLocales(manifest);
    const selectedLocale = this.selectedLocalesValue.get(manifest.id);
    return selectedLocale && locales.includes(selectedLocale)
      ? selectedLocale
      : (locales[0] ?? 'en');
  }

  localizeManifest(manifest: RoccoCartridgeManifest): RoccoCartridgeManifest {
    const locale = this.getSelectedLocale(manifest);
    const localizedManifest = locale === 'en' ? undefined : manifest.localizations?.[locale];
    return {
      ...manifest,
      ...localizedManifest,
      localizations: manifest.localizations,
    };
  }
}
