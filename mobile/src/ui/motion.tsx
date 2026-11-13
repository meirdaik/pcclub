import { type ReactNode, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Whether the phone asks for less motion; every animation here switches off when it does. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/** Content that eases in: it fades up from a short distance, once, when it first appears. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  /** Stagger, in milliseconds, for lists. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduced, delay, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type PressableScaleProps = PressableProps & {
  /** How far it shrinks while held (1 = not at all). */
  scaleTo?: number;
  /** Style of the wrapper that scales, for layout such as `flex: 1`. */
  wrapperStyle?: StyleProp<ViewStyle>;
};

/** A Pressable that gives a little under the finger and springs back, like iOS controls. */
export function PressableScale({
  scaleTo = 0.97,
  wrapperStyle,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const spring = (value: number) => {
    if (reduced) return;
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  return (
    <Animated.View style={[wrapperStyle, { transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        style={style}
        onPressIn={(event) => {
          spring(scaleTo);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          spring(1);
          onPressOut?.(event);
        }}
      />
    </Animated.View>
  );
}
