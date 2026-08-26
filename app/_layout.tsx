import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { fontSources } from '../src/theme/tokens';

import { useKitchenMemoryStore } from '../src/state/store';
import { lightColors, darkColors } from '../src/theme/colors';

// Desktop affordances react-native-web doesn't provide on its own:
// a visible keyboard-focus ring and pointer cursors on interactive roles.
const WEB_DESKTOP_CSS = `
  [role="button"], [role="checkbox"], [role="tab"], [role="link"] { cursor: pointer; }
  [role="button"]:focus-visible, [role="checkbox"]:focus-visible, [role="tab"]:focus-visible,
  [role="link"]:focus-visible, [role="radio"]:focus-visible, input:focus-visible {
    outline: 3px solid #30E084;
    outline-offset: 2px;
  }
`;

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hasHydrated = useKitchenMemoryStore((s) => s.hasHydrated);
  const scheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);
  // Brand typography must be resident before the first frame renders.
  const [fontsLoaded, fontsError] = useFonts(fontSources);

  useEffect(() => {
    if (hasHydrated && (fontsLoaded || fontsError)) {
      setAppReady(true);
    }
  }, [hasHydrated, fontsLoaded, fontsError]);

  // Two windows on the same household must not clobber each other's writes:
  // when another tab persists (including clearing the key), rehydrate so this
  // tab converges instead of serving stale data. A null newValue means the
  // key was removed elsewhere; zustand treats that as "no stored state" and
  // this tab simply keeps its current in-memory state until its next write.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'kitchen-memory-storage') {
        useKitchenMemoryStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) return null;

  const colors = scheme === 'dark' ? darkColors : lightColors;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Both palettes are dark — light-status-bar icons are correct in
              either scheme; the old scheme coupling produced dark-on-dark. */}
          <StatusBar style="light" />
          {Platform.OS === 'web' ? <style>{WEB_DESKTOP_CSS}</style> : null}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
