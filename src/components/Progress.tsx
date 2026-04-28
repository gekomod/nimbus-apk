import React from 'react';
import { View } from 'react-native';
import { C } from '../tokens';

interface Props {
  value: number;
  total: number;
}

export default function Progress({ value, total }: Props) {
  return (
    <View style={{ height: 3, backgroundColor: C.surface, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{
        height: '100%',
        width: `${(value / total) * 100}%`,
        backgroundColor: C.accent,
        borderRadius: 3,
      }} />
    </View>
  );
}
