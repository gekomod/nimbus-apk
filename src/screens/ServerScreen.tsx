import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import Field from '../components/Field';
import Btn from '../components/Btn';
import GridBg from '../components/GridBg';
import Progress from '../components/Progress';
import Spinner from '../components/Spinner';
import { C, FONTS } from '../tokens';

const TEMPLATES = ['192.168.1.1:5000', 'nas.local:5000', '10.0.0.1:8080'];

interface Props {
  onNext: () => void;
  onBack: () => void;
  serverUrl: string;
  setServerUrl: (v: string) => void;
}

export default function ServerScreen({ onNext, onBack, serverUrl, setServerUrl }: Props) {
  const [error, setError]     = useState('');
  const [testing, setTest]    = useState(false);
  const [testResult, setResult] = useState<'ok' | 'fail' | null>(null);

  function validate() {
    if (!serverUrl.trim()) { setError('Podaj adres serwera'); return false; }
    setError('');
    return true;
  }

  async function handleTest() {
    if (!validate()) return;
    setTest(true); setResult(null);
    try {
      const base = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl;
      const url = `${base.replace(/\/+$/, '')}/api/login`;
      const res = await fetch(url, { method: 'GET' });
      // Any HTTP response (even 405) means server is reachable
      setResult(res.status < 500 ? 'ok' : 'fail');
    } catch {
      setResult('fail');
    } finally {
      setTest(false);
    }
  }

  function handleTemplate(addr: string) {
    setServerUrl('http://' + addr);
    setError('');
    setResult(null);
  }

  return (
    <View style={styles.root}>
      <GridBg />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.step}>Krok 1 z 2</Text>
          <Text style={styles.title}>Adres serwera</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <Progress value={1} total={2} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            Podaj adres serwera NAS. Aplikacja użyje endpointu{' '}
            <Text style={styles.infoCode}>/api/login</Text>
            {' '}do autoryzacji.
          </Text>
        </View>

        <Field
          label="Adres serwera"
          value={serverUrl}
          onChange={v => { setServerUrl(v); setError(''); setResult(null); }}
          placeholder="http://192.168.1.100:5000"
          mono
          error={error}
          hint="np. http://192.168.1.100:5000 lub https://nas.local"
          autoFocus
        />

        <Text style={styles.templatesLabel}>Szybkie szablony</Text>
        <View style={styles.templates}>
          {TEMPLATES.map(addr => (
            <TouchableOpacity key={addr} onPress={() => handleTemplate(addr)} style={styles.chip}>
              <Text style={styles.chipText}>{addr}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleTest}
          disabled={testing}
          style={[
            styles.testBtn,
            testResult === 'ok' && styles.testBtnOk,
            testResult === 'fail' && styles.testBtnFail,
          ]}
        >
          {testing ? (
            <View style={styles.row}>
              <Spinner size={15} color="rgba(0,137,171,1)" />
              <Text style={[styles.testLabel, { color: C.accentDim }]}>Testowanie…</Text>
            </View>
          ) : (
            <Text style={[
              styles.testLabel,
              { color: testResult === 'ok' ? C.green : testResult === 'fail' ? C.red : C.accentDim },
            ]}>
              {testResult === 'ok' ? '✓ Serwer osiągalny' : testResult === 'fail' ? '✗ Brak połączenia' : 'Testuj połączenie'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Btn label="Dalej — Logowanie" onPress={() => { if (validate()) onNext(); }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: C.textSub,
    fontSize: 22,
    lineHeight: 26,
  },
  step: {
    fontSize: 10,
    color: C.textMute,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    fontFamily: FONTS.mono,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.bold,
    color: C.text,
  },
  progressWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 18,
  },
  infoBanner: {
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: C.accentBg,
    borderWidth: 1,
    borderColor: 'rgba(0,194,233,0.25)',
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(0,160,200,1)',
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  infoCode: {
    fontFamily: FONTS.mono,
    color: C.accent,
    fontSize: 11,
  },
  templatesLabel: {
    fontSize: 11,
    color: C.textMute,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: FONTS.semibold,
  },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderHi,
  },
  chipText: {
    fontSize: 11,
    color: C.textSub,
    fontFamily: FONTS.mono,
  },
  testBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,137,171,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnOk: {
    borderColor: 'rgba(49,170,64,0.5)',
  },
  testBtnFail: {
    borderColor: 'rgba(241,77,76,0.5)',
  },
  testLabel: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
});
