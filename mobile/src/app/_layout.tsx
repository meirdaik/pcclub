import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { errorMessage, t } from '@/i18n';
import { Button, Notice } from '@/ui/components';
import { Intro } from '@/ui/Intro';
import { colors } from '@/ui/theme';

/**
 * Three groups of screens, exactly one of which is reachable at a time:
 * signed out -> login; signed in without a verified IIN -> identity; verified -> the app.
 * Unverified users cannot book at all (the server enforces it), so the app does not let them in.
 * Every screen draws its own header, so the stack's native header is off.
 */
function Navigator() {
  const { state, retry, signOut } = useAuth();

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} accessibilityLabel={t.common.loading} />
      </View>
    );
  }
  if (state.status === 'unreachable') {
    return (
      <View style={styles.centered}>
        <Notice>{errorMessage(state.error)}</Notice>
        <Button title={t.common.retry} onPress={retry} />
        <Button title={t.common.signOut} variant="link" onPress={() => void signOut()} />
      </View>
    );
  }

  const signedIn = state.status === 'signedIn';
  const verified = signedIn && state.user.identity_status === 'verified';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !verified}>
        <Stack.Screen name="identity" />
      </Stack.Protected>
      <Stack.Protected guard={verified}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="clubs/[clubId]" />
        <Stack.Screen
          name="rules/[clubId]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="reserve/[clubId]" />
        <Stack.Screen name="seats/[clubId]" />
        <Stack.Screen name="bookings/index" />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="pcs/[pcId]" />
        <Stack.Screen name="bookings/[bookingId]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.outer}>
        <View style={styles.frame}>
          {fontsLoaded || fontError ? (
            <AuthProvider>
              <Navigator />
            </AuthProvider>
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.text} />
            </View>
          )}
          {introDone ? null : <Intro onDone={() => setIntroDone(true)} />}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
  /** A phone-sized column, so the web preview does not stretch the design. */
  frame: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
});
