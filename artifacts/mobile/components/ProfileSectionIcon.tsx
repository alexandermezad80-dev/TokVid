import React from 'react';
import Svg, {Path} from 'react-native-svg';
import TokvidProfileIcon from './TokvidProfileIcon';
import type {OwnProfileTab} from '../lib/features/profile/ownProfileSwipe';

/** Profile-strip artwork from 6iconos-tokvid-completos.zip. Reuse the four
 * existing TOKVID vectors; only Me gusta and Guardados need new artwork. */
export default function ProfileSectionIcon({name, size = 22, color}: {
  name: OwnProfileTab; size?: number; color: string;
}) {
  if (name === 'liked') return <Svg width={size} height={size} viewBox="0 0 36 36" fill={color}>
    <Path d="M17.3 30.2 C11.2 24.6 3.2 19.6 3.2 12.4 C3.2 7.9 6.4 5 10 5 C13.4 5 16.2 7.6 17.4 13.2 C15.9 10.4 13.4 8.4 10.7 8.4 C8.2 8.4 6.4 10.2 6.4 12.6 C6.4 17 12 21 17.3 30.2 Z"/>
    <Path d="M18.7 30.2C24.8 24.6 32.8 19.6 32.8 12.4C32.8 7.9 29.6 5 26 5C22.6 5 19.8 7.6 18.6 13.2C20.1 10.4 22.6 8.4 25.3 8.4C27.8 8.4 29.6 10.2 29.6 12.6C29.6 17 24 21 18.7 30.2Z"/>
  </Svg>;
  if (name === 'saved') return <Svg width={size} height={size} viewBox="0 0 36 36"
    fill="none" stroke={color} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round">
    <Path d="M7 32 V7 Q7 4 10 4 H24 L31 11 V32 L19 25.1 Q18 24.5 17 25.1 Z"/>
    <Path d="M24 4 V10 Q24 11 25.5 11 H31"/>
  </Svg>;
  return <TokvidProfileIcon name={name} size={size} color={color}/>;
}
