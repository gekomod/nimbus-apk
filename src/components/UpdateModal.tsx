import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { C, FONTS } from '../tokens';

interface Props {
  visible: boolean;
  version: string;
  notes?: string;
  url: string;
  onClose: () => void;
}

export default function UpdateModal({ visible, version, notes, url, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Text style={s.icon}>⬆</Text>
          </View>
          <Text style={s.title}>Dostępna aktualizacja</Text>
          <Text style={s.subtitle}>Nowa wersja <Text style={{ color: C.accent, fontFamily: FONTS.bold }}>{version}</Text> jest gotowa do pobrania</Text>

          {notes ? (
            <ScrollView style={s.notesBox} showsVerticalScrollIndicator={false}>
              <Text style={s.notesText}>{notes}</Text>
            </ScrollView>
          ) : null}

          <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.85}>
            <Text style={s.primaryTxt}>Pobierz aktualizację</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.secondaryTxt}>Później</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(1,4,7,0.8)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 360, borderRadius: 18, padding: 22,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderHi,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: 'rgba(0,194,233,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  icon: { fontSize: 22, color: C.accent },
  title: { fontSize: 18, fontFamily: FONTS.bold, color: C.text, marginBottom: 6 },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular, color: C.textSub, lineHeight: 19, marginBottom: 16 },
  notesBox: {
    maxHeight: 130, padding: 12, borderRadius: 10, marginBottom: 18,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  notesText: { fontSize: 12, fontFamily: FONTS.mono, color: C.textMute, lineHeight: 18 },
  primaryBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginBottom: 8, backgroundColor: C.accent },
  primaryTxt: { fontSize: 14, fontFamily: FONTS.bold, color: C.bg },
  secondaryBtn: { paddingVertical: 11, alignItems: 'center' },
  secondaryTxt: { fontSize: 13, fontFamily: FONTS.medium, color: C.textMute },
});
