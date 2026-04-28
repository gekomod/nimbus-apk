import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Spinner from './Spinner';
import { C, FONTS } from '../tokens';

type Variant = 'primary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
}

const STYLES: Record<Variant, { bg: string; color: string; border?: string; shadow?: string }> = {
  primary: { bg: C.accent,  color: C.bg,    shadow: undefined },
  ghost:   { bg: 'transparent', color: C.accent, border: '#1a3d55' },
  danger:  { bg: C.redBg,  color: C.red,   border: 'rgba(241,77,76,0.3)' },
};

export default function Btn({ label, onPress, loading, disabled, variant = 'primary' }: Props) {
  const s = STYLES[variant];
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      style={[
        styles.btn,
        {
          backgroundColor: inactive && variant === 'primary' ? C.borderHi : s.bg,
          borderWidth: s.border ? 1.5 : 0,
          borderColor: s.border,
        },
      ]}
    >
      {loading ? (
        <View style={styles.row}>
          <Spinner size={16} color={C.bg} />
          <Text style={[styles.label, { color: C.textMute }]}>Łączenie…</Text>
        </View>
      ) : (
        <Text style={[styles.label, { color: inactive && variant === 'primary' ? C.textMute : s.color }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
