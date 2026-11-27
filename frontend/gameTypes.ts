import type { IconName } from './ChanceIcon';

export type Game = {
  id: string;
  title: string;
  ar: string;
  icon: IconName;
  tag: string;
  tagAr: string;
  color: string;
};

export type GamePalette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  soft: string;
};
