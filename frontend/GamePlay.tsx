import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text as NativeText, TextInput, View, useWindowDimensions } from 'react-native';
import ChanceIcon from './ChanceIcon';
import type { Game, GamePalette } from './gameTypes';
import type { IconName } from './ChanceIcon';

const GameTypography = createContext<{ fontFamily: (weight: string) => string | undefined; rtl: boolean }>({ fontFamily: () => undefined, rtl: false });
function Text(props: React.ComponentProps<typeof NativeText>) {
  const { fontFamily, rtl } = useContext(GameTypography);
  const weight = String(StyleSheet.flatten(props.style)?.fontWeight || '400');
  return <NativeText {...props} style={[{ fontFamily: fontFamily(weight), writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }, props.style]} />;
}

type Props = {
  game: Game;
  locale: 'en' | 'ar';
  palette: GamePalette;
  round: number;
  prompt: string;
  answer: string;
  showAnswer: boolean;
  playerNames: string[];
  wheelNames: string;
  diceCount: number;
  numberMax: string;
  reduceMotion: boolean;
  fontFamily: (weight: string) => string | undefined;
  onReveal: () => void;
  onOutcome: (prompt: string, answer: string) => void;
  onNext: () => void;
  onBack: () => void;
  onlineInfo?: OnlineInfo;
  onOnlineAction?: (type: 'answer' | 'vote' | 'roll' | 'point', value?: string, targetPlayerId?: string) => void;
  onOnlineNext?: () => void;
};

type Vote = { voter: string; choice: string };
type OnlineMember = { id: string; name: string; score: number; is_host: boolean; ready: boolean; online: boolean };
type OnlineInfo = { isHost: boolean; selfPlayerId: string | null; turnPlayerId: string | null; status: 'active' | 'complete'; prompt: string; privateClue: string | null; result: { answer?: string; result?: string | number; faces?: number[]; tally?: Record<string, number> } | null; submitted: boolean; submissionCount: number; submissionStatus: { player_id: string; submitted: boolean }[]; scoredPlayerIds: string[]; members: OnlineMember[] };

