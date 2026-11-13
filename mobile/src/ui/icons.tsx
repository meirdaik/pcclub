import { StyleSheet } from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { colors } from './theme';

type IconProps = { color?: string };

export function ArrowRight({ color = colors.text }: IconProps) {
  return (
    <Svg width={16} height={10} viewBox="0 0 16 10" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M0 5h15M10.5 1l4.5 4-4.5 4" />
    </Svg>
  );
}

export function ArrowLeft({ color = colors.text }: IconProps) {
  return (
    <Svg width={16} height={10} viewBox="0 0 16 10" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M16 5H1M5.5 1L1 5l4.5 4" />
    </Svg>
  );
}

export function Check({ color = colors.text }: IconProps) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M1.5 6.5l3 3 6-7.5" />
    </Svg>
  );
}

export function Lock({ color = colors.muted }: IconProps) {
  return (
    <Svg width={12} height={14} viewBox="0 0 12 14" fill="none" stroke={color} strokeWidth={1.5}>
      <Rect x={1.25} y={6.25} width={9.5} height={7} />
      <Path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" />
    </Svg>
  );
}

export function Search({ color = colors.muted }: IconProps) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M12.25 7a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0ZM11 11l4 4" />
    </Svg>
  );
}

/**
 * Diagonal hatching that fills its parent: the "not available" texture of the design (booked
 * seats, full clubs, locked packages, the empty entry-code box).
 */
export function Hatch({ color = colors.hatch }: IconProps) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern
          id="hatch"
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <Line x1={0} y1={0} x2={0} y2={6} stroke={color} strokeWidth={1.5} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hatch)" />
    </Svg>
  );
}
