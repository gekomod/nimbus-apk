import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, Dimensions, SafeAreaView, StyleSheet, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

import WelcomeScreen  from './src/screens/WelcomeScreen';
import ServerScreen   from './src/screens/ServerScreen';
import LoginScreen    from './src/screens/LoginScreen';
import SuccessScreen  from './src/screens/SuccessScreen';
import HomeScreen     from './src/screens/HomeScreen';
import { loadSettings, saveSettings, clearSettings } from './src/storage';
import { C } from './src/tokens';

SplashScreen.preventAutoHideAsync();

const { width: W } = Dimensions.get('window');
type UserData = Record<string, string> | null;

export default function App() {
  const [step, setStep]         = useState(0);
  const [serverUrl, setSrv]     = useState('http://192.168.1.100:5000');
  const [savedUsername, setSaved] = useState('');
  const [userData, setData]     = useState<UserData>(null);
  const [settingsLoaded, setLoaded] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Load saved server URL + username on startup
  useEffect(() => {
    loadSettings().then(({ serverUrl: url, username }) => {
      if (url) {
        setSrv(url);
        setSaved(username);
        setStep(2); // skip welcome + server screens, go straight to login
      }
      setLoaded(true);
    });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && settingsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded, settingsLoaded]);

  function goTo(next: number) {
    const dir = next > step ? 1 : -1;
    slideAnim.setValue(dir * W);
    setStep(next);
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }).start();
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 1) { goTo(0); return true; }
      if (step === 2) { goTo(step === 2 && savedUsername ? 0 : 1); return true; }
      return false;
    });
    return () => sub.remove();
  }, [step, savedUsername]);

  if (!fontsLoaded || !settingsLoaded) return null;

  function renderScreen() {
    switch (step) {
      case 0: return <WelcomeScreen onNext={() => goTo(1)} />;
      case 1: return (
        <ServerScreen
          onNext={() => goTo(2)} onBack={() => goTo(0)}
          serverUrl={serverUrl} setServerUrl={setSrv}
        />
      );
      case 2: return (
        <LoginScreen
          onBack={() => { savedUsername ? goTo(0) : goTo(1); }}
          onSuccess={d => {
            setData(d);
            saveSettings(serverUrl, d.username || savedUsername);
            goTo(3);
          }}
          serverUrl={serverUrl}
          savedUsername={savedUsername}
        />
      );
      case 3: return (
        <SuccessScreen
          serverUrl={serverUrl} userData={userData}
          onContinue={() => goTo(4)}
        />
      );
      case 4: return (
        <HomeScreen
          serverUrl={serverUrl} userData={userData}
          onLogout={() => {
            clearSettings();
            setData(null);
            setSaved('');
            goTo(0);
          }}
        />
      );
      default: return null;
    }
  }

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style="light" backgroundColor={C.bg} />
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.slide, { transform: [{ translateX: slideAnim }] }]} key={step}>
          {renderScreen()}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1, backgroundColor: C.bg },
  slide: { flex: 1 },
});
