import React from 'react';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { C } from '../tokens';

interface Props {
  size?: number;
  color?: string;
}

export default function NasIcon({ size = 48, color = C.accent }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="8" y="12" width="32" height="24" rx="3" stroke={color} strokeWidth="2" />
      <Rect x="12" y="16" width="24" height="6" rx="1.5" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
      <Circle cx="33" cy="19" r="1.5" fill={color} />
      <Rect x="12" y="25" width="24" height="6" rx="1.5" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
      <Circle cx="33" cy="28" r="1.5" fill={color} />
      <Line x1="19" y1="36" x2="29" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="24" y1="36" x2="24" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
