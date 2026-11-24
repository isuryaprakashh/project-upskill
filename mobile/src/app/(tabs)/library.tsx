import { content } from '@upskill/shared';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Card, H1, Icon, ICONS, Row, Screen } from '../../components/ui';
import { getSession } from '../../lib/api';
import { useProgress } from '../../lib/progress';
import { C, TRACK_COLOR } from '../../theme';

export default function Library() {
  const p = useProgress();
  const router = useRouter();
  const notes = Object.keys(p.notes).filter((k) => (p.notes[k] ?? '').trim()).length;
  let read = 0, all = 0;
  content.library.forEach((s) => s.items.forEach((i) => { all++; if (p.read[i.key]) read++; }));
  const rows: [string, string, string, string, string][] = [
    ['reading', 'Reading list', `${read} of ${all} read`, ICONS.library, TRACK_COLOR.read.c],
    ['notes', 'Mistake notebook', `${notes} note${notes === 1 ? '' : 's'} · read before interviews`, 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4', TRACK_COLOR.speak.c],
    ['how', 'How Project Upskill works', 'The weekly rhythm in one page', 'M12 17v.01M12 13a2 2 0 1 0-2-2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', TRACK_COLOR.sd.c],
    ['account', 'Account', getSession()?.user.email ?? '', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', TRACK_COLOR.build.c],
  ];
  return (
    <Screen>
      <H1>Library</H1>
      <Card>
        {rows.map(([to, title, sub, icon, color]) => (
          <Row key={to} title={title} sub={sub} onPress={() => router.push(`/more/${to}`)} left={<Icon d={icon} color={color} />} right={<Text style={{ color: C.ink4, fontSize: 20 }}>›</Text>} />
        ))}
      </Card>
    </Screen>
  );
}
