import React, {useRef} from 'react';
import {Platform, ScrollView} from 'react-native';
import OwnProfileMagneticRefresh from './OwnProfileMagneticRefresh';
import ProfilePullRefresh from './ProfilePullRefresh';

type Props = Omit<React.ComponentProps<typeof OwnProfileMagneticRefresh>, 'headerSnapHeight' | 'horizontalMoving'>;

/** The visited Android profile uses the already approved native pull controller.
 * Keep one vertical scroll owner and preserve the legacy path on other platforms.
 * Remount per visited user so a previous profile's offset cannot block a new pull. */
export default function VisitedProfileRefresh({scrollOffsetRef, refreshing, onRefresh, children, ...scrollProps}: Props) {
  const nativeOffsetRef = useRef(0);
  if (Platform.OS !== 'android') {
    return <ProfilePullRefresh scrollOffsetRef={scrollOffsetRef} refreshing={refreshing} onRefresh={onRefresh}>
      <ScrollView {...scrollProps}>{children}</ScrollView>
    </ProfilePullRefresh>;
  }
  return <OwnProfileMagneticRefresh {...scrollProps} scrollOffsetRef={nativeOffsetRef}
    refreshing={refreshing} onRefresh={onRefresh}
    onScroll={event => {
      scrollOffsetRef.current = Math.max(0, event.nativeEvent.contentOffset.y);
      scrollProps.onScroll?.(event);
    }}>
    {children}
  </OwnProfileMagneticRefresh>;
}
