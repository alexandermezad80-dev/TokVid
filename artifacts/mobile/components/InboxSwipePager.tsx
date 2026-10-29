import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {runOnJS, runOnUI, scrollTo, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue} from 'react-native-reanimated';
import type {InboxSection} from '../lib/features/messages/inboxSwipe';

const SECTIONS: readonly InboxSection[] = ['activity', 'messages'];
const IDLE = 0, DRAGGING = 1, SETTLING = 2;
const indexOf = (section: InboxSection) => section === 'messages' ? 1 : 0;

export type InboxSwipePagerHandle = {select: (section: InboxSection) => void};
type Props = {
  active: InboxSection;
  width: number;
  position: SharedValue<number>;
  moving: boolean;
  enabled?: boolean;
  onSelect: (section: InboxSection) => void;
  onPreview: (section: InboxSection) => void;
  onMoving: (moving: boolean) => void;
  renderPage: (section: InboxSection) => React.ReactNode;
};

// Keep the last active rows while they leave the viewport, as in the approved pager.
function PageContent({active, children}: {active: boolean; children: React.ReactNode}) {
  const snapshot = useRef<{content: React.ReactNode} | null>(null);
  useLayoutEffect(() => {if (active) snapshot.current = {content: children};}, [active, children]);
  return <>{active || !snapshot.current ? children : snapshot.current.content}</>;
}

/** Inbox only. Native horizontal scrolling owns drag, inertia and page snapping;
 * its UI-thread offset drives the marker, without JS writes on every touch move. */
