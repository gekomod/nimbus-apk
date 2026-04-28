import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { C, FONTS } from '../tokens';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
  mono?: boolean;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}

export default function Field({
  label, value, onChange, type = 'text', placeholder,
  mono = false, error, hint, autoFocus = false,
}: Props) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => ref.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <View style={{ marginBottom: 14 }}>
      {label && (
        <Text style={[styles.label, { color: focused ? C.accent : C.textMute }]}>
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMute}
        secureTextEntry={type === 'password'}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            fontFamily: mono ? FONTS.mono : FONTS.regular,
            fontSize: mono ? 13 : 15,
            backgroundColor: focused ? '#0d1520' : C.surface,
            borderColor: error ? C.red : focused ? C.accent : C.border,
          },
        ]}
      />
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    color: C.text,
  },
  hint: {
    fontSize: 11,
    color: C.textMute,
    marginTop: 4,
    lineHeight: 16,
    fontFamily: FONTS.regular,
  },
  error: {
    fontSize: 11,
    color: C.red,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
});
