import { SvgXml } from 'react-native-svg';

/**
 * The lesson sketches use CSS classes on the web. React Native can't read CSS,
 * so each class is turned into plain SVG attributes here.
 */
const SHAPE: Record<string, string> = {
  g: 'stroke="#4E4B66" stroke-width="1.8" fill="none"',
  bl: 'stroke="#2F6FD6" stroke-width="2" fill="none"',
  rd: 'stroke="#D93A32" stroke-width="2.2" fill="none"',
  gr: 'stroke="#2F8A46" stroke-width="2.2" fill="none"',
  or: 'stroke="#E06A10" stroke-width="2" fill="none"',
  hy: 'stroke="#0F6E56" stroke-width="2" fill="#D9F2E8"',
  hb: 'stroke="#2F6FD6" stroke-width="2" fill="#DCEBFB"',
};
const TEXT: Record<string, string> = { ink: '#101828', tb: '#2F6FD6', tr: '#D93A32', tg: '#2F8A46', to: '#E06A10' };

export function toNativeSvg(svg: string): string {
  return svg
    .replace(/\sfilter="url\(#pencil\)"/g, '')
    .replace(/<text([^>]*?)class="([^"]*)"([^>]*)>/g, (_m, a: string, cls: string, b: string) => {
      const color = cls.split(/\s+/).map((c) => TEXT[c]).find(Boolean) ?? TEXT.ink;
      const sized = /font-size/.test(a + b) ? '' : ' font-size="17"';
      return `<text${a}fill="${color}" stroke="none"${sized}${b}>`;
    })
    .replace(/class="([a-z]+)"/g, (_m, cls: string) => SHAPE[cls] ?? '')
    .replace(/style="font-size:(\d+)px"/g, 'font-size="$1"');
}

export function Sketch({ svg }: { svg: string }) {
  return <SvgXml xml={toNativeSvg(svg)} width="100%" height={180} accessibilityLabel="Lesson sketch" />;
}
