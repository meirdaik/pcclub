import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentType, ReactNode } from 'react';
import { Platform, type StyleProp, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { gradient, type TypeName, type } from './theme';

/** The library's typings predate React 19's JSX rules, so the component is typed here. */
const Masked = MaskedView as unknown as ComponentType<{
  style?: object;
  maskElement: ReactNode;
  children: ReactNode;
}>;

type TProps = TextProps & { v?: TypeName; color?: string };

const DISPLAY: ReadonlySet<TypeName> = new Set(['hero', 'num', 'title', 'head', 'wordmark', 'zone']);

/** Display type needs a line box of at least 1.2x its size, whatever a screen asks for. */
function roomy(v: TypeName, style: StyleProp<TextStyle>): TextStyle | undefined {
  if (!DISPLAY.has(v)) return undefined;
  const flat = StyleSheet.flatten([type[v], style]) ?? {};
  const size = flat.fontSize ?? 0;
  return (flat.lineHeight ?? 0) < size * 1.2 ? { lineHeight: Math.ceil(size * 1.2) } : undefined;
}

/** Text in one of the design's type styles. */
export function T({ v = 'body', color, style, ...rest }: TProps) {
  return <Text {...rest} style={[type[v], color ? { color } : null, style, roomy(v, style)]} />;
}

/**
 * Text filled with the purple-to-blue gradient. Use it for ONE key number per screen.
 * On the web the gradient is clipped to the glyphs with CSS; on phones a mask does it.
 */
export function GradientText({
  children,
  v = 'head',
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: {
  children: ReactNode;
  v?: TypeName;
  style?: TextStyle;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}) {
  const textStyle = [type[v], style, roomy(v, style)];
  if (Platform.OS === 'web') {
    const clip = {
      backgroundImage: gradient.css,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      alignSelf: style?.alignSelf ?? 'flex-start',
    } as unknown as TextStyle;
    return (
      <Text
        style={[textStyle, clip]}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
      >
        {children}
      </Text>
    );
  }
  return (
    <Masked
      style={{ alignSelf: style?.alignSelf ?? 'flex-start' }}
      maskElement={
        <Text style={[textStyle, { color: '#000' }]} numberOfLines={numberOfLines}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={gradient.colors}
        locations={gradient.locations}
        start={gradient.start}
        end={gradient.end}
      >
        <Text style={[textStyle, { opacity: 0 }]} numberOfLines={numberOfLines}>
          {children}
        </Text>
      </LinearGradient>
    </Masked>
  );
}
