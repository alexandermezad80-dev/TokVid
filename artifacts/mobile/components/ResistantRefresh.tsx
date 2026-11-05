import React, {forwardRef, useCallback, useEffect, useMemo, useRef} from 'react';
import {ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, View, type FlatListProps, type ScrollViewProps, type NativeScrollEvent, type NativeSyntheticEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import PullRefreshUnderHeader from './PullRefreshUnderHeader';
import {OWN_PROFILE_PULL as tuning, profilePullDistance, profilePullIntent, profilePullOffset} from '../lib/features/profile/ownProfilePull';

type RefreshProps = {onRefresh: () => void | Promise<void>; refreshing: boolean; enabled?: boolean; color?: string; holdDistance?: number};
type ScrollListener = ScrollViewProps['onScroll'];
const IDLE = 0, PULLING = 1, LOADING = 2, RETURNING = 3;

/** The approved profile gesture, applied to existing lists without nesting a
 * second scroll controller. Layout, list virtualization and callbacks stay with
 * their screen. No native RefreshControl competes with the custom Android pull. */
function RefreshSurface({onRefresh, refreshing, enabled = true, color = '#4B7194', holdDistance = 60, onScroll, renderScroll}: RefreshProps & {
  onScroll?: ScrollListener; renderScroll: (listener: ScrollListener) => React.ReactNode;
}) {
  if (Platform.OS !== 'android') return <LegacySurface {...{onRefresh, refreshing, enabled, color, holdDistance, onScroll, renderScroll}}/>;
  return <NativeSurface {...{onRefresh, refreshing, enabled, color, holdDistance, onScroll, renderScroll}}/>;
}
function LegacySurface({onRefresh, refreshing, enabled, color, holdDistance, onScroll, renderScroll}: RefreshProps & {
  onScroll?: ScrollListener; renderScroll: (listener: ScrollListener) => React.ReactNode;
}) {
  const offset = useRef(0);
  return <PullRefreshUnderHeader scrollOffsetRef={offset} {...{onRefresh, refreshing, enabled, color, holdDistance}} holdWhileRefreshing>
    {renderScroll(event => {offset.current = Math.max(0, event.nativeEvent.contentOffset.y); onScroll?.(event);})}
  </PullRefreshUnderHeader>;
}
function NativeSurface({onRefresh, refreshing, enabled = true, color, holdDistance = 60, onScroll, renderScroll}: RefreshProps & {
  onScroll?: ScrollListener; renderScroll: (listener: ScrollListener) => React.ReactNode;
}) {
  const shift = useSharedValue(0), phase = useSharedValue(IDLE), busy = useSharedValue(refreshing);
  const scrollY = useSharedValue(0), viewport = useSharedValue(0);
  const startX = useSharedValue(0), startY = useSharedValue(0), origin = useSharedValue(0), raw = useSharedValue(0);
  const eligible = useSharedValue(false);
  const permitted = useSharedValue(enabled);
  const mounted = useRef(true), inFlight = useRef(false), callback = useRef(onRefresh);
  callback.current = onRefresh;
  useEffect(() => { permitted.value = enabled; }, [enabled, permitted]);

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
      shift.value = withSpring(Math.min(holdDistance, viewport.value || holdDistance), tuning.spring);
    } else if (!inFlight.current && phase.value === LOADING) {
      returnHome();
    }
  }, [refreshing, busy, phase, shift, viewport, returnHome, holdDistance]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelAnimation(shift); };
  }, [shift]);

  const notifyScroll = useCallback((event: NativeScrollEvent) => {
    onScroll?.({nativeEvent: event} as NativeSyntheticEvent<NativeScrollEvent>);
  }, [onScroll]);
  const handleScroll = useAnimatedScrollHandler(event => {
    scrollY.value = Math.max(0, event.contentOffset.y);
    runOnJS(notifyScroll)(event);
  }, [notifyScroll]);

  const gesture = useMemo(() => {
    const nativeScroll = Gesture.Native().disallowInterruption(false);
    const pull = Gesture.Pan().manualActivation(true).maxPointers(2).averageTouches(true).shouldCancelWhenOutside(false)
      .onTouchesDown((event, manager) => {
        // An added finger must not restart or fail an already active pull.
        if (phase.value === PULLING) return;
        const touch = event.allTouches[0];
        eligible.value = !!touch && event.numberOfTouches >= 1 && event.numberOfTouches <= 2 && !busy.value && permitted.value && scrollY.value <= 1 && viewport.value > 0;
        if (!eligible.value) { manager.fail(); return; }
        startX.value = touch.absoluteX;
        startY.value = touch.absoluteY;
      })
      .onTouchesMove((event, manager) => {
        if (!eligible.value || phase.value === PULLING) return;
        const touch = event.allTouches[0];
        if (!touch || busy.value || !permitted.value) { eligible.value = false; manager.fail(); return; }
        const dy = touch.absoluteY - startY.value;
        const intent = profilePullIntent(touch.absoluteX - startX.value, dy, scrollY.value, event.numberOfTouches);
        if (intent === 'yield') { eligible.value = false; manager.fail(); return; }
        if (intent === 'pull') {
          cancelAnimation(shift);
          raw.value = profilePullDistance(shift.value, viewport.value);
          phase.value = PULLING;
          manager.activate();
        }
      })
      .onStart(event => {
        // RNGH translation remains continuous when the active pointer changes;
        // absoluteY does not. Anchor at activation, including a resumed spring.
        origin.value = raw.value - event.translationY;
      })
      .onUpdate(event => {
        if (phase.value !== PULLING) return;
        raw.value = Math.max(0, origin.value + event.translationY);
        shift.value = profilePullOffset(raw.value, viewport.value);
      })
      .onEnd((_event, success) => {
        eligible.value = false;
        if (phase.value !== PULLING) return;
        if (success && raw.value >= tuning.triggerDistance && !busy.value && permitted.value) {
          busy.value = true;
          phase.value = LOADING;
          shift.value = withSpring(Math.min(holdDistance, viewport.value), tuning.spring);
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
  }, [busy, permitted, eligible, origin, phase, raw, refreshOnce, returnHome, scrollY, shift, startX, startY, viewport, holdDistance]);

  const moving = useAnimatedStyle(() => ({transform: [{translateY: shift.value}]}));
  const indicator = useAnimatedStyle(() => ({opacity: Math.min(1, Math.max(0, shift.value / 44))}));
  return <View testID="resistant-refresh-clip" style={styles.clip}
    onLayout={event => {viewport.value = Math.max(0, event.nativeEvent.layout.height);}}>
    <Animated.View pointerEvents="none" style={[styles.indicator, indicator]}><ActivityIndicator size="small" color={color}/></Animated.View>
    <Animated.View testID="resistant-refresh-moving" style={[styles.moving, moving]}>
      <GestureDetector gesture={gesture}>{renderScroll(handleScroll)}</GestureDetector>
    </Animated.View>
  </View>;
}

type ListProps<T> = Omit<FlatListProps<T>, 'onRefresh' | 'refreshing' | 'refreshControl' | 'CellRendererComponent'> & RefreshProps;
function RefreshList<T>({onRefresh, refreshing, enabled, color, holdDistance, onScroll, ...props}: ListProps<T>, ref: React.ForwardedRef<FlatList<T>>) {
  return <RefreshSurface {...{onRefresh, refreshing, enabled, color, holdDistance, onScroll}}
    renderScroll={listener => <Animated.FlatList<T> {...props} ref={ref} onScroll={listener} scrollEventThrottle={props.scrollEventThrottle ?? 16} refreshControl={undefined}/>}/>;
}
export const ResistantFlatList = forwardRef(RefreshList) as <T>(props: ListProps<T> & {ref?: React.Ref<FlatList<T>>}) => React.ReactElement;

type ScrollProps = Omit<ScrollViewProps, 'refreshControl'> & RefreshProps;
export const ResistantScrollView = forwardRef<ScrollView, ScrollProps>(function RefreshScroll({onRefresh, refreshing, enabled, color, holdDistance, onScroll, ...props}, ref) {
  const forwardScrollRef = useCallback((view: React.ElementRef<typeof Animated.ScrollView> | null) => {
    if (typeof ref === 'function') ref(view);
    else if (ref) ref.current = view;
  }, [ref]);
  return <RefreshSurface {...{onRefresh, refreshing, enabled, color, holdDistance, onScroll}}
    renderScroll={listener => <Animated.ScrollView {...props} ref={forwardScrollRef} onScroll={listener} scrollEventThrottle={props.scrollEventThrottle ?? 16} refreshControl={undefined}/>}/>;
});
const styles = StyleSheet.create({
  clip: {flex: 1, minHeight: 0, overflow: 'hidden'},
  moving: {flex: 1, minHeight: 0},
  indicator: {position: 'absolute', top: 8, left: 0, right: 0, height: 40, alignItems: 'center', justifyContent: 'center'},
});
