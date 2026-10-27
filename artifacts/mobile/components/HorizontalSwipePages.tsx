import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

/** Preserve the last active presentation while it slides out. Data hooks still
 * refresh normally when selected; inactive previews cannot fire any action. */
function PageContent({active, children}: {active: boolean; children: React.ReactNode}) {
  const snapshot = useRef<{content: React.ReactNode} | null>(null);
  useLayoutEffect(() => {if (active) snapshot.current = {content: children};}, [active, children]);
  return <>{active || !snapshot.current ? children : snapshot.current.content}</>;
}

/** Each page keeps the same key, container and absolute track coordinate.
 * Never rebase the native animation when the selected section changes. */
export default function HorizontalSwipePages<T extends string>({sections, active, center, position, width,
  renderPage, fill = false, moving = false, minHeight = 0}: {
  sections: readonly T[]; active: T; center: T; position: Animated.Value; width: number;
  renderPage: (page: T) => React.ReactNode; fill?: boolean; moving?: boolean; minHeight?: number;
}) {
  const [measured, setMeasured] = useState<Record<string, {width: number; height: number}>>({});
  const translateX = useMemo(() => Animated.multiply(position, -width), [position, width]);
  const activeIndex = sections.indexOf(active), centerIndex = sections.indexOf(center);
  const height = Math.max(minHeight, ...sections.map((section, index) => {
    const relevant = section === active || (moving && (Math.abs(index - activeIndex) <= 1 || Math.abs(index - centerIndex) <= 1));
    return relevant && measured[section]?.width === width ? measured[section].height : 0;
  }));
  return <View style={[styles.clip, {width}, fill ? styles.fill : {height}]}>
    <Animated.View style={[styles.track, {width: width * sections.length,
      transform: [{translateX}]}]}>
      {sections.map((section, index) => <View key={section}
        pointerEvents={!moving && section === active ? 'auto' : 'none'}
        accessibilityElementsHidden={section !== active} importantForAccessibility={section === active ? 'auto' : 'no-hide-descendants'}
        onLayout={event => {
          if (fill) return;
          const next = event.nativeEvent.layout;
          setMeasured(previous => previous[section]?.width === next.width && previous[section]?.height === next.height
            ? previous : {...previous, [section]: {width: next.width, height: next.height}});
        }}
        style={[styles.page, {left: index * width, width}, fill && styles.fullHeight]}>
        <PageContent active={section === active}>{renderPage(section)}</PageContent>
      </View>)}
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  clip: {overflow: 'hidden'},
  fill: {flex: 1, minHeight: 0},
  track: {position: 'absolute', top: 0, bottom: 0, left: 0},
  page: {position: 'absolute', top: 0},
  fullHeight: {height: '100%'},
});
