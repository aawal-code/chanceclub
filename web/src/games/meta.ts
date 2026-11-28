export type Mode = 'solo' | 'party';

export type GameMeta = {
  id: string;
  modes: Mode[];
};

/** Single source of truth for which games exist and where they can be played. */
export const GAMES: GameMeta[] = [
  { id: 'wordle', modes: ['solo', 'party'] },
  { id: 'dice', modes: ['solo', 'party'] },
  { id: 'coin', modes: ['solo', 'party'] },
  { id: 'wheel', modes: ['solo', 'party'] },
  { id: 'number', modes: ['solo', 'party'] },
  { id: 'yesno', modes: ['solo', 'party'] },
  { id: 'bracket', modes: ['solo', 'party'] },
  { id: 'draw', modes: ['party'] },
  { id: 'trivia', modes: ['party'] },
  { id: 'wyr', modes: ['party'] },
  { id: 'likely', modes: ['party'] },
  { id: 'categories', modes: ['party'] },
  { id: 'charades', modes: ['party'] },
  { id: 'whoami', modes: ['party'] },
  { id: 'imposter', modes: ['party'] },
];

export const soloGames = GAMES.filter((game) => game.modes.includes('solo'));
export const partyGames = GAMES.filter((game) => game.modes.includes('party'));

export function gameById(id: string): GameMeta | undefined {
  return GAMES.find((game) => game.id === id);
}

export const GAME_GROUPS: { key: 'gWords' | 'gFun' | 'gChance'; ids: string[] }[] = [
  { key: 'gWords', ids: ['wordle', 'draw', 'categories', 'charades', 'whoami'] },
  { key: 'gFun', ids: ['trivia', 'wyr', 'likely', 'imposter'] },
  { key: 'gChance', ids: ['dice', 'coin', 'wheel', 'number', 'yesno', 'bracket'] },
];
