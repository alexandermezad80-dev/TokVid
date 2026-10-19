import React, { useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, Text } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { commentEmojiOrder, commentEmojiStripGeometry } from "../lib/commentEmojiOrder";

export default function CommentEmojiStrip({ recent, scale, disabled, onSelect }: {
  recent: string[]; scale: number; disabled: boolean; onSelect: (emoji: string) => void;
}) {
  const desired = useMemo(() => commentEmojiOrder(recent), [recent]);
  const [items, setItems] = useState(desired);
  const pending = useRef(desired), offset = useRef(0), dragging = useRef(false);
  const { pitch, glyph, width } = commentEmojiStripGeometry(scale, items.length);
  useEffect(() => {
    pending.current = desired;
    if (offset.current <= .5 * scale && !dragging.current) setItems(desired);
  }, [desired, scale]);
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = Math.max(0, event.nativeEvent.contentOffset.x);
    dragging.current = false;
    if (offset.current <= .5 * scale) setItems(pending.current);
  };
  return <Animated.FlatList<string> horizontal data={items} keyExtractor={emoji => emoji}
    style={{ width, height: 18 * scale, flexGrow: 0 }}
    initialNumToRender={14} maxToRenderPerBatch={14} windowSize={3}
    showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always"
    snapToInterval={pitch} snapToAlignment="start" decelerationRate="fast" disableIntervalMomentum
    itemLayoutAnimation={LinearTransition.duration(150)}
    getItemLayout={(_data, index) => ({ index, offset: index * pitch, length: index === items.length - 1 ? glyph : pitch })}
    onScroll={event => { offset.current = Math.max(0, event.nativeEvent.contentOffset.x); }} scrollEventThrottle={16}
    onScrollBeginDrag={() => { dragging.current = true; }} onScrollEndDrag={settle} onMomentumScrollEnd={settle}
    renderItem={({ item, index }) => <Animated.View entering={FadeIn.duration(150)} style={{ width: index === items.length - 1 ? glyph : pitch, height: 18 * scale }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Añadir emoji ${item} al comentario`} disabled={disabled}
        onPress={() => onSelect(item)} hitSlop={6 * scale} style={{ width: glyph, height: 18 * scale, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18 * scale, lineHeight: 18 * scale, includeFontPadding: false }}>{item}</Text>
      </Pressable>
    </Animated.View>} />;
}