const COLORS = ['#7661E8', '#EF8C60', '#42A88F', '#D56E94', '#5681D8', '#D6A13D', '#46A879', '#B36AD1'];
const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const randomInt = (max: number) => 1 + Math.floor(Math.random() * max);
const PIPS: Record<number, number[][]> = {
  1: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  2: [[1, 0, 0], [0, 0, 0], [0, 0, 1]],
  3: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  4: [[1, 0, 1], [0, 0, 0], [1, 0, 1]],
  5: [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
  6: [[1, 0, 1], [1, 0, 1], [1, 0, 1]],
};

export default function GamePlay(props: Props) {
  const { game, locale, palette: p, round, prompt, answer, showAnswer, playerNames, wheelNames, diceCount, numberMax, reduceMotion, fontFamily, onReveal, onOutcome, onNext, onBack, onlineInfo, onOnlineAction, onOnlineNext } = props;
  const { width } = useWindowDimensions();
  const rtl = locale === 'ar';
  const wide = width >= 760;
  const ar: Record<string, string> = {
    round: 'الجولة', points: 'النقاط', reveal: 'اكشف الإجابة', hide: 'أخفِ الإجابة', next: 'جولة جديدة', back: 'رجوع',
    roll: 'ارمِ النرد', rollAgain: 'ارمِ مرة أخرى', flip: 'اقلب العملة', spin: 'أدر العجلة', pick: 'اختر رقماً', ask: 'اسأل الحظ',
    categoryHint: 'تناوبوا على ذكر إجابات قبل انتهاء الوقت.', charadesHint: 'مثّلها دون كلام ودع فريقك يخمّن!', turn: 'الدور على', votes: 'الأصوات', vote: 'صوّت',
    result: 'النتيجة', secret: 'اعرض الإشارة لنفسك فقط', showSecret: 'اكشف إشارتك', hideSecret: 'أخفِ الإشارة', timer: 'الوقت', timeUp: 'انتهى الوقت!',
    yourChoice: 'اختر إجابتك', askEveryone: 'كل لاعب يختار إجابة', resultWait: 'بانتظار بقية الأصوات', mostLikely: 'من تختار؟', winner: 'الفائز', ready: 'مستعدون؟',
    keepGoing: 'تابعوا اللعب', correct: 'نقطة لك!', score: 'النتيجة', oneDie: 'نرد واحد', twoDice: 'نردان', submit: 'إرسال خاص', submitted: 'تم إرسال إجابتك بسرية', waiting: 'بانتظار اللاعبين', award: 'أضف نقطة', nextHost: 'الجولة التالية (المضيف)', hostWait: 'بانتظار المضيف', yourTurn: 'دورك', notYourTurn: 'بانتظار دور اللاعب', privateClue: 'إشارتك السرية',
  };
  const en: Record<string, string> = {
    round: 'Round', points: 'Points', reveal: 'Reveal answer', hide: 'Hide answer', next: 'Next round', back: 'Back',
    roll: 'Roll the dice', rollAgain: 'Roll again', flip: 'Flip the coin', spin: 'Spin the wheel', pick: 'Pick a number', ask: 'Ask chance',
    categoryHint: 'Take turns naming answers before the timer runs out.', charadesHint: 'Act it out without a word and let your team guess!', turn: 'Up next', votes: 'Votes', vote: 'Vote',
    result: 'Round result', secret: 'Only peek if you are holding the clue', showSecret: 'Peek at your clue', hideSecret: 'Hide the clue', timer: 'Time', timeUp: 'Time is up!',
    yourChoice: 'Choose your answer', askEveryone: 'Everyone picks a side', resultWait: 'Waiting for the other votes', mostLikely: 'Who gets your vote?', winner: 'Winner', ready: 'Ready?',
    keepGoing: 'Keep it going', correct: 'Point for you!', score: 'Score', oneDie: 'One die', twoDice: 'Two dice', submit: 'Submit privately', submitted: 'Your answer is submitted privately', waiting: 'Waiting for players', award: 'Award 1 point', nextHost: 'Next round (host)', hostWait: 'Waiting for the host', yourTurn: 'Your turn', notYourTurn: 'Waiting for the active player', privateClue: 'Your private clue',
  };
  const words = locale === 'ar' ? ar : en;
  const [seconds, setSeconds] = useState(60);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [votes, setVotes] = useState<Vote[]>([]);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [rollFaces, setRollFaces] = useState<number[]>([]);
  const [actionUsed, setActionUsed] = useState(false);
  const [onlineAnswer, setOnlineAnswer] = useState('');
  const [motion] = useState(() => new Animated.Value(0));
  const [coinMotion] = useState(() => new Animated.Value(0));
  const [numberMotion] = useState(() => new Animated.Value(0));
  const people = useMemo(() => playerNames.length ? playerNames : [rtl ? 'أنت' : 'You'], [playerNames, rtl]);
  const voteChoices = useMemo(() => {
    if (game.id === 'likely') return people;
    if (game.id !== 'wyr') return [];
    const bits = prompt.split(/\s+or\s+|\s+أم\s+/i).map(x => x.trim()).filter(Boolean);
    return bits.length > 1 ? bits.slice(0, 2) : [prompt, rtl ? 'الخيار الآخر' : 'The other option'];
  }, [game.id, people, prompt, rtl]);
  const tally = useMemo(() => votes.reduce<Record<string, number>>((totals, v) => ({ ...totals, [v.choice]: (totals[v.choice] || 0) + 1 }), {}), [votes]);
  const scoreLeader = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const friendlyTitle = game.title;
  const animate = (value: Animated.Value, duration: number, toValue = 1, callback?: () => void) => {
    if (reduceMotion) { value.setValue(toValue); callback?.(); return; }
    value.setValue(0);
    Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => { if (finished) callback?.(); });
  };
  useEffect(() => {
    if (!['categories', 'charades'].includes(game.id) || actionUsed || seconds <= 0) return;
    const id = setInterval(() => setSeconds(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [game.id, round, actionUsed, seconds]);

  const addPoint = (name = people[choiceIndex % people.length]) => setScores(old => ({ ...old, [name]: (old[name] || 0) + 1 }));
  const advance = () => { setSeconds(60); setVotes([]); setChoiceIndex(0); setRolling(false); setRollFaces([]); setActionUsed(false); motion.setValue(0); coinMotion.setValue(0); numberMotion.setValue(0); onNext(); };
  const revealWithPoint = () => { if (!showAnswer) { addPoint(); onReveal(); } };
  const outcome = (result: string, question = prompt) => { onOutcome(question, result); onReveal(); setActionUsed(true); };
  const randomAction = (kind: string) => {
    if (actionUsed && answer) { advance(); return; }
    if (rolling) return;
    setRolling(true);
    if (kind === 'dice') {
      const values = Array.from({ length: diceCount }, () => randomInt(6));
      setRollFaces(values);
      animate(motion, 780, 1, () => { outcome(values.join(' + ') + ' = ' + values.reduce((a, b) => a + b, 0)); setRolling(false); });
    } else if (kind === 'coin') {
      const result = randomFrom(rtl ? ['وجه', 'كتابة'] : ['Heads', 'Tails']);
      animate(coinMotion, 900, 1, () => { outcome(result); setRolling(false); });
    } else if (kind === 'wheel') {
      const names = wheelNames.split(',').map(x => x.trim()).filter(Boolean);
      const winner = randomFrom(names.length ? names : people);
      animate(motion, 1500, 1, () => { outcome(winner); setRolling(false); });
    } else if (kind === 'yesno') {
      const answerOptions = rtl ? ['بالتأكيد نعم!', 'ليس هذه المرة.', 'الحظ يقول نعم.', 'اسأل لاحقاً.', 'لا بكل تأكيد.', 'الأمر محتمل.'] : ['Absolutely yes!', 'Not this time.', 'The odds say yes.', 'Ask again later.', 'A confident no.', 'It could go either way.'];
      animate(motion, 600, 1, () => { outcome(randomFrom(answerOptions)); setRolling(false); });
    } else {
      const max = Math.max(2, Math.min(10000, Number(numberMax) || 100));
      const value = String(randomInt(max));
      animate(numberMotion, 650, 1, () => { outcome(value); setRolling(false); });
    }
  };
  const voteFor = (choice: string) => {
    const voter = people[choiceIndex % people.length];
    setVotes(old => [...old.filter(v => v.voter !== voter), { voter, choice }]);
    setChoiceIndex(i => i + 1);
  };
  const selectPerson = (name: string) => { setVotes(old => [...old, { voter: people[choiceIndex % people.length], choice: name }]); setChoiceIndex(i => i + 1); };
  const randomActionButton = (label: string, kind: string, icon: IconName) => <Pressable accessibilityRole="button" onPress={() => randomAction(kind)} disabled={rolling} style={({ pressed }) => [styles.actionButton, { backgroundColor: p.accent, opacity: rolling ? 0.7 : 1 }, pressed && !reduceMotion && styles.pressed]}><ChanceIcon name={icon} color="#fff" size={19} /><Text style={styles.actionText}>{rolling ? (rtl ? 'لحظة...' : 'One moment…') : label}</Text></Pressable>;
  const die = (value: number, index: number) => <Animated.View key={index} style={[styles.die, { backgroundColor: p.card, borderColor: p.line }, !reduceMotion && { transform: [{ rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] }) }, { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>{(PIPS[value] || PIPS[1]).map((row, r) => <View key={r} style={styles.pipRow}>{row.map((pip, c) => <View key={c} style={[styles.pip, { backgroundColor: pip ? p.accent : 'transparent' }]} />)}</View>)}</Animated.View>;
  const scoreCard = <View style={[styles.scoreStrip, { backgroundColor: p.soft, borderColor: p.line }]}><View style={styles.scoreHeader}><ChanceIcon name="trophy-outline" size={17} color={p.accent} /><Text style={[styles.scoreLabel, { color: p.muted }]}>{words.score}</Text></View><View style={styles.scorePeople}>{people.slice(0, 5).map((name, i) => <View key={`${name}-${i}`} style={[styles.scorePerson, i === choiceIndex % people.length && { borderColor: p.accent, backgroundColor: p.card }]}><Text numberOfLines={1} style={[styles.scoreName, { color: p.text }]}>{name}</Text><Text style={[styles.scoreNumber, { color: p.accent }]}>{scores[name] || 0}</Text></View>)}</View></View>;

  const actionPanel = () => {
    if (game.id === 'categories') {
      return <>
        <Text style={[styles.helper, { color: p.muted }]}>{words.categoryHint}</Text>
        <View style={[styles.timerTrack, { backgroundColor: p.line }]}><View style={[styles.timerFill, { backgroundColor: seconds <= 10 ? '#E76565' : p.accent, width: `${(seconds / 60) * 100}%` }]} /></View>
        <View style={styles.timerRow}><ChanceIcon name="timer-outline" size={18} color={seconds <= 10 ? '#E76565' : p.accent} /><Text style={[styles.timerCount, { color: seconds <= 10 ? '#E76565' : p.accent }]}>{words.timer} · {seconds}s</Text></View>
        {seconds === 0 && <Text style={[styles.resultText, { color: p.accent }]}>{words.timeUp}</Text>}
        <Pressable accessibilityRole="button" onPress={() => { addPoint(); setChoiceIndex(i => i + 1); }} disabled={seconds === 0} style={({ pressed }) => [styles.actionButton, { backgroundColor: p.accent, opacity: seconds === 0 ? 0.6 : 1 }, pressed && !reduceMotion && styles.pressed]}><ChanceIcon name="check-bold" size={18} color="#fff" /><Text style={styles.actionText}>{rtl ? 'وجدنا إجابة!' : 'Got one!'} · +1</Text></Pressable>
      </>;
    }
    if (game.id === 'whoami' || game.id === 'charades') {
      return <>{game.id === 'charades' && <><Text style={[styles.helper, { color: p.muted }]}>{words.charadesHint}</Text><View style={[styles.timerTrack, { backgroundColor: p.line }]}><View style={[styles.timerFill, { backgroundColor: seconds <= 10 ? '#E76565' : p.accent, width: `${(seconds / 60) * 100}%` }]} /></View><View style={styles.timerRow}><ChanceIcon name="timer-outline" size={18} color={seconds <= 10 ? '#E76565' : p.accent} /><Text style={[styles.timerCount, { color: seconds <= 10 ? '#E76565' : p.accent }]}>{words.timer} · {seconds}s</Text></View></>}<Text style={[styles.helper, { color: p.muted }]}>{words.secret}</Text><Pressable accessibilityRole="button" onPress={onReveal} style={[styles.actionButton, { backgroundColor: p.accent }]}><ChanceIcon name={showAnswer ? 'eye-off-outline' : 'eye-outline'} size={18} color="#fff" /><Text style={styles.actionText}>{showAnswer ? words.hideSecret : words.showSecret}</Text></Pressable>{showAnswer && <View style={[styles.revealBadge, { backgroundColor: p.soft }]}><Text style={[styles.resultText, { color: p.accent }]}>{prompt}</Text></View>}</>;
    }
    if (game.id === 'trivia') {
      return <><Text style={[styles.helper, { color: p.muted }]}>{rtl ? `الدور على ${people[choiceIndex % people.length]}` : `${words.turn}: ${people[choiceIndex % people.length]}`}</Text>{!showAnswer ? <Pressable accessibilityRole="button" onPress={revealWithPoint} style={[styles.actionButton, { backgroundColor: p.accent }]}><ChanceIcon name="eye-outline" size={18} color="#fff" /><Text style={styles.actionText}>{words.reveal}</Text></Pressable> : <View style={[styles.revealBadge, { backgroundColor: p.soft }]}><ChanceIcon name="check-circle-outline" size={20} color={p.accent} /><Text style={[styles.resultText, { color: p.accent }]}>{answer}</Text><Text style={[styles.helper, { color: p.accent }]}>{words.correct}</Text></View>}</>;
    }
    if (game.id === 'wyr' || game.id === 'likely') {
      const completed = votes.length >= people.length;
      return <>
        <Text style={[styles.helper, { color: p.muted }]}>{completed ? words.result : `${words.turn}: ${people[choiceIndex % people.length]}`}</Text>
        {!completed ? <View style={styles.choiceStack}>{(game.id === 'likely' ? people : voteChoices).map((choice, i) => <Pressable key={`${choice}-${i}`} accessibilityRole="button" onPress={() => game.id === 'likely' ? selectPerson(choice) : voteFor(choice)} style={({ pressed }) => [styles.choiceButton, { backgroundColor: p.card, borderColor: p.line }, pressed && !reduceMotion && styles.pressed]}><Text style={[styles.choiceText, { color: p.text }]}>{choice}</Text><ChanceIcon name="chevron-right" size={18} color={p.accent} /></Pressable>)}</View> : <View style={styles.resultList}>{Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([choice, count], i) => <View key={choice} style={[styles.resultRow, { backgroundColor: i === 0 ? p.soft : p.card, borderColor: p.line }]}><Text style={[styles.resultText, { color: i === 0 ? p.accent : p.text, flex: 1 }]}>{choice}</Text><Text style={[styles.voteCount, { color: p.accent }]}>{count} {words.votes.toLowerCase()}</Text></View>)}</View>}
        <Text style={[styles.helper, { color: p.muted }]}>{completed ? `${words.winner}: ${Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}` : words.askEveryone}</Text>
      </>;
    }
    if (game.id === 'dice') return <><View style={styles.diceRow}>{(rollFaces.length ? rollFaces : Array.from({ length: diceCount }, () => 1)).map((n, i) => die(n, i))}</View>{answer && <Text style={[styles.resultText, { color: p.accent }]}>{answer}</Text>}{randomActionButton(actionUsed ? words.rollAgain : words.roll, 'dice', 'dice-multiple-outline')}</>;
    if (game.id === 'coin') return <><Animated.View style={[styles.coin, { backgroundColor: '#E5B84C', borderColor: '#F6D984' }, !reduceMotion && { transform: [{ rotateY: coinMotion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] }) }, { scale: coinMotion.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) }] }]}><Text style={styles.coinMark}>{answer ? answer === 'Heads' || answer === 'وجه' ? '✦' : 'C' : '✦'}</Text></Animated.View>{answer && <Text style={[styles.resultText, { color: p.accent }]}>{answer}</Text>}{randomActionButton(words.flip, 'coin', 'circle-slice-4')}</>;
    if (game.id === 'yesno') return <><View style={[styles.numberOrb, { backgroundColor: p.soft }]}><ChanceIcon name="check-circle-outline" size={54} color={p.accent} /></View>{answer && <Text style={[styles.resultText, { color: p.accent }]}>{answer}</Text>}{randomActionButton(words.ask, 'yesno', 'check-circle-outline')}</>;
    if (game.id === 'wheel') {
      const names = wheelNames.split(',').map(x => x.trim()).filter(Boolean).slice(0, 8);
      const entries = names.length ? names : people;
      return <><View style={styles.wheelWrap}><View style={[styles.pointer, { borderBottomColor: p.accent }]} /><Animated.View style={[styles.wheel, { borderColor: p.line, backgroundColor: p.card }, !reduceMotion && { transform: [{ rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1800deg'] }) }] }]}>{entries.map((name, i) => { const angle = (Math.PI * 2 * i) / entries.length; return <View key={`${name}-${i}`} style={[styles.wheelLabel, { backgroundColor: answer === name ? p.accent : COLORS[i % COLORS.length], left: 105 + Math.cos(angle) * 78 - 31, top: 105 + Math.sin(angle) * 78 - 15 }]}><Text numberOfLines={1} style={styles.wheelName}>{name}</Text></View>; })}<View style={[styles.wheelHub, { backgroundColor: p.soft }]}><ChanceIcon name="star-four-points" size={22} color={p.accent} /></View></Animated.View></View>{answer && <Text style={[styles.resultText, { color: p.accent }]}>{words.winner}: {answer}</Text>}{randomActionButton(words.spin, 'wheel', 'star-four-points')}</>;
    }
    return <><Animated.View style={[styles.numberOrb, { backgroundColor: p.soft }, !reduceMotion && { transform: [{ scale: numberMotion.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}><Text style={[styles.numberText, { color: p.accent }]}>{answer || '—'}</Text></Animated.View>{randomActionButton(words.pick, 'number', 'numeric')}</>;
  };

  const top = <View style={[styles.topLine, { flexDirection: rtl ? 'row-reverse' : 'row' }]}><View style={[styles.iconTile, { backgroundColor: `${game.color}1C` }]}><ChanceIcon name={game.icon} size={22} color={game.color} /></View><View style={styles.topText}><Text style={[styles.gameTitle, { color: p.text }]}>{rtl ? game.ar : friendlyTitle}</Text><Text style={[styles.subtitle, { color: p.muted }]}>{words.round} {round} · {words.turn}: {people[choiceIndex % people.length]}</Text></View><View style={[styles.roundPill, { backgroundColor: p.soft }]}><Text style={[styles.roundText, { color: p.accent }]}>#{round}</Text></View></View>;
  const secretHidden = (game.id === 'whoami' || game.id === 'charades') && !showAnswer;
  const promptPanel = <View style={[styles.promptPanel, { backgroundColor: p.card, borderColor: p.line }]}><View style={[styles.promptEyebrow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}><ChanceIcon name={game.id === 'trivia' ? 'lightbulb-outline' : game.id === 'categories' ? 'view-grid-outline' : 'star-four-points'} size={16} color={p.accent} /><Text style={[styles.promptLabel, { color: p.muted }]}>{game.id === 'whoami' || game.id === 'charades' ? words.secret : game.id === 'trivia' ? (rtl ? 'سؤال الجولة' : 'ROUND QUESTION') : (rtl ? 'تحدّي الجولة' : 'ROUND CHALLENGE')}</Text></View><Text accessibilityLiveRegion="polite" style={[styles.promptText, { color: p.text, textAlign: rtl ? 'right' : 'left' }]}>{secretHidden ? (rtl ? 'اضغط لإظهار الإشارة لنفسك' : 'Tap to peek at your clue') : prompt}</Text></View>;
  const panel = <View style={[styles.playPanel, { backgroundColor: p.card, borderColor: p.line }]}>{actionPanel()}</View>;
  if (onlineInfo) {
    const canSubmit = onlineInfo.status === 'active' && !onlineInfo.submitted;
    const isTurn = onlineInfo.turnPlayerId === onlineInfo.selfPlayerId;
    const resultText = onlineInfo.result?.answer || onlineInfo.result?.result || (onlineInfo.result?.faces ? `${onlineInfo.result.faces.join(' + ')} = ${onlineInfo.result.result}` : '');
    const choices = game.id === 'likely' ? onlineInfo.members.map(member => member.name) : voteChoices;
    const voteGame = game.id === 'wyr' || game.id === 'likely';
    const randomGame = ['dice', 'coin', 'yesno', 'number', 'wheel'].includes(game.id);
    const turnName = onlineInfo.members.find(member => member.id === onlineInfo.turnPlayerId)?.name;
    return <GameTypography.Provider value={{ fontFamily, rtl }}><View nativeID="cc-game-play" style={styles.container}>
      <View style={[styles.topLine,{flexDirection:rtl?'row-reverse':'row'}]}><View style={[styles.iconTile,{backgroundColor:`${game.color}1C`}]}><ChanceIcon name={game.icon} size={22} color={game.color} /></View><View style={styles.topText}><Text style={[styles.gameTitle,{color:p.text}]}>{rtl?game.ar:game.title}</Text><Text style={[styles.subtitle,{color:p.muted}]}>{words.round} {onlineInfo.status==='active'?round:round} · {turnName ? `${words.turn}: ${turnName}` : words.waiting}</Text></View><View style={[styles.roundPill,{backgroundColor:p.soft}]}><Text style={[styles.roundText,{color:p.accent}]}>#{round}</Text></View></View>
      <View style={[styles.promptPanel,{backgroundColor:p.card,borderColor:p.line}]}><Text style={[styles.promptLabel,{color:p.muted}]}>{words.result}</Text><Text accessibilityLiveRegion="polite" style={[styles.promptText,{color:p.text,textAlign:rtl?'right':'left'}]}>{onlineInfo.prompt}</Text>{onlineInfo.privateClue&&<View style={[styles.revealBadge,{backgroundColor:p.soft}]}><Text style={[styles.helper,{color:p.accent}]}>{words.privateClue}</Text><Text style={[styles.resultText,{color:p.accent,marginTop:0}]}>{onlineInfo.privateClue}</Text></View>}</View>
      <View style={[styles.playPanel,{backgroundColor:p.card,borderColor:p.line,alignItems:'stretch'}]}>
        {onlineInfo.result && <View style={[styles.revealBadge,{backgroundColor:p.soft}]}><Text style={[styles.resultText,{color:p.accent,marginTop:0}]}>{resultText || words.result}</Text>{onlineInfo.result.tally&&Object.entries(onlineInfo.result.tally).map(([choice,count])=><Text key={choice} style={[styles.helper,{color:p.text}]}>{choice} · {count} {words.votes.toLowerCase()}</Text>)}</View>}
        {game.id==='trivia' && onlineInfo.status==='active' && (canSubmit ? <><TextInput accessibilityLabel={words.yourChoice} value={onlineAnswer} onChangeText={setOnlineAnswer} placeholder={words.yourChoice} placeholderTextColor={p.muted} autoCapitalize="sentences" style={[styles.onlineInput,{backgroundColor:p.bg,borderColor:p.line,color:p.text,textAlign:rtl?'right':'left'}]} /><Pressable accessibilityRole="button" disabled={!onlineAnswer.trim()} onPress={()=>{onOnlineAction?.('answer',onlineAnswer.trim());setOnlineAnswer('');}} style={[styles.actionButton,{backgroundColor:p.accent,opacity:onlineAnswer.trim()?1:.55}]}><Text style={styles.actionText}>{words.submit}</Text></Pressable></> : <Text style={[styles.helper,{color:p.muted}]}>{onlineInfo.submitted?words.submitted:`${words.waiting} · ${onlineInfo.submissionCount}/${onlineInfo.members.length}`}</Text>)}
        {voteGame && onlineInfo.status==='active' && (canSubmit ? <View style={styles.choiceStack}>{choices.map((choice,index)=><Pressable key={`${choice}-${index}`} accessibilityRole="button" onPress={()=>onOnlineAction?.('vote',choice)} style={[styles.choiceButton,{backgroundColor:p.card,borderColor:p.line}]}><Text style={[styles.choiceText,{color:p.text}]}>{choice}</Text><ChanceIcon name="chevron-right" size={18} color={p.accent} /></Pressable>)}</View> : <Text style={[styles.helper,{color:p.muted}]}>{onlineInfo.submitted?words.submitted:`${words.waiting} · ${onlineInfo.submissionCount}/${onlineInfo.members.length}`}</Text>)}
        {randomGame && onlineInfo.status==='active' && (isTurn ? <Pressable accessibilityRole="button" onPress={()=>onOnlineAction?.('roll')} style={[styles.actionButton,{backgroundColor:p.accent}]}><ChanceIcon name={game.id==='dice'?'dice-multiple-outline':game.id==='coin'?'circle-slice-4':game.id==='wheel'?'star-four-points':'check-circle-outline'} color="#fff" size={19} /><Text style={styles.actionText}>{game.id==='dice'?words.roll:game.id==='coin'?words.flip:game.id==='wheel'?words.spin:words.pick}</Text></Pressable> : <Text style={[styles.helper,{color:p.muted}]}>{turnName?`${words.notYourTurn}: ${turnName}`:words.notYourTurn}</Text>)}
        {['categories','whoami','charades'].includes(game.id) && onlineInfo.status==='active' && <><Text style={[styles.helper,{color:p.muted}]}>{onlineInfo.privateClue || (game.id==='charades'?words.secret:words.categoryHint)}</Text>{onlineInfo.isHost&&<View style={styles.choiceStack}>{onlineInfo.members.map(member=><Pressable key={member.id} accessibilityRole="button" disabled={onlineInfo.scoredPlayerIds.includes(member.id)} onPress={()=>onOnlineAction?.('point',undefined,member.id)} style={[styles.choiceButton,{backgroundColor:p.card,borderColor:p.line,opacity:onlineInfo.scoredPlayerIds.includes(member.id)?0.55:1}]}><Text style={[styles.choiceText,{color:p.text}]}>{member.name} · {member.score}</Text><Text style={{color:p.accent,fontWeight:'800'}}>{onlineInfo.scoredPlayerIds.includes(member.id)?'✓':`+1 ${words.award}`}</Text></Pressable>)}</View>}</>}
        <View style={styles.scorePeople}>{onlineInfo.members.map(member=><View key={member.id} style={[styles.scorePerson,{borderColor:p.line,backgroundColor:p.bg}]}><Text numberOfLines={1} style={[styles.scoreName,{color:p.text}]}>{member.name}</Text><Text style={[styles.scoreNumber,{color:p.accent}]}>{member.score}</Text></View>)}</View>
        <Text style={[styles.helper,{color:p.muted}]}>{onlineInfo.submissionStatus.map(item=>`${onlineInfo.members.find(member=>member.id===item.player_id)?.name||''} ${item.submitted?'✓':'·'}`).join('  ')}</Text>
      </View>
      <View style={[styles.footerActions,{flexDirection:rtl?'row-reverse':'row'}]}>{onlineInfo.isHost&&<Pressable accessibilityRole="button" onPress={onOnlineNext} style={[styles.nextButton,{backgroundColor:p.accent}]}><ChanceIcon name="refresh" size={18} color="#fff" /><Text style={styles.actionText}>{words.nextHost}</Text></Pressable>}{!onlineInfo.isHost&&<Text style={[styles.helper,{color:p.muted}]}>{words.hostWait}</Text>}<Pressable accessibilityRole="button" onPress={onBack} style={[styles.backButton,{backgroundColor:p.card,borderColor:p.line}]}><ChanceIcon name={rtl?'chevron-right':'chevron-left'} size={17} color={p.text} /><Text style={[styles.backText,{color:p.text}]}>{words.back}</Text></Pressable></View>
    </View></GameTypography.Provider>;
  }

  return <GameTypography.Provider value={{ fontFamily, rtl }}><View nativeID="cc-game-play" style={styles.container}>
    {top}
    {wide ? <View style={[styles.playColumns, { flexDirection: rtl ? 'row-reverse' : 'row' }]}><View style={styles.mainColumn}>{promptPanel}{scoreCard}</View><View style={styles.sideColumn}>{panel}</View></View> : <>{promptPanel}{panel}{scoreCard}</>}
    <View style={[styles.footerActions, { flexDirection: rtl ? 'row-reverse' : 'row' }]}><Pressable accessibilityRole="button" onPress={advance} style={[styles.nextButton, { backgroundColor: p.accent }]}><ChanceIcon name="refresh" size={18} color="#fff" /><Text style={styles.actionText}>{words.next}</Text></Pressable><Pressable accessibilityRole="button" onPress={onBack} style={[styles.backButton, { backgroundColor: p.card, borderColor: p.line }]}><ChanceIcon name={rtl ? 'chevron-right' : 'chevron-left'} size={17} color={p.text} /><Text style={[styles.backText, { color: p.text }]}>{words.back}</Text></Pressable></View>
    {scoreLeader && <Text style={[styles.leader, { color: p.muted }]}>{words.points}: {scoreLeader[0]} · {scoreLeader[1]}</Text>}
  </View></GameTypography.Provider>;
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 14 }, onlineInput: { width:'100%', minHeight:48, borderWidth:1, borderRadius:13, paddingHorizontal:14, paddingVertical:12, fontSize:15, marginTop:8 }, topLine: { alignItems: 'center', gap: 12, marginBottom: 4 }, iconTile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, topText: { flex: 1, minWidth: 0 }, gameTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 }, subtitle: { fontSize: 12, marginTop: 3 }, roundPill: { minWidth: 48, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, roundText: { fontSize: 13, fontWeight: '800' },
  playColumns: { alignItems: 'flex-start', gap: 16 }, mainColumn: { flex: 1.35, minWidth: 0, gap: 14 }, sideColumn: { flex: 1, minWidth: 280 }, promptPanel: { borderWidth: 1, borderRadius: 22, padding: 22, minHeight: 170, justifyContent: 'center' }, promptEyebrow: { alignItems: 'center', gap: 8, marginBottom: 16 }, promptLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800' }, promptText: { fontSize: 26, lineHeight: 35, fontWeight: '800' }, playPanel: { borderWidth: 1, borderRadius: 22, padding: 20, minHeight: 180, alignItems: 'center', justifyContent: 'center' }, helper: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: 6 }, actionButton: { minHeight: 46, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, alignSelf: 'center', marginTop: 14 }, actionText: { color: '#fff', fontSize: 14, fontWeight: '800' }, pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  timerTrack: { width: '100%', height: 9, borderRadius: 6, overflow: 'hidden', marginTop: 12 }, timerFill: { height: '100%', borderRadius: 6 }, timerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }, timerCount: { fontSize: 13, fontWeight: '800' }, resultText: { fontSize: 21, lineHeight: 29, fontWeight: '800', textAlign: 'center', marginTop: 9 }, revealBadge: { alignItems: 'center', borderRadius: 16, padding: 15, marginTop: 12, width: '100%' },
  choiceStack: { width: '100%', gap: 9, marginTop: 8 }, choiceButton: { borderWidth: 1, borderRadius: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, choiceText: { flex: 1, fontSize: 14, fontWeight: '700' }, resultList: { width: '100%', gap: 7, marginTop: 6 }, resultRow: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, voteCount: { fontSize: 11, fontWeight: '800' }, scoreStrip: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 12 }, scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 }, scoreLabel: { fontSize: 11, fontWeight: '700' }, scorePeople: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, scorePerson: { minWidth: 74, maxWidth: 150, borderWidth: 1, borderColor: 'transparent', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, scoreName: { flexShrink: 1, fontSize: 11, fontWeight: '600' }, scoreNumber: { fontSize: 13, fontWeight: '800' },
  diceRow: { flexDirection: 'row', gap: 12, marginVertical: 7 }, die: { width: 72, height: 72, borderWidth: 1, borderRadius: 17, padding: 11, justifyContent: 'space-between', elevation: 2 }, pipRow: { flexDirection: 'row', justifyContent: 'space-between' }, pip: { width: 10, height: 10, borderRadius: 5 }, coin: { width: 118, height: 118, borderRadius: 59, borderWidth: 8, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, coinMark: { fontSize: 42, fontWeight: '800', color: '#8F6720', textAlign: 'center' }, wheelWrap: { width: 230, height: 230, alignItems: 'center', justifyContent: 'center', position: 'relative' }, wheel: { width: 218, height: 218, borderWidth: 1, borderRadius: 110, position: 'relative', alignItems: 'center', justifyContent: 'center', elevation: 3 }, pointer: { position: 'absolute', top: 0, zIndex: 2, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 22, borderLeftColor: 'transparent', borderRightColor: 'transparent' }, wheelLabel: { position: 'absolute', width: 62, height: 30, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 5 }, wheelName: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' }, wheelHub: { position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, numberOrb: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', marginVertical: 6 }, numberText: { fontSize: 42, fontWeight: '800' },
  footerActions: { flexWrap: 'wrap', gap: 9, marginTop: 3 }, nextButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, backButton: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, backText: { fontSize: 13, fontWeight: '700' }, leader: { fontSize: 11, textAlign: 'center', marginTop: -6 },
});
