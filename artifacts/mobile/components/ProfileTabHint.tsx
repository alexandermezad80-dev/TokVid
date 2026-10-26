import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';

export type ProfileTabHintHandle = {show: (name: string, index: number) => void};
type Hint = {name: string; index: number; request: number; measuredWidth: number};

/** A measured overlay below the existing 39dp strip. It never occupies layout
 * space or handles touches, and its timers/animation end when the strip leaves. */
const ProfileTabHint = forwardRef<ProfileTabHintHandle, {width: number}>(function ProfileTabHint({width}, ref) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const stop = useCallback(() => {
    if (timer.current !== null) {clearTimeout(timer.current); timer.current = null;}
    opacity.stopAnimation();
  }, [opacity]);

  useImperativeHandle(ref, () => ({show(name, index) {
    stop();
    opacity.setValue(0);
    setHint({name, index, request: ++sequence.current, measuredWidth: 0});
  }}), [opacity, stop]);

  useEffect(() => {
    if (!hint || hint.measuredWidth <= 0) return;
    const request = hint.request;
    Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      Animated.timing(opacity, {toValue: 0, duration: 250, useNativeDriver: true}).start(({finished}) => {
        if (finished) setHint(current => current?.request === request ? null : current);
      });
    }, 1500);
    return stop;
  }, [hint?.request, hint?.measuredWidth, opacity, stop]);
  useEffect(() => stop, [stop]);

  if (!hint) return null;
  const center = (hint.index + 0.5) * width / 6;
  const left = Math.max(6, Math.min(width - hint.measuredWidth - 6, center - hint.measuredWidth / 2));
  return <Animated.View key={hint.request} testID="profile-tab-hint" pointerEvents="none"
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    onLayout={event => {
      const measuredWidth = event.nativeEvent.layout.width;
      setHint(current => current?.request === hint.request && current.measuredWidth !== measuredWidth
        ? {...current, measuredWidth} : current);
    }}
    style={[styles.hint, {left, maxWidth: Math.max(0, width - 12), opacity}]}>
    <Text numberOfLines={1} style={styles.text}>{hint.name}</Text>
  </Animated.View>;
});
export default ProfileTabHint;

const styles = StyleSheet.create({
  hint: {position: 'absolute', top: 45, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: '#F2F4F6', zIndex: 10},
  text: {fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7580'},
});
