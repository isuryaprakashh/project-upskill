import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { C, R, S, TRACK_COLOR } from '../theme';

export const ICONS = {
  today: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  tracks: 'M4 6h16M4 12h16M4 18h10',
  career: 'M3 8h18v12H3zM8 8V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V8M3 13h18',
  library: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  check: 'M5 12l5 5 9-10',
  back: 'M15 6l-6 6 6 6',
};

export function Icon({ d, color = C.ink2, size = 20 }: { d: string; color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

/** A scrolling screen with safe-area padding. */
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: S.l, paddingBottom: 40, gap: S.m }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer && <View style={st.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

export const H1 = ({ children }: { children: ReactNode }) => <Text style={st.h1} accessibilityRole="header">{children}</Text>;
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.h2, style]} accessibilityRole="header">{children}</Text>;
export const CardTitle = ({ children }: { children: ReactNode }) => <Text style={st.ch}>{children}</Text>;
export const Body = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.body, style]}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.muted, style]}>{children}</Text>;

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [st.card, style, pressed && { opacity: 0.85 }]}>{children}</Pressable>;
  return <View style={[st.card, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', disabled, busy, icon, style }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; busy?: boolean; icon?: string; style?: StyleProp<ViewStyle> }) {
  const p = kind === 'primary';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled || busy} onPress={onPress}
      style={({ pressed }) => [st.btn, p ? st.btnP : kind === 'secondary' ? st.btnS : st.btnG, (disabled || busy) && { opacity: 0.45 }, pressed && { opacity: 0.8 }, style]}>
      {busy ? <ActivityIndicator color={p ? C.primaryInk : C.ink} /> : <>
        {icon && <Icon d={icon} color={p ? C.primaryInk : C.ink} size={18} />}
        <Text style={[st.btnT, { color: p ? C.primaryInk : C.ink }]}>{title}</Text>
      </>}
    </Pressable>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: 'ok' | 'bad' | 'warn' | 'primary' | string }) {
  const map: Record<string, [string, string]> = { ok: [C.okSoft, C.ok], bad: [C.badSoft, C.bad], warn: [C.warnSoft, C.warn], primary: [C.primarySoft, C.primary] };
  const t = tone && TRACK_COLOR[tone] ? [TRACK_COLOR[tone].soft, TRACK_COLOR[tone].ink] : map[tone ?? ''] ?? [C.surface2, C.ink2];
  return <View style={[st.badge, { backgroundColor: t[0] }]}><Text style={{ color: t[1], fontSize: 12, fontWeight: '600' }}>{children}</Text></View>;
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  return <View style={st.bar}><View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 3, backgroundColor: color }} /></View>;
}

export function Check({ on, onChange, children, label }: { on: boolean; onChange: () => void; children?: ReactNode; label?: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onChange} hitSlop={8} style={st.chk}>
      <View style={[st.bx, on && { backgroundColor: C.ok, borderColor: C.ok }]}>{on && <Icon d={ICONS.check} color="#fff" size={14} />}</View>
      {children != null && <Text style={[st.body, { flex: 1 }, on && { color: C.ink3, textDecorationLine: 'line-through' }]}>{children}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: C.ink2 }}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={C.ink4} style={[st.input, props.multiline && { minHeight: 88, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

/** Pill tabs, like the web app's segmented control. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.seg}>
      {options.map(([v, label]) => (
        <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: v === value }} onPress={() => onChange(v)} style={[st.segB, v === value && st.segOn]}>
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: v === value ? C.ink : C.ink3 }}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Row({ title, sub, onPress, right, left }: { title: string; sub?: string; onPress?: () => void; right?: ReactNode; left?: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.surface2 }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: C.ink }} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={st.muted} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** Turns **words** into highlighted text. */
export function Rich({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = text.split('**');
  return <Text style={[st.body, style]}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={{ fontWeight: '700', backgroundColor: C.hl }}>{p}</Text> : p))}</Text>;
}

export const openUrl = (u: string) => { if (/^https?:\/\//i.test(u)) void Linking.openURL(u); };

/* ---------- toast ---------- */
let message = '';
let timer: ReturnType<typeof setTimeout> | null = null;
const subs = new Set<() => void>();
export function toast(m: string) {
  message = m;
  subs.forEach((s) => s());
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { message = ''; subs.forEach((s) => s()); }, 2200);
}
export function Toast() {
  const m = useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => message);
  if (!m) return null;
  return <View pointerEvents="none" style={st.toast} accessibilityLiveRegion="polite"><Text style={{ color: '#fff', fontWeight: '500' }}>{m}</Text></View>;
}

export const st = StyleSheet.create({
  h1: { fontSize: 30, fontWeight: '700', color: C.ink, letterSpacing: -0.3, marginBottom: 4 },
  h2: { fontSize: 19, fontWeight: '700', color: C.ink },
  ch: { fontSize: 14, fontWeight: '600', color: C.ink2, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, color: C.ink },
  muted: { fontSize: 13.5, lineHeight: 20, color: C.ink3 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.card, padding: S.l },
  btn: { minHeight: 46, borderRadius: R.button, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' },
  btnP: { backgroundColor: C.primary },
  btnS: { backgroundColor: C.surface, borderColor: C.line2 },
  btnG: { backgroundColor: 'transparent' },
  btnT: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.surface2, overflow: 'hidden', flex: 1 },
  chk: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8, minHeight: 44 },
  bx: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.line2, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  input: { fontSize: 16, color: C.ink, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line2, borderRadius: R.button, paddingHorizontal: 12, paddingVertical: 10 },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: C.surface2, borderRadius: 10, padding: 3 },
  segB: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  segOn: { backgroundColor: C.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 52, borderTopWidth: 1, borderTopColor: C.line },
  footer: { flexDirection: 'row', gap: 10, padding: S.m, paddingBottom: S.l, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
});
