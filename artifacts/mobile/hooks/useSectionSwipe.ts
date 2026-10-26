import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Animated, Easing, PanResponder} from 'react-native';
import {createSectionSnap} from '../lib/features/gestures/sectionSnap';

/** Used only by the own-profile sections and the two Inbox sections. */
export function useSectionSwipe<T extends string>(sections: readonly T[], active: T,
  width: number, onSelect: (section: T) => void, accepts: (dx: number, dy: number) => boolean) {
  const position = useRef(new Animated.Value(sections.indexOf(active))).current;
  const [preview, setPreview] = useState<T>(active);
  const [moving, setMoving] = useState(false);
  const current = useRef({sections, active, width, onSelect, accepts});
  current.current = {sections, active, width, onSelect, accepts};
  const snap = useRef<ReturnType<typeof createSectionSnap> | null>(null);
  const controller = () => snap.current ?? (snap.current = make());
  // Create on mount as well as on a StrictMode effect replay.
  const make = () => createSectionSnap({
    width: () => current.current.width,
    last: () => current.current.sections.length - 1,
    stop: read => position.stopAnimation(read),
    set: value => position.setValue(value),
    animate: (toValue, duration, done) => Animated.timing(position, {
      toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(({finished}) => done(finished)),
    moving: setMoving,
    commit: index => current.current.onSelect(current.current.sections[index]),
  });
  if (!snap.current) snap.current = make();
  useLayoutEffect(() => {
    // Tab taps and route-driven selection always override an unfinished swipe.
    controller().select(sections.indexOf(active));
    setPreview(active);
  }, [active, width]);
  useEffect(() => {
    const listener = position.addListener(({value}) => {
      const items = current.current.sections;
      const next = items[Math.max(0, Math.min(items.length - 1, Math.round(value)))];
      setPreview(previous => previous === next ? previous : next);
    });
    return () => {
      position.removeListener(listener);
      controller().dispose();
      snap.current = null;
    };
  }, [position]);
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, g) => (g.numberActiveTouches ?? 1) === 1 && current.current.accepts(g.dx, g.dy),
    onMoveShouldSetPanResponderCapture: (_event, g) => (g.numberActiveTouches ?? 1) === 1 && current.current.accepts(g.dx, g.dy),
    onPanResponderGrant: () => controller().grant(),
    onPanResponderMove: (_event, g) => controller().move(g.dx),
    onPanResponderRelease: (_event, g) => controller().release(g.dx, g.vx ?? 0),
    onPanResponderTerminate: () => controller().cancel(current.current.sections.indexOf(current.current.active)),
    onPanResponderTerminationRequest: () => false,
  })).current;
  const select = (section: T) => {
    // Even tapping the already-selected tab must cancel a pending swipe.
    controller().select(current.current.sections.indexOf(section));
    setPreview(section);
    current.current.onSelect(section);
  };
  return {position, preview, moving, responder, select};
}
