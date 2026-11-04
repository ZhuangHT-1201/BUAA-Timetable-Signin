import type { CachedSchedule, ConnectionMode, Profile, ResolvedConnectionMode } from '../types';

const CACHE_KEY = 'buaa-timetable-sign.schedule.v1';
const PROFILE_KEY = 'buaa-timetable-sign.profile.v1';
const MODE_KEY = 'buaa-timetable-sign.mode.v1';
const PREFERENCE_KEY = 'buaa-timetable-sign.mode-preference.v1';
const BACKGROUND_KEY = 'buaa-timetable-sign.background.v1';

export function saveSchedule(cache: CachedSchedule): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function loadSchedule(): CachedSchedule | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedSchedule) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveMode(mode: ResolvedConnectionMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function loadMode(): ResolvedConnectionMode {
  return localStorage.getItem(MODE_KEY) === 'webvpn' ? 'webvpn' : 'direct';
}

export function savePreference(mode: ConnectionMode): void {
  localStorage.setItem(PREFERENCE_KEY, mode);
}

export function loadPreference(): ConnectionMode {
  const value = localStorage.getItem(PREFERENCE_KEY);
  return value === 'direct' || value === 'webvpn' ? value : 'auto';
}

export function saveBackgroundEnabled(enabled: boolean): void {
  localStorage.setItem(BACKGROUND_KEY, enabled ? '1' : '0');
}

export function loadBackgroundEnabled(): boolean {
  return localStorage.getItem(BACKGROUND_KEY) === '1';
}

export function clearLocalData(keepSchedule = true): void {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(MODE_KEY);
  localStorage.removeItem(PREFERENCE_KEY);
  localStorage.removeItem(BACKGROUND_KEY);
  if (!keepSchedule) localStorage.removeItem(CACHE_KEY);
}

export function clearScheduleCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
