import React from 'react';
import { StyleSheet } from 'react-native';
import { useAuiState } from '@assistant-ui/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { getNoshRevealLength } from './noshStreaming';

const REVEAL_INTERVAL_MS = 24;
const FINISH_AFTER_MS = 192;

export function NoshStreamingText({ text }: { text: string }) {
  const isRunning = useAuiState((state) => state.message.status?.type === 'running');
  const reduceMotion = useReducedMotion();
  const hasStreamed = React.useRef(isRunning);
  const isRunningRef = React.useRef(isRunning);
  const finishingStartedAt = React.useRef<number | null>(null);
  const targetText = React.useRef(text);
  const revealTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleLength = React.useRef(isRunning && !reduceMotion ? 0 : text.length);
  const [visibleText, setVisibleText] = React.useState(() => (
    isRunning && !reduceMotion ? '' : text
  ));

  const stopReveal = React.useCallback(() => {
    if (revealTimer.current === null) return;
    clearInterval(revealTimer.current);
    revealTimer.current = null;
  }, []);

  const startReveal = React.useCallback(() => {
    if (revealTimer.current !== null) return;
    revealTimer.current = setInterval(() => {
      const target = targetText.current;
      if (visibleLength.current >= target.length) {
        stopReveal();
        return;
      }
      const finishing = !isRunningRef.current;
      const nextLength = finishing
        && finishingStartedAt.current !== null
        && Date.now() - finishingStartedAt.current >= FINISH_AFTER_MS
        ? target.length
        : getNoshRevealLength(visibleLength.current, target.length, finishing);
      visibleLength.current = nextLength;
      setVisibleText(target.slice(0, nextLength));
    }, REVEAL_INTERVAL_MS);
  }, [stopReveal]);

  React.useEffect(() => {
    const currentText = targetText.current.slice(0, visibleLength.current);
    const isAppendOnly = text.startsWith(currentText);
    targetText.current = text;
    isRunningRef.current = isRunning;
    if (isRunning) {
      hasStreamed.current = true;
      finishingStartedAt.current = null;
    } else if (hasStreamed.current && finishingStartedAt.current === null) {
      finishingStartedAt.current = Date.now();
    }
    if (reduceMotion || !isAppendOnly || (!isRunning && !hasStreamed.current)) {
      stopReveal();
      visibleLength.current = text.length;
      setVisibleText(text);
    } else if (visibleLength.current < text.length) {
      startReveal();
    }
  }, [isRunning, reduceMotion, startReveal, stopReveal, text]);

  React.useEffect(() => {
    return stopReveal;
  }, [stopReveal]);

  return <Text style={styles.text}>{visibleText}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    fontFamily: Fonts.ui.regular,
  },
});