const InboxSwipePager = forwardRef<InboxSwipePagerHandle, Props>(function InboxSwipePager({
  active, width, position, moving, enabled = true, onSelect, onPreview, onMoving, renderPage,
}, ref) {
  const scrollRef = useAnimatedRef<React.ElementRef<typeof Animated.ScrollView>>();
  const pageWidth = useSharedValue(Math.max(1, width));
  const phase = useSharedValue(IDLE), generation = useSharedValue(0);
  const previewIndex = useSharedValue(indexOf(active));
  const mounted = useRef(true), reportedIndex = useRef(indexOf(active)), previousWidth = useRef(0);
  const callbacks = useRef({onSelect, onPreview, onMoving});
  callbacks.current = {onSelect, onPreview, onMoving};

  const notifyMoving = useCallback((ticket: number) => {
    if (mounted.current && ticket === generation.value) callbacks.current.onMoving(true);
  }, [generation]);
  const notifyPreview = useCallback((index: number, ticket: number) => {
    if (mounted.current && ticket === generation.value) callbacks.current.onPreview(SECTIONS[index]);
  }, [generation]);
  const notifySettled = useCallback((index: number, ticket: number) => {
    if (!mounted.current || ticket !== generation.value) return;
    reportedIndex.current = index;
    callbacks.current.onSelect(SECTIONS[index]);
    callbacks.current.onPreview(SECTIONS[index]);
    callbacks.current.onMoving(false);
  }, [generation]);

  const place = useCallback((index: number) => {
    // A tap/route/resize invalidates queued native completions, even for the same tab.
    generation.value += 1;
    phase.value = IDLE;
    pageWidth.value = Math.max(1, width);
    position.value = index;
    previewIndex.value = index;
    runOnUI((target: number, nextWidth: number) => {
      'worklet';
      scrollTo(scrollRef, target * nextWidth, 0, false);
    })(index, Math.max(1, width));
  }, [generation, phase, pageWidth, position, previewIndex, scrollRef, width]);

  useImperativeHandle(ref, () => ({select(section) {
    const index = indexOf(section);
    place(index);
    reportedIndex.current = index;
    callbacks.current.onSelect(section);
    callbacks.current.onPreview(section);
    callbacks.current.onMoving(false);
  }}), [place]);

  useLayoutEffect(() => {
    const index = indexOf(active);
    if (previousWidth.current !== width || reportedIndex.current !== index || !enabled) {
      place(index);
      reportedIndex.current = index;
      callbacks.current.onPreview(active);
      callbacks.current.onMoving(false);
    }
    previousWidth.current = width;
  }, [active, width, enabled, place]);

  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; generation.value += 1; phase.value = IDLE;};
  }, [generation, phase]);

  const finish = useCallback((offset: number) => {
    'worklet';
    const index = Math.max(0, Math.min(1, Math.round(offset / pageWidth.value)));
    phase.value = IDLE;
    position.value = index;
    previewIndex.value = index;
    // Fractional pixels/cancelled native momentum must not leave a half page.
    if (Math.abs(offset - index * pageWidth.value) > 0.5) scrollTo(scrollRef, index * pageWidth.value, 0, false);
    runOnJS(notifySettled)(index, generation.value);
  }, [pageWidth, phase, position, previewIndex, scrollRef, notifySettled, generation]);

  const handleScroll = useAnimatedScrollHandler({
    onBeginDrag: event => {
      generation.value += 1;
      phase.value = DRAGGING;
      position.value = Math.max(0, Math.min(1, event.contentOffset.x / pageWidth.value));
      runOnJS(notifyMoving)(generation.value);
    },
    onScroll: event => {
      // Ignore late events from momentum cancelled by a manual selection.
      if (phase.value === IDLE) return;
      position.value = Math.max(0, Math.min(1, event.contentOffset.x / pageWidth.value));
      const index = Math.round(position.value);
      if (index !== previewIndex.value) {
        previewIndex.value = index;
        runOnJS(notifyPreview)(index, generation.value);
      }
    },
    onEndDrag: event => {
      if (phase.value !== DRAGGING) return;
      phase.value = SETTLING;
      const offset = event.contentOffset.x, nearest = Math.round(offset / pageWidth.value) * pageWidth.value;
      // Native paging normally completes in onMomentumEnd. A stationary release
      // already on a page needs no momentum event to restore its interactions.
      if (event.velocity && Math.abs(event.velocity.x) < 0.01 && Math.abs(offset - nearest) <= 0.5) finish(offset);
    },
    onMomentumEnd: event => {
      if (phase.value === SETTLING) finish(event.contentOffset.x);
    },
  }, [pageWidth, phase, position, previewIndex, generation, notifyMoving, notifyPreview, finish]);

  return <Animated.ScrollView ref={scrollRef} testID="inbox-native-pager" style={styles.fill}
    contentContainerStyle={styles.row} horizontal pagingEnabled snapToInterval={Math.max(1, width)}
    snapToAlignment="start" decelerationRate="normal" nestedScrollEnabled directionalLockEnabled
    bounces={false} overScrollMode="never" showsHorizontalScrollIndicator={false}
    scrollEnabled={enabled} scrollEventThrottle={16} onScroll={handleScroll}
    onLayout={() => runOnUI(() => {
      'worklet';
      // Layout may arrive before the JS selection callback. Keep the UI's actual
      // settled page; never replace it with an older rendered active prop.
      if (phase.value === IDLE) scrollTo(scrollRef, position.value * pageWidth.value, 0, false);
    })()}>
    {SECTIONS.map(section => <View key={section} testID={`inbox-page-${section}`} style={[styles.page, {width}]}
      pointerEvents={!moving && section === active ? 'auto' : 'none'}
      accessibilityElementsHidden={section !== active} importantForAccessibility={section === active ? 'auto' : 'no-hide-descendants'}>
      <PageContent active={section === active}>{renderPage(section)}</PageContent>
    </View>)}
  </Animated.ScrollView>;
});
export default InboxSwipePager;

/** Same approved 97 × 2 dp turquoise marker. At rest selection is authoritative,
 * so delayed native offset events cannot strand it under the previous tab. */
export function InboxSwipeIndicator({position, tabWidth, selectedIndex, moving}: {
  position: SharedValue<number>; tabWidth: number; selectedIndex: number; moving: boolean;
}) {
  const motion = useAnimatedStyle(() => ({transform: [{translateX: position.value * tabWidth}]}));
  const geometry = {left: (tabWidth - 97) / 2};
  return moving
    ? <Animated.View pointerEvents="none" style={[styles.indicator, geometry, motion]}/>
    : <View pointerEvents="none" style={[styles.indicator, geometry, {transform: [{translateX: selectedIndex * tabWidth}]}]}/>;
}

const styles = StyleSheet.create({
  fill: {flex: 1, minHeight: 0},
  row: {height: '100%'},
  page: {height: '100%'},
  indicator: {position: 'absolute', bottom: 0, width: 97, height: 2, backgroundColor: '#25F4EE'},
});
