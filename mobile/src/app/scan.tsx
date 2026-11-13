import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { Button } from '@/ui/components';
import { Icon } from '@/ui/navicons';
import { colors, gradient } from '@/ui/theme';
import { T } from '@/ui/type';

const SIZE = 240;
const SHADE = 700;
const RADIUS = 28;
const CORNER = 40;
const BRACKET = gradient.colors[1];

/**
 * Scan QR code: the live camera fills the screen under a dark veil, with a small rounded window
 * and four corner brackets. For now it only opens the camera; the code is not read yet.
 */
export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, request] = useCameraPermissions();
  const live = (permission?.granted ?? false) && Platform.OS !== 'web';

  return (
    <View style={styles.screen}>
      {live ? <CameraView style={StyleSheet.absoluteFill} facing="back" /> : null}

      {/* A huge rounded border with a window in the middle dims everything around the frame. */}
      <View pointerEvents="none" style={styles.veil} />

      <View style={styles.frame} pointerEvents="none">
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <View key={corner} style={[styles.corner, cornerStyle[corner]]} />
        ))}
      </View>
      <View style={styles.label} pointerEvents="none">
        <T v="label" style={{ fontSize: 18 }}>
          {t.scan.title}
        </T>
      </View>

      {!live ? (
        <View style={styles.notice}>
          <T v="body" color={colors.muted} style={{ textAlign: 'center' }}>
            {Platform.OS === 'web' ? t.scan.web : t.scan.denied}
          </T>
          {Platform.OS !== 'web' && permission?.canAskAgain !== false ? (
            <Button title={t.scan.allow} variant="secondary" onPress={() => void request()} />
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={[styles.back, { top: Math.max(insets.top, 12) + 8 }]}
      >
        <Icon name="close" size={22} />
      </Pressable>
    </View>
  );
}

const cornerStyle = {
  tl: { top: 0, left: 0, borderTopLeftRadius: RADIUS, borderLeftWidth: 4, borderTopWidth: 4 },
  tr: { top: 0, right: 0, borderTopRightRadius: RADIUS, borderRightWidth: 4, borderTopWidth: 4 },
  bl: { bottom: 0, left: 0, borderBottomLeftRadius: RADIUS, borderLeftWidth: 4, borderBottomWidth: 4 },
  br: { bottom: 0, right: 0, borderBottomRightRadius: RADIUS, borderRightWidth: 4, borderBottomWidth: 4 },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  veil: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -(SIZE / 2 + SHADE),
    marginTop: -(SIZE / 2 + SHADE),
    width: SIZE + SHADE * 2,
    height: SIZE + SHADE * 2,
    borderWidth: SHADE,
    borderRadius: SHADE + RADIUS,
    borderColor: 'rgba(8, 6, 13, 0.72)',
  },
  frame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -SIZE / 2,
    marginTop: -SIZE / 2,
    width: SIZE,
    height: SIZE,
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: BRACKET },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: SIZE / 2 + 20,
    alignItems: 'center',
  },
  notice: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '50%',
    marginTop: SIZE / 2 + 64,
    gap: 12,
  },
  back: {
    position: 'absolute',
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 13, 27, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
