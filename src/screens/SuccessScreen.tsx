import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Btn from '../components/Btn';
import GridBg from '../components/GridBg';
import { C, FONTS } from '../tokens';

interface Props {
  serverUrl: string;
  userData: Record<string, string> | null;
  onContinue: () => void;
}

export default function SuccessScreen({ serverUrl, userData, onContinue }: Props) {
  const display = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const rows: [string, string, boolean][] = [
    ['Serwer',      display,                          true ],
    ['Użytkownik',  userData?.username || 'admin',    false],
    ...(userData?.token
      ? [['Token', userData.token.slice(0, 16) + '…', true] as [string, string, boolean]]
      : []),
  ];

  return (
    <View style={styles.root}>
      <GridBg />

      {/* Glow blob */}
      <View style={styles.blob} pointerEvents="none" />

      <View style={styles.center}>
        <View style={styles.checkWrap}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.heading}>Połączono!</Text>
        <Text style={styles.sub}>Pomyślnie zalogowano do serwera NAS</Text>

        <View style={styles.card}>
          {rows.map(([k, v, mono]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.rowKey}>{k}</Text>
              <Text style={[styles.rowVal, mono && { fontFamily: FONTS.mono }]}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Btn label="Otwórz panel →" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  blob: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    marginLeft: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(49,170,64,0.07)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  checkWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: C.greenBg,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkMark: {
    fontSize: 38,
    color: C.green,
    lineHeight: 44,
  },
  heading: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: C.text,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: 28,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  card: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
  },
  rowKey: {
    fontSize: 12,
    color: C.textMute,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: FONTS.semibold,
  },
  rowVal: {
    fontSize: 12,
    color: C.textSub,
    fontFamily: FONTS.regular,
    maxWidth: '60%',
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
