import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, Linking, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { C, FONTS } from '../tokens';
import { NbIcon } from './ui';

interface Props {
  visible: boolean;
  version: string;
  notes?: string;
  url: string;
  onClose: () => void;
}

function ChangelogLine({ text }: { text: string }) {
  const isHeader = text.startsWith('#');
  const isBullet = text.startsWith('-') || text.startsWith('*');
  if (isHeader) {
    return (
      <Text style={s.clHeader}>{text.replace(/^#+\s*/, '')}</Text>
    );
  }
  if (isBullet) {
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        <Text style={s.clBulletDot}>·</Text>
        <Text style={s.clBulletText}>{text.replace(/^[-*]\s*/, '')}</Text>
      </View>
    );
  }
  if (!text.trim()) return <View style={{ height: 6 }} />;
  return <Text style={s.clText}>{text}</Text>;
}

export default function UpdateModal({ visible, version, notes, url, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
    ]).start();

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(badgePulse, { toValue: 1.12, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(badgePulse, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    loop.start();
    return () => { loop.stop(); fadeAnim.setValue(0); slideAnim.setValue(60); };
  }, [visible]);

  const lines = (notes ?? '').split('\n');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }] }]}>

          {/* top badge */}
          <View style={s.topRow}>
            <Animated.View style={[s.iconWrap, { transform: [{ scale: badgePulse }] }]}>
              <NbIcon name="arrow_up" size={26} color={C.accent} stroke={2.4} />
            </Animated.View>
            <View style={s.badgeNew}>
              <View style={[s.badgeDot, { backgroundColor: C.ok }]} />
              <Text style={s.badgeText}>NOWA WERSJA</Text>
            </View>
          </View>

          {/* title */}
          <Text style={s.title}>Dostępna aktualizacja</Text>
          <View style={s.versionRow}>
            <NbIcon name="zap" size={14} color={C.textFaint} />
            <Text style={s.versionText}>
              Wersja{' '}
              <Text style={{ color: C.accent, fontFamily: FONTS.monobold }}>v{version}</Text>
              {' '}jest gotowa do pobrania
            </Text>
          </View>

          {/* divider */}
          <View style={s.divider} />

          {/* changelog */}
          {notes && notes.trim().length > 0 ? (
            <>
              <View style={s.clHeader2Row}>
                <NbIcon name="file" size={14} color={C.textFaint} />
                <Text style={s.clLabel}>Co nowego</Text>
              </View>
              <ScrollView style={s.notesBox} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {lines.map((line, i) => <ChangelogLine key={i} text={line} />)}
              </ScrollView>
            </>
          ) : (
            <View style={s.noNotes}>
              <NbIcon name="alert" size={16} color={C.textFaint} />
              <Text style={s.noNotesText}>Sprawdź GitHub po szczegóły tej wersji</Text>
            </View>
          )}

          {/* actions */}
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.85}>
            <NbIcon name="download" size={18} color={C.bg} stroke={2.5} />
            <Text style={s.primaryTxt}>Pobierz teraz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.secondaryTxt}>Przypomnij mi później</Text>
          </TouchableOpacity>

          {/* bottom hint */}
          <View style={s.hintRow}>
            <NbIcon name="shield_check" size={12} color={C.textFaint} />
            <Text style={s.hintText}>Bezpieczne pobieranie z GitHub Releases</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(1,4,7,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderHi,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(59,158,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.okDim,
    borderWidth: 1,
    borderColor: 'rgba(45,212,167,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: {
    fontFamily: FONTS.monobold,
    fontSize: 10.5,
    color: C.ok,
    letterSpacing: 0.8,
  },

  title: {
    fontFamily: FONTS.extrabold,
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  versionText: {
    fontFamily: FONTS.regular,
    fontSize: 13.5,
    color: C.textDim,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 18,
  },

  clHeader2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  clLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: C.textFaint,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  notesBox: {
    maxHeight: 150,
    backgroundColor: C.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 18,
  },
  clHeader: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: C.text,
    marginTop: 8,
    marginBottom: 4,
  },
  clBulletDot: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: C.accent,
    lineHeight: 20,
    marginTop: 1,
  },
  clBulletText: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: C.textDim,
    lineHeight: 19,
    flex: 1,
  },
  clText: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: C.textDim,
    lineHeight: 19,
    marginBottom: 3,
  },

  noNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: C.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },
  noNotesText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: C.textFaint,
    flex: 1,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: C.accent,
    marginBottom: 10,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryTxt: {
    fontFamily: FONTS.bold,
    fontSize: 15.5,
    color: C.bg,
  },

  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  secondaryTxt: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: C.textDim,
  },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  hintText: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: C.textFaint,
  },
});
