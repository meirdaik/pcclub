import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/** Calls `callback` every `intervalMs` while the screen is focused: how live data stays live. */
export function usePoll(callback: () => void, intervalMs: number): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => latest.current(), intervalMs);
      return () => clearInterval(timer);
    }, [intervalMs]),
  );
}
