import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { Button, Screen } from '@/ui/components';
import { Icon } from '@/ui/navicons';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { T } from '@/ui/type';

/** Booking rules: what to know before holding a seat. Accepting opens date and time. */
export default function RulesScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const rules = [t.rules.r1, t.rules.r2, t.rules.r3, t.rules.r4];
  return (
    <Screen
      footer={
        <Button
          title={t.rules.accept}
          arrow
          onPress={() => router.replace({ pathname: '/reserve/[clubId]', params: { clubId } })}
        />
      }
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.close}
        >
          <Icon name="close" size={24} />
        </Pressable>
        <T v="label" style={{ fontSize: 20, lineHeight: 24 }}>
          {t.rules.title}
        </T>
        <View style={styles.close} />
      </View>
      <View style={styles.card}>
        <T v="body" style={{ fontSize: 16, lineHeight: 22 }}>
          {t.rules.intro}
        </T>
      </View>
      <T v="head" style={{ paddingHorizontal: GUTTER, marginTop: 24, fontSize: 32, lineHeight: 32 }}>
        {t.rules.heading}
      </T>
      <View style={{ paddingHorizontal: GUTTER, marginTop: 16, gap: 18 }}>
        {rules.map((rule, index) => (
          <View key={rule} style={styles.rule}>
            <LinearGradient
              colors={gradient.colors}
              start={gradient.start}
              end={gradient.end}
              style={styles.badge}
            >
              <T v="mono14" color={colors.onGradient}>
                {index + 1}
              </T>
            </LinearGradient>
            <T v="body" style={{ flex: 1, fontSize: 16, lineHeight: 23 }}>
              {rule}
            </T>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { width: 44, height: 44, justifyContent: 'center' },
  card: {
    marginHorizontal: GUTTER,
    marginTop: 8,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
