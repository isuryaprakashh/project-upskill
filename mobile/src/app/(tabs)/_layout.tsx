import { Tabs } from 'expo-router';
import { Icon, ICONS } from '../../components/ui';
import { C } from '../../theme';

const tab = (icon: string, title: string) => ({
  title,
  tabBarIcon: ({ color }: { color: unknown }) => <Icon d={icon} color={typeof color === 'string' ? color : C.ink3} size={22} />,
});

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.ink3, tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.line }, tabBarLabelStyle: { fontSize: 12, fontWeight: '500' } }}>
      <Tabs.Screen name="index" options={tab(ICONS.today, 'Today')} />
      <Tabs.Screen name="tracks" options={tab(ICONS.tracks, 'Tracks')} />
      <Tabs.Screen name="career" options={tab(ICONS.career, 'Career')} />
      <Tabs.Screen name="library" options={tab(ICONS.library, 'Library')} />
    </Tabs>
  );
}
