import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {ActivityIndicator, Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import PullRefreshUnderHeader from './PullRefreshUnderHeader';
import {OWN_PROFILE_PULL as tuning, profilePullDistance, profilePullIntent, profilePullOffset} from '../lib/features/profile/ownProfilePull';

type Props = Omit<ScrollViewProps, 'refreshControl'> & {
  scrollOffsetRef: React.MutableRefObject<number>;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
};
const IDLE = 0, PULLING = 1, LOADING = 2, RETURNING = 3;

/** Owner-only integration. Other platforms keep the pre-B11 implementation;
 * shared refresh components and every other screen remain unchanged. */
export default function OwnProfileMagneticRefresh({scrollOffsetRef, refreshing, onRefresh, ...scrollProps}: Props) {
  if (Platform.OS !== 'android') {
    return <PullRefreshUnderHeader scrollOffsetRef={scrollOffsetRef} refreshing={refreshing} onRefresh={onRefresh}
      holdWhileRefreshing maxPull={156} holdDistance={72}>
      <ScrollView {...scrollProps}/>
    </PullRefreshUnderHeader>;
  }
  return <AndroidProfilePull scrollOffsetRef={scrollOffsetRef} refreshing={refreshing} onRefresh={onRefresh} {...scrollProps}/>;
}

function AndroidProfilePull({scrollOffsetRef, refreshing, onRefresh, children, onScroll, ...scrollProps}: Props) {
  const shift = useSharedValue(0), phase = useSharedValue(IDLE), busy = useSharedValue(refreshing);
  const scrollY = useSharedValue(scrollOffsetRef.current), viewport = useSharedValue(0);
  const startX = useSharedValue(0), startY = useSharedValue(0), origin = useSharedValue(0), raw = useSharedValue(0);
  const eligible = useSharedValue(false);
  const mounted = useRef(true), inFlight = useRef(false), callback = useRef(onRefresh);
  callback.current = onRefresh;

  const returnHome = useCallback(() => {
    'worklet';
    phase.value = RETURNING;
    shift.value = withSpring(0, tuning.spring, finished => {
      if (finished && phase.value === RETURNING) phase.value = IDLE;
    });
  }, [phase, shift]);

  const refreshOnce = useCallback(async () => {
    if (!mounted.current || inFlight.current) return;
    inFlight.current = true;
    try {
      await callback.current();
    } catch {
      // The existing owner callback presents data errors. Always release the UI.
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        busy.value = false;
        returnHome();
      }
    }
  }, [busy, returnHome]);

  useEffect(() => {
    busy.value = refreshing || inFlight.current;
    if (refreshing) {
      phase.value = LOADING;
      cancelAnimation(shift);
      shift.value = withSpring(Math.min(tuning.holdDistance, viewport.value || tuning.holdDistance), tuning.spring);
    } else if (!inFlight.current && phase.value === LOADING) {
      returnHome();
    }
  }, [refreshing, busy, phase, shift, viewport, returnHome]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelAnimation(shift); };
  }, [shift]);

  const notifyScroll = useCallback((event: NativeScrollEvent) => {
    scrollOffsetRef.current = Math.max(0, event.contentOffset.y);
    onScroll?.({nativeEvent: event} as NativeSyntheticEvent<NativeScrollEvent>);
  }, [scrollOffsetRef, onScroll]);
  const handleScroll = useAnimatedScrollHandler(event => {
    scrollY.value = Math.max(0, event.contentOffset.y);
    runOnJS(notifyScroll)(event);
  }, [notifyScroll]);

  const gesture = useMemo(() => {
    const nativeScroll = Gesture.Native().disallowInterruption(false);
    const pull = Gesture.Pan().manualActivation(true).maxPointers(1).shouldCancelWhenOutside(false)
      .onTouchesDown((event, manager) => {
        const touch = event.allTouches[0];
        eligible.value = !!touch && event.numberOfTouches === 1 && !busy.value && scrollY.value <= 1 && viewport.value > 0;
        if (!eligible.value) { manager.fail(); return; }
        startX.value = touch.absoluteX;
        startY.value = touch.absoluteY;
      })
      .onTouchesMove((event, manager) => {
        if (!eligible.value || phase.value === PULLING) return;
        const touch = event.allTouches[0];
        if (!touch || busy.value) { eligible.value = false; manager.fail(); return; }
        const dy = touch.absoluteY - startY.value;
        const intent = profilePullIntent(touch.absoluteX - startX.value, dy, scrollY.value, event.numberOfTouches);
        if (intent === 'yield') { eligible.value = false; manager.fail(); return; }
        if (intent === 'pull') {
          cancelAnimation(shift);
          origin.value = profilePullDistance(shift.value, viewport.value) - dy;
          raw.value = Math.max(0, origin.value + dy);
          phase.value = PULLING;
          manager.activate();
        }
      })
      .onUpdate(event => {
        if (phase.value !== PULLING) return;
        raw.value = Math.max(0, origin.value + event.absoluteY - startY.value);
        shift.value = profilePullOffset(raw.value, viewport.value);
      })
      .onEnd((_event, success) => {
        eligible.value = false;
        if (phase.value !== PULLING) return;
        if (success && raw.value >= tuning.triggerDistance && !busy.value) {
          busy.value = true;
          phase.value = LOADING;
          shift.value = withSpring(Math.min(tuning.holdDistance, viewport.value), tuning.spring);
          runOnJS(refreshOnce)();
        } else returnHome();
      })
      .onFinalize(() => {
        eligible.value = false;
        if (phase.value === PULLING) returnHome();
      });
    // At the top, decide direction before native scroll activates. Once pulling,
    // cancel native scrolling so reversing the finger cannot scroll under the
    // moving indicator. All other directions fail early and keep native scroll
    // and the existing JS horizontal responder available.
    return Gesture.Exclusive(pull, nativeScroll);
  }, [busy, eligible, origin, phase, raw, refreshOnce, returnHome, scrollY, shift, startX, startY, viewport]);

  const moving = useAnimatedStyle(() => ({transform: [{translateY: shift.value}]}));
  return <View testID="own-profile-pull-clip" style={styles.clip}
    onLayout={event => { viewport.value = Math.max(0, event.nativeEvent.layout.height); }}>
    <Animated.View testID="own-profile-pull-moving" style={[styles.moving, moving]}>
      <View testID="own-profile-pull-indicator" pointerEvents="none" style={styles.indicator}>
        <ActivityIndicator size="small" color="#4B7194"/>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.ScrollView {...scrollProps} onScroll={handleScroll} refreshControl={undefined}>
          {children}
        </Animated.ScrollView>
      </GestureDetector>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  clip: {flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: '#FFFFFF'},
  moving: {flex: 1, minHeight: 0},
  indicator: {position: 'absolute', top: -tuning.indicatorHeight - tuning.indicatorGap,
    left: 0, right: 0, height: tuning.indicatorHeight, alignItems: 'center', justifyContent: 'center'},
});
