import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { initApi, apiCheckAuth } from './src/api';
import { C, applyAccent, setLang } from './src/tokens';

SplashScreen.preventAutoHideAsync();

function AppInner() {
  const [phase, setPhase]     = useState<'login' | 'app'>('login');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.10');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [apiToken, setApiToken]   = useState('');
  const [settingsLoaded, setLoaded] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  // themeKey forces a full re-render of HomeScreen when theme changes
  const [themeKey, setThemeKey] = useState(0);

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
    (async () => {
      // Load app settings (accent color, language) before first render
      try {
        const saved = await AsyncStorage.getItem('nimbus_settings');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.accentColor) applyAccent(s.accentColor);
          if (s.lang) setLang(s.lang as any);
        }
      } catch {}

      // Load server/auth settings
      const { serverUrl: url, username: u, password: p } = await loadSettings();
      if (url) setServerUrl(url);
      if (u)   setUsername(u);
      if (p)   setPassword(p);
      if (url) {
        const base = url.startsWith('http') ? url : 'http://' + url;
        initApi(base);
        apiCheckAuth()
          .then(res => {
            if (res.authenticated) {
              setServerUrl(base);
              setUsername(res.username ?? u ?? '');
              setPhase('app');
            }
          })
          .catch(() => {})
          .finally(() => setLoaded(true));
      } else {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    const current = Constants.expoConfig?.version ?? '1.0.0';
    checkForUpdate(current).then(info => { if (info) setUpdateInfo(info); });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && settingsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded, settingsLoaded]);

  if (!fontsLoaded || !settingsLoaded) return null;

  const handleLogin = (srv: string, user: string, pass: string, _token: string) => {
    setServerUrl(srv); setUsername(user); setPassword(pass);
    initApi(srv);
    saveSettings(srv, user, pass);
    setPhase('app');
  };

  const handleLogout = () => {
    clearSettings(); setUsername(''); setPassword(''); setApiToken('');
    setPhase('login');
  };

  // Called from SettingsScreen after theme changes — forces re-render with new C values
  const handleThemeChange = () => setThemeKey(k => k + 1);

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
            key={themeKey}
            serverUrl={serverUrl}
            username={username}
            apiToken={apiToken}
            onLogout={handleLogout}
            onThemeChange={handleThemeChange}
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
