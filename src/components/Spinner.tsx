import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../tokens';

interface Props {
  size?: number;
  color?: string;
}

export default function Spinner({ size = 18, color = C.bg }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx="10" cy="10" r="7" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="30 14" />
      </Svg>
    </Animated.View>
  );
}
