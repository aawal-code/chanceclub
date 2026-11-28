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
  { id: 'wordbomb', modes: ['party'] },
  { id: 'truths', modes: ['party'] },
  { id: 'neverhave', modes: ['party'] },
];

export const soloGames = GAMES.filter((game) => game.modes.includes('solo'));
export const partyGames = GAMES.filter((game) => game.modes.includes('party'));

export function gameById(id: string): GameMeta | undefined {
  return GAMES.find((game) => game.id === id);
}

export type GroupKey = 'gWords' | 'gDraw' | 'gKnow' | 'gParty' | 'gDeciders';

/** Groups say what the player is doing, not what the game is called. Deciders are tools, kept apart. */
export const GAME_GROUPS: { key: GroupKey; ids: string[] }[] = [
  { key: 'gWords', ids: ['wordle', 'wordbomb', 'categories'] },
  { key: 'gDraw', ids: ['draw'] },
  { key: 'gKnow', ids: ['trivia', 'whoami'] },
  { key: 'gParty', ids: ['imposter', 'truths', 'neverhave', 'charades', 'wyr', 'likely'] },
  { key: 'gDeciders', ids: ['wheel', 'coin', 'dice', 'number', 'yesno', 'bracket'] },
];

/** Games that produce a real placement, so the only ones a tournament can score.
    Mirrors App\Support\Tournament::GAMES on the server. */
export const TOURNAMENT_POOL = ['trivia', 'wordle', 'draw', 'categories', 'whoami', 'charades', 'imposter', 'wordbomb', 'truths'];
