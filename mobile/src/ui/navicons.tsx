import { Image, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, gradient } from './theme';

/**
 * The Clutch mark (the short logo), the transparent version, drawn straight onto the page. The
 * artwork is a square with the letters in the middle, so the picture is enlarged and cropped to
 * a box that just fits the letters. `size` is the height of the letter "C".
 */
export function Logo({ size = 40 }: { size?: number }) {
  // The letters take about 60% of the picture's width and 31% of its height.
  const picture = (size / 0.31) * 0.95;
  const boxWidth = picture * 0.62;
  const boxHeight = size * 1.15;
  return (
    <View style={{ width: boxWidth, height: boxHeight, overflow: 'hidden' }}>
      <Image
        source={require('../../assets/clutch-logo-transparent.png')}
        resizeMode="contain"
        accessibilityLabel="Clutch"
        style={{
          position: 'absolute',
          width: picture,
          height: picture,
          left: (boxWidth - picture) / 2,
          top: (boxHeight - picture) / 2,
        }}
      />
    </View>
  );
}

export type IconName =
  | 'club'
  | 'search'
  | 'wallet'
  | 'menu'
  | 'qr'
  | 'chevronDown'
  | 'chevronRight'
  | 'close'
  | 'info'
  | 'pin'
  | 'locate'
  | 'user'
  | 'promo'
  | 'bookmark'
  | 'review'
  | 'gear'
  | 'doc'
  | 'plus'
  | 'minus';

const PATHS: Record<IconName, string[]> = {
  club: ['M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M9 21h6M12 17v4', 'M8.5 10.2l2.5 2.5 4.5-5'],
  search: ['M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z', 'M16 16l4.5 4.5'],
  wallet: ['M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z', 'M3 9.5V6.5A2 2 0 0 1 5 4.5h11', 'M16.5 13.5h.01'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  qr: ['M4 4h6v6H4Z', 'M14 4h6v6h-6Z', 'M4 14h6v6H4Z', 'M14 14h3v3h-3Z', 'M20 14v3', 'M17 20h3'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronRight: ['M9 6l6 6-6 6'],
  close: ['M5 5l14 14', 'M19 5L5 19'],
  info: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z', 'M12 11v6', 'M12 7.5h.01'],
  pin: ['M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z', 'M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z'],
  locate: ['M20 4L4 10.5l6.5 2.5L13 20.5Z'],
  user: ['M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z', 'M4 20c0-3.8 3.6-6 8-6s8 2.2 8 6'],
  promo: ['M5 7h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9a2 2 0 0 1 2-2Z', 'M9.5 14.5l5-5'],
  bookmark: ['M7 4h10v16l-5-4-5 4Z'],
  review: ['M4 5h16v11H10l-4 4v-4H4Z', 'M8.5 10.5h.01', 'M12 10.5h.01', 'M15.5 10.5h.01'],
  gear: ['M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z', 'M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3', 'M5.6 5.6l2.1 2.1', 'M16.3 16.3l2.1 2.1', 'M18.4 5.6l-2.1 2.1', 'M7.7 16.3l-2.1 2.1'],
  doc: ['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
};

const STAR = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z';

/** Five stars; the rounded value is filled with the brand gradient, the rest are outlines. */
export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? 'url(#sg)' : 'none'} stroke={i < full ? 'none' : colors.lineStrong} strokeWidth={1.5}>
          <Defs>
            <LinearGradient id="sg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
              <Stop offset="0" stopColor={gradient.colors[0]} />
              <Stop offset="0.6" stopColor={gradient.colors[1]} />
              <Stop offset="1" stopColor={gradient.colors[2]} />
            </LinearGradient>
          </Defs>
          <Path d={STAR} />
        </Svg>
      ))}
    </View>
  );
}

/** Line icon. `filled` strokes it with the purple-to-blue gradient instead of a flat colour. */
export function Icon({
  name,
  size = 24,
  color = colors.text,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={filled ? 'url(#ig)' : color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {filled ? (
        <Defs>
          <LinearGradient id="ig" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
            <Stop offset="0" stopColor={gradient.colors[0]} />
            <Stop offset="0.6" stopColor={gradient.colors[1]} />
            <Stop offset="1" stopColor={gradient.colors[2]} />
          </LinearGradient>
        </Defs>
      ) : null}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
