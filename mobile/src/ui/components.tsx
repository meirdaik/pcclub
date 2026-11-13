import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage, t } from '@/i18n';

import { ArrowLeft, ArrowRight, Hatch } from './icons';
import { GUTTER, colors, fonts, gradient, radius } from './theme';
import { PressableScale as Pressable } from './motion';
import { T } from './type';

/**
 * Page frame: top safe area, scrolling content and an optional fixed action bar at the bottom.
 * Screens inside the tab bar pass `inTabs`, because the tab bar already covers the bottom inset.
 * Pressing the active tab again scrolls the page back to the top.
 */
export function Screen({
  children,
  scroll = true,
  footer,
  inTabs = false,
  refreshing = false,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  inTabs?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollViewInstance>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const target = navigation as unknown as {
      addListener?: (event: string, callback: () => void) => () => void;
    };
    return target.addListener?.('tabPress', () => ref.current?.scrollTo({ y: 0, animated: true }));
  }, [navigation]);

  const top = Math.max(insets.top, Platform.OS === 'web' ? 12 : 0);
  const bottom = inTabs ? 16 : Math.max(insets.bottom, 24);
  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <LinearGradient colors={gradient.wash} style={styles.wash} pointerEvents="none" />
      {scroll ? (
        <ScrollView
          ref={ref}
          style={styles.flex}
          contentContainerStyle={[{ paddingBottom: footer ? 16 : bottom }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.text}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: bottom }]}>{footer}</View> : null}
    </View>
  );
}

