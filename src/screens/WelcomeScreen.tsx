import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NasIcon from '../components/NasIcon';
import Btn from '../components/Btn';
import GridBg from '../components/GridBg';
import { C, FONTS } from '../tokens';

const FEATURES = [
  ['🗄️', 'Zarządzanie plikami NAS'],
  ['🔒', 'Szyfrowane połączenie API'],
  ['⚡', 'Szybki dostęp do zasobów'],
] as const;

interface Props {
  onNext: () => void;
}

export default function WelcomeScreen({ onNext }: Props) {
  return (
    <View style={styles.root}>
      <GridBg />

      {/* Glow blob */}
      <View style={styles.blob} pointerEvents="none" />

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <NasIcon size={50} />
        </View>

        <Text style={styles.title}>Nimbus</Text>
        <Text style={styles.subtitle}>NAS Manager</Text>

        <View style={styles.featureList}>
          {FEATURES.map(([icon, text]) => (
            <View key={text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Btn label="Rozpocznij konfigurację" onPress={onNext} />
        <Text style={styles.version}>Nimbus APK v1.0.0</Text>
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
    top: -80,
    left: '50%',
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,194,233,0.08)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.borderHi,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: C.textMute,
    letterSpacing: 1.7,
    fontFamily: FONTS.mono,
    textTransform: 'uppercase',
    marginBottom: 36,
  },
  featureList: {
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.surface,
  },
  featureIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: C.textSub,
    fontFamily: FONTS.medium,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  version: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: C.textMute,
    fontFamily: FONTS.regular,
  },
});
