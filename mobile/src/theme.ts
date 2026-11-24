import { Platform } from 'react-native';
/** Design tokens, matching DESIGN.md and the web app. */
export const C = {
  bg: '#F7F8FA', surface: '#FFFFFF', surface2: '#F2F4F7', line: '#E4E7EC', line2: '#D0D5DD',
  ink: '#101828', ink2: '#475467', ink3: '#5B6472', ink4: '#7B8494',
  primary: '#3457C4', primaryInk: '#FFFFFF', primarySoft: '#EEF2FC',
  ok: '#0F6E56', okSoft: '#E1F5EE', bad: '#B42318', badSoft: '#FEF3F2', warn: '#854F0B', warnSoft: '#FAEEDA',
  hl: '#CFE0FF',
};

export const TRACK_COLOR: Record<string, { c: string; ink: string; soft: string }> = {
  dsa: { c: '#378ADD', ink: '#185FA5', soft: '#E6F1FB' },
  sd: { c: '#1D9E75', ink: '#0F6E56', soft: '#E1F5EE' },
  build: { c: '#7F77DD', ink: '#534AB7', soft: '#EEEDFE' },
  speak: { c: '#EF9F27', ink: '#854F0B', soft: '#FAEEDA' },
  research: { c: '#D85A30', ink: '#993C1D', soft: '#FAECE7' },
  review: { c: '#888780', ink: '#5F5E5A', soft: '#F1EFE8' },
  read: { c: '#888780', ink: '#5F5E5A', soft: '#F1EFE8' },
};

export const R = { card: 12, hero: 14, button: 8 };
export const S = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28 };
export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