/** Top row of a pushed screen: a "back" link on the left and a small status on the right. */
export function Header({
  back,
  onBack,
  right,
}: {
  back?: string;
  onBack?: () => void;
  right?: string;
}) {
  const router = useRouter();
  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.common.back}: ${back}`}
          onPress={goBack}
          style={styles.back}
        >
          <ArrowLeft />
          <T v="eyebrow" color={colors.text} style={{ fontSize: 12 }}>
            {back}
          </T>
        </Pressable>
      ) : (
        <View />
      )}
      {right ? <T v="eyebrow">{right}</T> : null}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  disabled?: boolean;
  loading?: boolean;
  /** Spoken name when the title is only a symbol. */
  accessibilityLabel?: string;
  /** Primary only: the arrow at the right edge. */
  arrow?: boolean;
  /** Primary only: mono text at the right edge, e.g. the price. */
  right?: string;
  /** Primary only: colour behind the ticket notches, i.e. the background the button sits on. */
  notchColor?: string;
};

/**
 * The main action is the gradient "ticket" button with punched notches. Secondary actions are
 * outlined. There is one gradient button per screen.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityLabel,
  arrow = false,
  right,
}: ButtonProps) {
  const inactive = !!(disabled || loading);
  const state = { disabled: inactive, busy: !!loading };

  if (variant === 'link') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={state}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <T v="eyebrow" color={inactive ? colors.muted : colors.text} style={{ fontSize: 12 }}>
          {title}
        </T>
      </Pressable>
    );
  }

  if (variant === 'secondary' || variant === 'danger') {
    const edge = variant === 'danger' ? colors.danger : colors.accent;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={state}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.outline,
          { borderColor: inactive ? colors.lineStrong : edge },
          pressed && { backgroundColor: colors.selected },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <T
            v="label"
            color={inactive ? colors.muted : variant === 'danger' ? colors.danger : colors.text}
          >
            {title}
          </T>
        )}
      </Pressable>
    );
  }

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={inactive ? colors.muted : colors.onGradient} />
      ) : (
        <T v="label" color={inactive ? colors.muted : colors.onGradient}>
          {title}
        </T>
      )}
      <View style={styles.rightSlot}>
        {right ? (
          <T v="mono14" color={inactive ? colors.muted : colors.onGradient}>
            {right}
          </T>
        ) : null}
        {arrow && !inactive ? <ArrowRight color={colors.onGradient} /> : null}
      </View>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={state}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {inactive ? (
        <View style={[styles.primary, { backgroundColor: colors.selected }]}>{content}</View>
      ) : (
        <LinearGradient
          colors={gradient.colors}
          locations={gradient.locations}
          start={gradient.start}
          end={gradient.end}
          style={styles.primary}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string | null };

export function Field({ label, error, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <T v="eyebrow">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { borderColor: error ? colors.danger : colors.line },
          style,
        ]}
        {...input}
      />
      {error ? <T v="body" color={colors.danger}>{error}</T> : null}
    </View>
  );
}

type NoticeProps = { tone?: 'error' | 'success' | 'warning' | 'info'; children: ReactNode };

/** A hairline box with one sentence. Errors are red; everything else is ink. */
export function Notice({ tone = 'error', children }: NoticeProps) {
  const isError = tone === 'error';
  return (
    <View
      accessibilityRole={isError ? 'alert' : undefined}
      style={[styles.notice, { borderColor: isError ? colors.danger : colors.lineStrong }]}
    >
      <T v="body" color={isError ? colors.danger : colors.text}>
        {children}
      </T>
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  sublabel?: string;
};

/** Small mono filter chip: filled ink when selected. */
export function Chip({ label, sublabel, selected, disabled, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[
        styles.chip,
        selected ? styles.chipOn : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <T v="eyebrow" color={selected ? colors.onGradient : colors.text}>
        {label}
      </T>
      {sublabel ? (
        <T v="meta" color={selected ? colors.onGradient : colors.muted}>
          {sublabel}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Loading / error / content switch for a screen's main request. */
export function Loadable<T2>({
  state,
  children,
}: {
  state: { data: T2 | null; error: unknown; loading: boolean; reload: () => void };
  children: (data: T2) => ReactNode;
}) {
  if (state.data !== null) return <>{children(state.data)}</>;
  if (state.error) {
    return (
      <View style={styles.centered}>
        <Notice>{errorMessage(state.error)}</Notice>
        <Button title={t.common.retry} variant="secondary" onPress={state.reload} />
      </View>
    );
  }
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.text} accessibilityLabel={t.common.loading} />
    </View>
  );
}

/** `LEFT ......... RIGHT` section label above a list. */
export function SectionLabel({
  left,
  right,
  top = 24,
}: {
  left: string;
  right?: string;
  top?: number;
}) {
  return (
    <View style={[styles.sectionLabel, { paddingTop: top }]}>
      <T v="label" style={{ fontSize: 20, lineHeight: 26 }}>
        {left}
      </T>
      {right ? <T v="eyebrow">{right}</T> : null}
    </View>
  );
}

type TagTone = 'accent' | 'plain' | 'hatched';

/** Tiny outlined label: NEAREST, PAID, FULL, 18+ ONLY. */
export function Tag({ label, tone = 'plain' }: { label: string; tone?: TagTone }) {
  return (
    <View
      style={[
        styles.tag,
        tone === 'accent' && { borderColor: colors.accent },
        tone === 'plain' && { borderColor: colors.muted },
        tone === 'hatched' && { borderColor: colors.muted, borderStyle: 'dashed' },
      ]}
    >
      {tone === 'hatched' ? <Hatch /> : null}
      <T v="meta" color={tone === 'accent' ? colors.accent : colors.text} style={styles.tagText}>
        {label}
      </T>
    </View>
  );
}

/** A dashed hairline. Native dashed borders only draw on all four sides, so this crops one. */
export function DashedLine({ color = colors.lineStrong }: { color?: string }) {
  return (
    <View style={{ height: 1, overflow: 'hidden' }}>
      <View style={{ height: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: color }} />
    </View>
  );
}

/** The tear line between the two halves of a ticket, with a punched half-circle on each side. */
export function Perforation({
  background = colors.background,
  edge = colors.lineStrong,
  inset = 16,
}: {
  background?: string;
  edge?: string;
  inset?: number;
}) {
  const hole = { backgroundColor: background, borderColor: edge };
  return (
    <View style={styles.perforation} pointerEvents="none">
      <View style={[styles.hole, hole, { left: -9 }]} />
      <View style={[styles.hole, hole, { right: -9 }]} />
      <View style={{ position: 'absolute', left: inset, right: inset, top: 7 }}>
        <DashedLine color={edge} />
      </View>
    </View>
  );
}

/** Outer frame of a ticket stub. */
export function TicketFrame({
  children,
  dashed = false,
  surface = true,
}: {
  children: ReactNode;
  dashed?: boolean;
  surface?: boolean;
}) {
  return (
    <View
      style={[
        styles.ticket,
        surface && !dashed ? { backgroundColor: colors.surface } : null,
        { borderColor: dashed ? colors.muted : colors.lineStrong },
        dashed ? { borderStyle: 'dashed' } : null,
      ]}
    >
      {children}
    </View>
  );
}

/** A thin strip: one square per seat, filled when in use, outlined when free. */
export function Strip({ total, free }: { total: number; free: number }) {
  const cap = 48;
  const scale = total > cap ? cap / total : 1;
  const count = Math.max(1, Math.round(total * scale));
  const freeCount = Math.min(count, Math.round(free * scale));
  return (
    <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={i < count - freeCount ? styles.stripUsed : styles.stripFree} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  /** The brand colour fading into the page, behind the top of every screen. */
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  header: {
    height: 44,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.8 },
  primary: {
    height: 52,
    paddingHorizontal: GUTTER,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  notch: {
    position: 'absolute',
    top: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rightSlot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outline: {
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GUTTER,
  },
  link: { height: 44, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 8 },
  input: {
    height: 52,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  notice: {
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  centered: { paddingVertical: 24, paddingHorizontal: GUTTER, gap: 12 },
  sectionLabel: {
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    height: 20,
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  tagText: { lineHeight: 14 },
  perforation: { height: 16 },
  hole: {
    position: 'absolute',
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  ticket: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  strip: { flexDirection: 'row', gap: 2, flexShrink: 1, flexWrap: 'wrap' },
  stripUsed: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.used },
  stripFree: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.accent },
});
