import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Field from '../components/Field';
import Btn from '../components/Btn';
import GridBg from '../components/GridBg';
import Progress from '../components/Progress';
import { C, FONTS } from '../tokens';

interface Props {
  onBack: () => void;
  onSuccess: (data: Record<string, string>) => void;
  serverUrl: string;
  savedUsername?: string;
}

export default function LoginScreen({ onBack, onSuccess, serverUrl, savedUsername = '' }: Props) {
  const [user, setUser]    = useState(savedUsername);
  const [pass, setPass]    = useState('');
  const [loading, setLoad] = useState(false);
  const [error, setError]  = useState('');

  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  async function doLogin() {
    if (!user.trim() || !pass.trim()) { setError('Wypełnij wszystkie pola'); return; }
    setError(''); setLoad(true);
    try {
      const base = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl;
      const body = new URLSearchParams({ username: user, password: pass }).toString();
      const res = await fetch(`${base.replace(/\/+$/, '')}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess({ ...data, username: user });
      } else {
        setError(data.message || data.error || 'Nieprawidłowe dane logowania');
      }
    } catch {
      setError('Nie można połączyć z serwerem');
    } finally {
      setLoad(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <GridBg />

        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.step}>Krok 2 z 2</Text>
            <Text style={styles.title}>Logowanie</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <Progress value={2} total={2} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>{display}</Text>
          </View>

          <Field label="Nazwa użytkownika" value={user} onChange={setUser} placeholder="admin" autoFocus={!savedUsername} />
          <Field
            label="Hasło"
            value={pass}
            onChange={v => { setPass(v); setError(''); }}
            type="password"
            placeholder="••••••••"
            autoFocus={!!savedUsername}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.endpointBox}>
            <Text style={styles.endpointText}>
              <Text style={{ color: C.accent }}>POST</Text>
              {' '}{display}/api/login{'\n'}
              <Text style={{ color: C.textMute }}>{'application/x-www-form-urlencoded'}</Text>
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Btn label="Zaloguj się" onPress={doLogin} loading={loading} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: C.textSub, fontSize: 22, lineHeight: 26 },
  step: { fontSize: 10, color: C.textMute, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: FONTS.mono },
  title: { fontSize: 19, fontFamily: FONTS.bold, color: C.text },
  progressWrap: { paddingHorizontal: 20, paddingTop: 10 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 18 },
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 8, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  badgeText: { fontSize: 12, fontFamily: FONTS.mono, color: C.textSub },
  errorBox: {
    padding: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10,
    backgroundColor: C.redBg, borderWidth: 1, borderColor: 'rgba(241,77,76,0.4)',
  },
  errorText: { fontSize: 13, color: C.red, fontFamily: FONTS.regular },
  endpointBox: {
    padding: 10, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  endpointText: { fontSize: 11, fontFamily: FONTS.mono, color: C.textMute, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
});
