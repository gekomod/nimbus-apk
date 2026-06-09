import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import UpdateModal from './src/components/UpdateModal';
import { loadSettings, saveSettings, clearSettings } from './src/storage';
import { checkForUpdate, UpdateInfo } from './src/checkUpdate';
import { C } from './src/tokens';

SplashScreen.preventAutoHideAsync();

function AppInner() {
  const [phase, setPhase] = useState<'login' | 'app'>('login');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.10');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [settingsLoaded, setLoaded] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    loadSettings().then(({ serverUrl: url, username: u, password: p }) => {
      if (url) setServerUrl(url);
      if (u) setUsername(u);
      if (p) setPassword(p);
      if (url && u && p) setPhase('app');
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const current = Constants.expoConfig?.version ?? '1.0.0';
    checkForUpdate(current).then(info => { if (info) setUpdateInfo(info); });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && settingsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded, settingsLoaded]);

  if (!fontsLoaded || !settingsLoaded) return null;

  const handleLogin = (srv: string, user: string, pass: string) => {
    setServerUrl(srv); setUsername(user); setPassword(pass);
    saveSettings(srv, user, pass);
    setPhase('app');
  };

  const handleLogout = () => {
    clearSettings(); setUsername(''); setPassword('');
    setPhase('login');
  };

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style="light" backgroundColor={C.bg} translucent={false} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {phase === 'login' ? (
          <LoginScreen
            onSuccess={handleLogin}
            savedServerUrl={serverUrl}
            savedUsername={username}
            savedPassword={password}
          />
        ) : (
          <HomeScreen
            serverUrl={serverUrl}
            userData={{ username }}
            onLogout={handleLogout}
          />
        )}
      </SafeAreaView>

      {updateInfo && (
        <UpdateModal
          visible
          version={updateInfo.version}
          notes={updateInfo.notes}
          url={updateInfo.url}
          onClose={() => setUpdateInfo(null)}
        />
      )}
    </View>
  );
}

export default function App() {
  return <SafeAreaProvider><AppInner /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1, backgroundColor: C.bg },
});
