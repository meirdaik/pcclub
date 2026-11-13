import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { Header, Screen } from '@/ui/components';
import { Icon } from '@/ui/navicons';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { T } from '@/ui/type';

function Toggle({
  label,
  on,
  onPress,
  disabled,
}: {
  label: string;
  on: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <T v="body" style={{ flex: 1, fontSize: 17, lineHeight: 24 }}>
        {label}
      </T>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: on, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.track, disabled && { opacity: 0.4 }]}
      >
        {on ? (
          <LinearGradient
            colors={gradient.colors}
            start={gradient.start}
            end={gradient.end}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
        ) : null}
        <View style={[styles.thumb, on ? { right: 3 } : { left: 3 }]} />
      </Pressable>
    </View>
  );
}

/** Settings: language, permissions (live status of location and camera) and the app version. */
export default function SettingsScreen() {
  const router = useRouter();
  const [location, askLocation] = Location.useForegroundPermissions();
  const [camera, askCamera] = Camera.useCameraPermissions();
  const web = Platform.OS === 'web';
  return (
    <Screen>
      <Header back={t.menu.title} onBack={() => router.back()} />
      <View style={styles.title}>
        <T v="label" style={{ fontSize: 22, lineHeight: 28 }}>
          {t.settings.title}
        </T>
      </View>
      <View style={styles.row}>
        <T v="label" style={{ flex: 1, fontSize: 18, lineHeight: 24 }}>
          {t.settings.language}
        </T>
        <View style={styles.language}>
          <T v="label">{t.settings.languageValue}</T>
          <Icon name="chevronDown" size={16} color={colors.muted} />
        </View>
      </View>
      <Toggle
        label={t.settings.location}
        on={location?.granted ?? false}
        disabled={web || location?.granted}
        onPress={() => void askLocation()}
      />
      <Toggle
        label={t.settings.camera}
        on={camera?.granted ?? false}
        disabled={web || camera?.granted}
        onPress={() => void askCamera()}
      />
      <Toggle label={t.settings.notifications} on={false} disabled />
      <View style={[styles.row, { marginTop: 8 }]}>
        <T v="label" style={{ flex: 1, fontSize: 18, lineHeight: 24 }}>
          {t.settings.version}
        </T>
        <T v="mono12">1.0.0</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: GUTTER, paddingBottom: 8 },
  row: {
    minHeight: 64,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  language: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
  },
  track: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.used,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text,
  },
});
