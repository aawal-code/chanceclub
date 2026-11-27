import React from 'react';
import { Text as NativeText } from 'react-native';

// Private-use glyphs from the Material Community icon set, subsetted for Chance Club.
const GLYPHS = {
  'account-circle-outline': 985941,
  'account-group-outline': 985944,
  'account-question-outline': 985946,
  'account-star-outline': 986088,
  'chart-donut': 985007,
  'check-bold': 986654,
  'check-circle-outline': 984545,
  'chevron-left': 983361,
  'chevron-right': 983362,
  'circle-slice-4': 985761,
  'compare-horizontal': 988306,
  creation: 984692,
  'crown-outline': 987600,
  'dice-multiple-outline': 987478,
  'drama-masks': 986370,
  'eye-off-outline': 984785,
  'eye-outline': 984784,
  'gamepad-variant-outline': 986807,
  'gesture-tap': 984897,
  'home-variant-outline': 986023,
  'lightbulb-outline': 983862,
  'moon-waning-crescent': 986981,
  numeric: 983968,
  'party-popper': 987222,
  play: 984074,
  refresh: 984144,
  'star-four-points': 985826,
  'timer-outline': 984347,
  translate: 984522,
  'trophy-outline': 984378,
  'tune-variant': 988482,
  'view-grid-outline': 987609,
  'white-balance-sunny': 984488,
} as const;

export type IconName = keyof typeof GLYPHS;

type Props = { name: IconName; size?: number; color: string };

export default function ChanceIcon({ name, size = 20, color }: Props) {
  return (
    <NativeText
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      allowFontScaling={false}
      style={{ fontFamily: 'ChanceClubIcons', fontSize: size, lineHeight: size + 4, color, textAlign: 'center' }}
    >
      {String.fromCodePoint(GLYPHS[name])}
    </NativeText>
  );
}
