import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { useReducedMotion } from './motion';
import { gradient } from './theme';

const GROUND = '#0A0A10';
/** The "CL" mark in a 1024 box: a C with a dot in its mouth, and an L. */
const C_PATH = 'M460 425 A128 128 0 1 0 460 597';
const L_PATH = 'M621 384 V640 H788';
const DASH = 720;

/** The logo drawn as strokes, so it can draw itself in and change colour. */
function Mark({ stroke, offset, width }: { stroke: string; offset: number; width: number }) {
  return (
    <Svg width={width} height={(width * 340) / 640} viewBox="190 340 640 340">
      <Defs>
        <SvgGradient id="clutch" gradientUnits="userSpaceOnUse" x1="205" y1="0" x2="820" y2="0">
          <Stop offset="0" stopColor="#C9BBFF" />
          <Stop offset="0.5" stopColor={gradient.colors[0]} />
          <Stop offset="1" stopColor="#3BB8FF" />
        </SvgGradient>
      </Defs>
      <Path
        d={C_PATH}
        stroke={stroke}
        strokeWidth={64}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[DASH, DASH]}
        strokeDashoffset={offset}
      />
      <Circle cx={441} cy={511} r={29} fill="#FFFFFF" />
      <Path
        d={L_PATH}
        stroke={stroke}
        strokeWidth={64}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={[DASH, DASH]}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

/**
 * The opening animation, in the spirit of a native app launch: on a dark screen the white logo
 * scales in and draws itself, turns to the brand gradient, then a diagonal band of the gradient
 * sweeps across and fills the screen, which dissolves into the app. The app underneath is
 * already loading. Tap to skip. Under Reduce Motion it does not play.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [rootOpacity] = useState(() => new Animated.Value(1));
  const [markOpacity] = useState(() => new Animated.Value(0));
  const [markScale] = useState(() => new Animated.Value(0.85));
  const [punch] = useState(() => new Animated.Value(1));
  const [draw] = useState(() => new Animated.Value(0));
  // The stroke is drawn by re-rendering with a shrinking dash offset (a plain Path keeps the web quiet).
  const [offset, setOffset] = useState(DASH);
  useEffect(() => {
    const id = draw.addListener(({ value }) => setOffset(DASH * (1 - value)));
    return () => draw.removeListener(id);
  }, [draw]);
  const [tint] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));
  const running = useRef<Animated.CompositeAnimation | null>(null);
  // The parent re-renders while the animation plays; it must not restart it.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (reduced) {
      done.current();
      return;
    }
    const run = Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(markScale, {
          toValue: 1,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(draw, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(200),
      Animated.timing(tint, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(punch, {
          toValue: 1.6,
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rootOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]);
    running.current = run;
    run.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => run.stop();
  }, [reduced, rootOpacity, markOpacity, markScale, draw, tint, sweep, punch]);

  const skip = () => {
    running.current?.stop();
    Animated.timing(rootOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => done.current());
  };

  const markWidth = Math.min(width * 0.52, 230);
  const band = width + height * 0.9;

  return (
    <Animated.View style={[styles.root, { opacity: rootOpacity }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={skip} style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Animated.View
            style={{
              opacity: markOpacity,
              transform: [{ scale: Animated.multiply(markScale, punch) }],
            }}
          >
            <Mark stroke="#FFFFFF" offset={offset} width={markWidth} />
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: tint }]}>
              <Mark stroke="url(#clutch)" offset={offset} width={markWidth} />
            </Animated.View>
          </Animated.View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -height * 0.1,
            left: -height * 0.45,
            width: band,
            height: height * 1.2,
            transform: [
              { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [band, 0] }) },
              { skewX: '-18deg' },
            ],
          }}
        >
          <LinearGradient
            colors={gradient.colors}
            locations={gradient.locations}
            start={gradient.start}
            end={gradient.end}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: GROUND, zIndex: 10, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
