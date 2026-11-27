import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, TextInput, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Cairo_400Regular, Cairo_500Medium, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import ChanceIcon, { type IconName } from './ChanceIcon';
import GamePlay from './GamePlay';
import type { Game } from './gameTypes';

const MaterialCommunityIcons = ({ name, size = 20, color }: { name: IconName; size?: number; color: string }) => <ChanceIcon name={name} size={size} color={color} />;
const AppTypography = createContext<{ fontFamily: (weight: string) => string | undefined; rtl: boolean }>({ fontFamily: () => undefined, rtl: false });
function Text(props: React.ComponentProps<typeof NativeText>) {
  const { fontFamily, rtl } = useContext(AppTypography);
  const weight = String(StyleSheet.flatten(props.style)?.fontWeight || '400');
  return <NativeText {...props} style={[{ fontFamily: fontFamily(weight), writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }, props.style]} />;
}
type Member = { id: string; name: string; ready: boolean; score: number; is_host: boolean; online: boolean };
type PartyRound = { number: number; game: string; prompt: string; status: 'active' | 'complete'; turn_player_id: string | null; private_clue: string | null; result: { answer?: string; result?: string | number; faces?: number[]; tally?: Record<string, number> } | null; submitted: boolean; submission_count: number; scored_player_ids: string[]; submission_status: { player_id: string; submitted: boolean }[] };
type Party = { id: string; name: string; code: string; players: string[]; members?: Member[]; self_player_id?: string; is_host?: boolean; status?: 'lobby' | 'playing' | 'finished'; game?: string; round?: PartyRound | null; createdAt: string };
type Team = { id: string; name: string; members: string[]; code?: string };
type Screen = 'home' | 'party' | 'games' | 'teams' | 'profile' | 'auth' | 'game';
type Locale = 'en' | 'ar';
type Theme = 'light' | 'dark';
const API = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
const GAMES: Game[] = [
  { id: 'categories', title: 'Categories', ar: 'الفئات', icon: 'view-grid-outline', tag: 'Quick thinking', tagAr: 'سرعة بديهة', color: '#7455E8' },
  { id: 'whoami', title: 'Who Am I?', ar: 'من أنا؟', icon: 'account-question-outline', tag: 'Guessing', tagAr: 'تخمين', color: '#EF8C60' },
  { id: 'trivia', title: 'Trivia', ar: 'أسئلة عامة', icon: 'lightbulb-outline', tag: 'Brainy', tagAr: 'اختبر معلوماتك', color: '#3A9C87' },
  { id: 'charades', title: 'Charades', ar: 'تمثيل صامت', icon: 'drama-masks', tag: 'Act it out', tagAr: 'مثّلها', color: '#D36C89' },
  { id: 'wyr', title: 'Would You Rather', ar: 'ماذا تفضل؟', icon: 'compare-horizontal', tag: 'Big debates', tagAr: 'نقاشات ممتعة', color: '#5276C9' },
  { id: 'likely', title: 'Most Likely To', ar: 'من الأكثر احتمالاً؟', icon: 'account-star-outline', tag: 'Know your crew', tagAr: 'اعرف أصحابك', color: '#D49C37' },
  { id: 'yesno', title: 'Yes / No', ar: 'نعم أم لا', icon: 'check-circle-outline', tag: 'Let chance decide', tagAr: 'دع الحظ يختار', color: '#4D9D6D' },
  { id: 'dice', title: 'Dice', ar: 'النرد', icon: 'dice-multiple-outline', tag: 'Roll the odds', tagAr: 'ارمِ النرد', color: '#4A86B6' },
  { id: 'coin', title: 'Coin Flip', ar: 'رمي العملة', icon: 'circle-slice-4', tag: '50 / 50', tagAr: 'نصف بنصف', color: '#C17A48' },
  { id: 'wheel', title: 'Name Wheel', ar: 'عجلة الأسماء', icon: 'chart-donut', tag: 'Pick someone', tagAr: 'اختر شخصاً', color: '#9664B5' },
  { id: 'number', title: 'Number Picker', ar: 'اختيار رقم', icon: 'numeric', tag: 'Pick a number', tagAr: 'اختر رقماً', color: '#5471A4' },
];
const QUESTIONS = [
  { q: 'Which planet has the most moons?', a: 'Saturn' }, { q: 'What is the largest desert on Earth?', a: 'Antarctica' },
  { q: 'How many hearts does an octopus have?', a: 'Three' }, { q: 'What is the smallest prime number?', a: 'Two' },
  { q: 'Which country invented paper?', a: 'China' }, { q: 'What is the only mammal capable of true flight?', a: 'A bat' },
  { q: 'What is the capital of New Zealand?', a: 'Wellington' }, { q: 'How many sides does a dodecagon have?', a: 'Twelve' },
];
const PROMPTS: Record<string, string[]> = {
  whoami: ['A sleepy koala', 'The moon landing', 'A famous chef', 'A roller coaster', 'A detective', 'The last slice of pizza', 'A penguin at a wedding'],
  charades: ['Brushing your teeth', 'A cat seeing a cucumber', 'Winning an Olympic medal', 'A very slow elevator', 'Making the perfect sandwich', 'A robot learning to dance'],
  wyr: ['Explore space or the deep ocean?', 'Always sing instead of speaking or dance everywhere?', 'Live without music or without movies?', 'Have a rewind button or a pause button for life?', 'Be able to talk to animals or speak every language?'],
  likely: ['Who is most likely to become a famous chef?', 'Who would survive longest on a desert island?', 'Who is most likely to laugh at the wrong moment?', 'Who would plan the best surprise party?', 'Who is most likely to adopt five pets?'],
  categories: ['Things you find at the beach', 'Fruits and vegetables', 'Movie characters', 'Countries and cities', 'Things that are red', 'Sports and hobbies', 'Foods you eat with your hands'],
};
const PROMPTS_AR: Record<string, string[]> = {
  whoami: ['كوالا نائمة', 'الهبوط على القمر', 'طاهٍ مشهور', 'أفعوانية', 'محقق', 'آخر قطعة بيتزا', 'بطريق في حفل زفاف'],
  charades: ['تنظيف أسنانك', 'قطة رأت خياراً', 'الفوز بميدالية أولمبية', 'مصعد بطيء جداً', 'تحضير الشطيرة المثالية', 'روبوت يتعلم الرقص'],
  wyr: ['استكشاف الفضاء أم أعماق المحيط؟', 'الغناء دائماً أم الرقص في كل مكان؟', 'العيش بلا موسيقى أم بلا أفلام؟', 'زر لإعادة الوقت أم لإيقافه؟', 'التحدث مع الحيوانات أم بكل لغات العالم؟'],
  likely: ['من الأكثر احتمالاً أن يصبح طاهياً مشهوراً؟', 'من سيصمد أكثر في جزيرة مهجورة؟', 'من سيضحك في وقت غير مناسب؟', 'من سينظم أفضل حفلة مفاجأة؟', 'من سيقتني خمسة حيوانات أليفة؟'],
  categories: ['أشياء تجدها على الشاطئ', 'فواكه وخضروات', 'شخصيات أفلام', 'بلدان ومدن', 'أشياء لونها أحمر', 'رياضات وهوايات', 'أطعمة تؤكل باليد'],
};
const QUESTIONS_AR = [
  { q: 'ما الكوكب الذي يملك أكبر عدد من الأقمار؟', a: 'زحل' }, { q: 'ما أكبر صحراء على الأرض؟', a: 'القارة القطبية الجنوبية' },
  { q: 'كم قلباً للأخطبوط؟', a: 'ثلاثة' }, { q: 'ما أصغر عدد أولي؟', a: 'اثنان' },
  { q: 'أي بلد اخترع الورق؟', a: 'الصين' }, { q: 'ما الثديي الوحيد القادر على الطيران الحقيقي؟', a: 'الخفاش' },
  { q: 'ما عاصمة نيوزيلندا؟', a: 'ويلينغتون' }, { q: 'كم ضلعاً للمضلع الاثني عشري؟', a: 'اثنا عشر' },
];
const T: Record<Theme, { bg: string; card: string; text: string; muted: string; line: string; accent: string; soft: string }> = {
  light: { bg: '#F6F4F0', card: '#FFFFFF', text: '#25242A', muted: '#77757E', line: '#E8E5E0', accent: '#6551D6', soft: '#EFECFF' },
  dark: { bg: '#17171D', card: '#222229', text: '#F5F3F8', muted: '#A5A2AE', line: '#383741', accent: '#B5A7FF', soft: '#302C42' },
};
const strings = {
  en: { home: 'Home', party: 'Party', games: 'Games', teams: 'Teams', profile: 'Profile', hello: 'The good kind of chaos starts here.', title: 'Make tonight\na little more fun.', sub: 'Pick a game, bring your people, and let chance do the rest.', host: 'Start a party', browse: 'Browse games', featured: 'Pick your first game', allgames: 'All games', yourparty: 'Your party', newparty: 'Set up a party', partyname: 'Party name', names: 'Invite friends after creating your lobby', continue: 'Create lobby', guest: 'Guest display name', ready: 'Ready', notReady: 'Not ready', hostLabel: 'Host', shareLink: 'Invite link', lobbyWait: 'Waiting for the host to start', connected: 'Online', reconnecting: 'Offline · reconnecting', linkNote: 'Friends need the same network address; localhost only works on this device.', join: 'Join with code', code: 'Invite code', create: 'Create', start: 'Start a round', next: 'Next prompt', reveal: 'Reveal answer', answer: 'Answer', back: 'Back', save: 'Save changes', signIn: 'Sign in', signUp: 'Create account', email: 'Email address', password: 'Password', name: 'Your name', noAccount: 'New here?', haveAccount: 'Already have an account?', signOut: 'Sign out', theme: 'Appearance', language: 'Language', light: 'Light', dark: 'Dark', english: 'English', arabic: 'العربية', teamsTitle: 'Your teams', newTeam: 'Team name', addTeam: 'Create team', joinTeam: 'Join team', teamInvite: 'Team invite code', members: 'Players', partyReady: 'Your party is ready', invite: 'Share this code with your friends', saved: 'Saved on this device', online: 'Shared online for account and guest players', empty: 'Nothing here yet — start with a party or game.', account: 'Account', greeting: 'Welcome back', loading: 'Loading…', error: 'Could not reach the server. Your local game is still ready.', time: 'Round timer', round: 'Round', points: 'Points', quick: 'Quick play', profileTitle: 'Your profile', settings: 'Settings', chooseGame: 'Choose a game to play', who: 'Who is playing?', addNames: 'Add player names, separated by commas', startOver: 'Set up another party', joinAction: 'Join party', joined: 'You joined the party', localTeams: 'Teams on this device', teamHint: 'Guests can play online; sign in to keep team and account progress.' },
  ar: { home: 'الرئيسية', party: 'الحفلة', games: 'الألعاب', teams: 'الفرق', profile: 'حسابي', hello: 'ابدأوا أمسية مليئة بالمرح.', title: 'خلّوا ليلتكم\nأكثر متعة.', sub: 'اختاروا لعبة واجمعوا أصحابكم واتركوا الحظ يقرر.', host: 'ابدأ حفلة', browse: 'تصفح الألعاب', featured: 'اختاروا أول لعبة', allgames: 'كل الألعاب', yourparty: 'حفلتكم', newparty: 'إعداد الحفلة', partyname: 'اسم الحفلة', names: 'ادعُ أصدقاءك بعد إنشاء الغرفة', continue: 'إنشاء غرفة', guest: 'اسم اللاعب الضيف', ready: 'مستعد', notReady: 'غير مستعد', hostLabel: 'المضيف', shareLink: 'رابط الدعوة', lobbyWait: 'بانتظار المضيف لبدء اللعب', connected: 'متصل', reconnecting: 'غير متصل · جارٍ إعادة الاتصال', linkNote: 'يحتاج الأصدقاء إلى عنوان الشبكة نفسه؛ localhost يعمل على هذا الجهاز فقط.', join: 'الانضمام برمز', code: 'رمز الدعوة', create: 'إنشاء', start: 'ابدأ الجولة', next: 'السؤال التالي', reveal: 'أظهر الإجابة', answer: 'الإجابة', back: 'رجوع', save: 'حفظ التغييرات', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'اسمك', noAccount: 'مستخدم جديد؟', haveAccount: 'لديك حساب بالفعل؟', signOut: 'تسجيل الخروج', theme: 'المظهر', language: 'اللغة', light: 'فاتح', dark: 'داكن', english: 'English', arabic: 'العربية', teamsTitle: 'فرقكم', newTeam: 'اسم الفريق', addTeam: 'إنشاء فريق', joinTeam: 'انضم للفريق', teamInvite: 'رمز دعوة الفريق', members: 'اللاعبون', partyReady: 'حفلتكم جاهزة', invite: 'شاركوا هذا الرمز مع الأصدقاء', saved: 'محفوظ على هذا الجهاز', online: 'اللعب المشترك متاح للحسابات والضيوف', empty: 'لا شيء هنا بعد — ابدأ بحفلة أو لعبة.', account: 'الحساب', greeting: 'مرحباً بعودتك', loading: 'جارٍ التحميل…', error: 'تعذر الاتصال بالخادم. يمكنكم اللعب محلياً.', time: 'مؤقت الجولة', round: 'الجولة', points: 'النقاط', quick: 'لعب سريع', profileTitle: 'ملفك الشخصي', settings: 'الإعدادات', chooseGame: 'اختر لعبة للعب', who: 'من سيلعب؟', addNames: 'أضف أسماء اللاعبين وافصل بينها بفواصل', startOver: 'إعداد حفلة أخرى', joinAction: 'انضم للحفلة', joined: 'انضممت إلى الحفلة', localTeams: 'فرق على هذا الجهاز', teamHint: 'يمكن للضيوف اللعب عبر الإنترنت؛ سجل الدخول لحفظ تقدم الحساب والفرق.' },
};
const rand = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const localRecordId = () => Date.now().toString(36);
const getToken = async () => Platform.OS === 'web' ? (typeof localStorage === 'undefined' ? null : localStorage.getItem('cc-token')) : SecureStore.getItemAsync('cc-token');
const setToken = async (token: string | null) => { if (Platform.OS === 'web') { if (typeof localStorage === 'undefined') return; if (token) localStorage.setItem('cc-token', token); else localStorage.removeItem('cc-token'); return; } if (token) await SecureStore.setItemAsync('cc-token', token); else await SecureStore.deleteItemAsync('cc-token'); };
const api = async (path: string, method = 'GET', body?: unknown) => { const token = await getToken(); const response = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); const json = await response.json().catch(() => ({})); if (!response.ok) throw new Error(json.message || 'Request failed'); return json; };

export default function App() {
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_500Medium, Cairo_700Bold, Manrope_400Regular, Manrope_500Medium, Manrope_700Bold, ChanceClubIcons: require('./assets/chance-club-icons.ttf') });
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [user, setUser] = useState<{ id?: number; name: string; email: string; preferred_language?: Locale; theme?: Theme } | null>(null);
  const [guest, setGuest] = useState<{ id: string; name: string; expires_at: string } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [roundText, setRoundText] = useState('');
  const [roundAnswer, setRoundAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [round, setRound] = useState(1);
  const [partyName, setPartyName] = useState('Friday night');
  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [authMode, setAuthMode] = useState<'login'|'register'>('register');
  const [authName, setAuthName] = useState('');
  const [profileName, setProfileName] = useState('');
  const promptRef = useRef('');
  const roundRef = useRef(1);
  const [openedGameCode, setOpenedGameCode] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [diceCount, setDiceCount] = useState(2);
  const [wheelNames, setWheelNames] = useState('Alex, Sam, Jordan, Taylor');
  const [numberRange, setNumberRange] = useState('100');
  const t = T[theme]; const s = strings[locale]; const rtl = locale === 'ar';
  const sortedGames = useMemo(() => GAMES, []);
  const fontFamily = (weight: string) => {
    const english: Record<string, string> = { '400': 'Manrope_400Regular', '500': 'Manrope_500Medium', '600': 'Manrope_500Medium', '700': 'Manrope_700Bold', '800': 'Manrope_700Bold', '900': 'Manrope_700Bold' };
    const arabic: Record<string, string> = { '400': 'Cairo_400Regular', '500': 'Cairo_500Medium', '600': 'Cairo_500Medium', '700': 'Cairo_700Bold', '800': 'Cairo_700Bold', '900': 'Cairo_700Bold' };
    return fontsLoaded ? (rtl ? arabic[weight] : english[weight]) || (rtl ? arabic['400'] : english['400']) : undefined;
  };
  const persistParties = (value: Party[]) => { setParties(value); AsyncStorage.setItem('cc-parties', JSON.stringify(value)).catch(() => {}); };
  const mergeParty = useCallback((value:Party) => setParties(current => { const next=[value,...current.filter(item=>item.code!==value.code)]; AsyncStorage.setItem('cc-parties',JSON.stringify(next)).catch(()=>{}); return next; }),[]);
  const persistTeams = (value: Team[]) => { setTeams(value); AsyncStorage.setItem('cc-teams', JSON.stringify(value)).catch(() => {}); };

  useEffect(() => {
    const onMotionChange = (enabled: boolean) => setReduceMotion(enabled);
    AccessibilityInfo.isReduceMotionEnabled().then(onMotionChange).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', onMotionChange);
    let media: MediaQueryList | undefined;
    let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      media = window.matchMedia('(prefers-reduced-motion: reduce)');
      onMotionChange(media.matches);
      mediaListener = event => onMotionChange(event.matches);
      media.addEventListener?.('change', mediaListener);
    }
    return () => { subscription.remove(); if (media && mediaListener) media.removeEventListener?.('change', mediaListener); };
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `@keyframes cc-screen-enter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: no-preference) { [role="button"], [role="tab"] { transition: transform 160ms ease, opacity 160ms ease; } [role="button"]:hover, [role="tab"]:hover { transform: translateY(-1px); } [role="button"]:active, [role="tab"]:active { transform: scale(.985); } #cc-screen { animation: cc-screen-enter 180ms ease-out; } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => { (async () => { try { const pref = JSON.parse((await AsyncStorage.getItem('cc-pref')) || '{}'); if (pref.locale) setLocale(pref.locale); if (pref.theme) setTheme(pref.theme); setParties(JSON.parse((await AsyncStorage.getItem('cc-parties')) || '[]')); setTeams(JSON.parse((await AsyncStorage.getItem('cc-teams')) || '[]')); const savedGuestName = (await AsyncStorage.getItem('cc-guest-name')) || ''; setGuestName(savedGuestName); const token = await getToken(); if (token) { try { const me = await api('/me'); setUser(me.user); setProfileName(me.user.name); if (me.user.preferred_language) setLocale(me.user.preferred_language); if (me.user.theme) setTheme(me.user.theme); const [result, teamResult] = await Promise.all([api('/parties'), api('/teams')]); setParties(result.data || []); setTeams(teamResult.data || []); } catch { const session = await api('/guest/me'); setGuest(session.guest); setGuestName(session.guest.name); const result = await api('/parties'); setParties(result.data || []); } } if (Platform.OS === 'web' && typeof window !== 'undefined') { const code = new URLSearchParams(window.location.search).get('join'); if (code) { setJoinCode(code.toUpperCase()); setScreen('party'); } } } catch { /* keep offline settings and require a fresh session on the next online action */ } })(); }, []);
  useEffect(() => { AsyncStorage.setItem('cc-pref', JSON.stringify({ locale, theme })).catch(() => {}); if (user) api('/me','PATCH',{preferred_language:locale,theme}).catch(() => {}); }, [locale, theme, user]);
  // A short polling interval keeps lobbies usable without a push/broadcast service; missed updates recover after reconnect.
  const activePartyCode = party?.code;
  useEffect(() => { if (!activePartyCode || (screen !== 'party' && screen !== 'game')) return; let cancelled = false; const refresh = () => { api(`/parties/${encodeURIComponent(activePartyCode)}`).then(res => { if (cancelled) return; const shared = res.data as Party; setParty(shared); mergeParty(shared); if (shared.status === 'playing' && shared.game && shared.round) { const selected = GAMES.find(item => item.id === shared.game); if (selected) { setGame(selected); setRound(shared.round.number); setRoundText(shared.round.prompt); if (screen === 'party' && openedGameCode !== shared.code) { setOpenedGameCode(shared.code); setScreen('game'); } } } else if (shared.status === 'lobby' && screen === 'game') { setGame(null); setScreen('party'); } }).catch(() => {}); }; refresh(); const timerId = setInterval(refresh, 2000); return () => { cancelled = true; clearInterval(timerId); }; }, [activePartyCode, screen, mergeParty, openedGameCode]);
  const notify = (message: string) => { if (Platform.OS === 'web') window.alert(message); else Alert.alert('Chance Club', message); };
  const go = (next: Screen) => setScreen(next);
  const startGame = (selected: Game) => { setGame(selected); setRound(1); setShowAnswer(false); setScreen('game'); makePrompt(selected, 1); };
  const makePrompt = (selected: Game, nextRound: number) => { let prompt = ''; let answer = ''; roundRef.current=nextRound; switch(selected.id) {
    case 'categories': { const letters = locale==='ar'?'ابتثجحخدذرزسشصضطظعغفقكلمنهوي':'ABCDEFGHJKLMNPRSTW'; prompt = `${rand(locale==='ar'?PROMPTS_AR.categories:PROMPTS.categories)} · ${rand(letters.split(''))}`; break; }
    case 'whoami': prompt = rand(locale==='ar'?PROMPTS_AR.whoami:PROMPTS.whoami); break;
    case 'trivia': { const items=locale==='ar'?QUESTIONS_AR:QUESTIONS; const q=items[(nextRound-1)%items.length]; prompt=q.q; answer=q.a; break; }
    case 'charades': prompt = rand(locale==='ar'?PROMPTS_AR.charades:PROMPTS.charades); break;
    case 'wyr': case 'likely': prompt = rand(locale==='ar'?PROMPTS_AR[selected.id]:PROMPTS[selected.id]); break;
    case 'yesno': prompt = locale==='ar'?'اسأل الحظ ليقرر!':'Ask chance to decide!'; break;
    case 'dice': prompt = locale==='ar'?'ارمِ النرد':'Ready to roll?'; break;
    case 'coin': prompt = locale==='ar'?'اقلب العملة':'Flip the coin'; break;
    case 'wheel': prompt = locale==='ar'?'من سيختاره الحظ؟':'Who will chance pick?'; break;
    default: { const max = Math.max(2, Math.min(10000, Number(numberRange) || 100)); prompt = locale==='ar'?`اختر رقماً من ١ إلى ${max}`:`Pick a number from 1 to ${max}`; }
  } promptRef.current=prompt; setRoundText(prompt); setRoundAnswer(answer); setShowAnswer(false); };
  const nextRound = () => { if (!game) return; const n = round + 1; setRound(n); makePrompt(game, n); };
  const setGameOutcome = (prompt: string, answer: string) => { promptRef.current = prompt; setRoundText(prompt); setRoundAnswer(answer); };
  const saveProfile = async () => { if (!user) return; try { const res=await api('/me','PATCH',{name:profileName.trim(),preferred_language:locale,theme}); setUser(res.user); setProfileName(res.user.name); notify('Profile settings saved.'); } catch (e:any) { notify(e.message||s.error); } };
  const ensureIdentity = async () => { if (user) return { name: user.name }; if (guest) return guest; if (guestName.trim().length < 2) throw new Error(locale === 'ar' ? 'أدخل اسماً من حرفين على الأقل.' : 'Choose a display name with at least two characters.'); const res = await api('/guest','POST',{name:guestName.trim()}); await setToken(res.token); setGuest(res.guest); setGuestName(res.guest.name); AsyncStorage.setItem('cc-guest-name',res.guest.name).catch(()=>{}); return res.guest; };
  const applyParty = (value: Party) => { setParty(value); mergeParty(value); if(value.status==='playing'&&value.game&&value.round){setOpenedGameCode(value.code);setGame(GAMES.find(item=>item.id===value.game)||null);setRound(value.round.number);setRoundText(value.round.prompt);setScreen('game');} };
  const makeParty = async () => { setBusy(true); try { await ensureIdentity(); const res = await api('/parties','POST',{name:partyName.trim() || 'Game night'}); applyParty(res.data as Party); } catch (e:any) { notify(e.message || s.error); } finally { setBusy(false); } };
  const joinParty = async () => { if (!joinCode.trim()) return; setBusy(true); try { await ensureIdentity(); const res = await api(`/parties/${encodeURIComponent(joinCode.trim().toUpperCase())}/join`,'POST'); applyParty(res.data as Party); setScreen('party'); } catch (e:any) { notify(e.message || (locale==='ar'?'تعذر الانضمام. تحقق من الرمز.':'Could not join. Check the invite code and try again.')); } finally { setBusy(false); } };
  const toggleReady = async () => { if (!party) return; setBusy(true); try { const res=await api(`/parties/${encodeURIComponent(party.code)}/ready`,'POST',{ready:!party.members?.find(member=>member.id===party.self_player_id)?.ready}); applyParty(res.data as Party); } catch(e:any) { notify(e.message||s.error); } finally { setBusy(false); } };
  const launchPartyGame = async (selected: Game) => { if (!party || !party.is_host) return; setBusy(true); try { const res=await api(`/parties/${encodeURIComponent(party.code)}/start`,'POST',{game:selected.id,locale}); applyParty(res.data as Party); } catch(e:any) { notify(e.message||s.error); } finally { setBusy(false); } };
  const onlineAction = async (type:'answer'|'vote'|'roll'|'point', value?:string, targetPlayerId?:string) => { if (!party) return; try { const res=await api(`/parties/${encodeURIComponent(party.code)}/action`,'POST',{type,...(value?{value}:{}),...(targetPlayerId?{target_player_id:Number(targetPlayerId)}:{}),...(type==='roll'&&game?.id==='dice'?{count:diceCount}:{}),...(type==='roll'&&game?.id==='number'?{max:Number(numberRange)||100}:{})}); applyParty(res.data as Party); } catch(e:any) { notify(e.message||s.error); } };
  const advanceOnlineRound = async () => { if (!party) return; try { const res=await api(`/parties/${encodeURIComponent(party.code)}/advance`,'POST'); applyParty(res.data as Party); } catch(e:any) { notify(e.message||s.error); } };
  const createTeam = async () => { if (!teamName.trim()) return; const item: Team = { id: `team-${localRecordId()}`, name: teamName.trim(), members: [user?.name || 'You'] }; setBusy(true); try { if (user) Object.assign(item, (await api('/teams','POST',{name:item.name})).data); } catch { /* offline teams remain on this device */ } finally { setBusy(false); } persistTeams([item,...teams]); setTeamName(''); };
  const joinTeam = async () => { if (!teamCode.trim()) return; if (!user) { setAuthMode('login'); go('auth'); return; } setBusy(true); try { const res=await api(`/teams/${encodeURIComponent(teamCode.trim().toUpperCase())}/join`,'POST'); persistTeams([res.data,...teams.filter(x=>x.code!==res.data.code)]); setTeamCode(''); } catch (e:any) { notify(e.message||'Could not join this team.'); } finally { setBusy(false); } };
  const authenticate = async () => { if (!authEmail.trim() || !authPassword) return notify('Enter your email and password.'); setBusy(true); try { const res = await api(authMode==='register'?'/register':'/login','POST',{name:authName,email:authEmail,password:authPassword,password_confirmation:authPassword}); await setToken(res.token); setUser(res.user); setGuest(null); setProfileName(res.user.name); if (res.user.preferred_language) setLocale(res.user.preferred_language); if (res.user.theme) setTheme(res.user.theme); setAuthPassword(''); setScreen('profile'); const p = await api('/parties'); persistParties(p.data || []); const teamResult = await api('/teams'); persistTeams(teamResult.data || []); } catch (e: any) { notify(e.message || s.error); } finally { setBusy(false); } };
  const signOut = async () => { try { await api(user?'/logout':'/guest/logout','POST'); } catch {} await setToken(null); setUser(null); setGuest(null); go('home'); };
  const tab = (key: Screen, label: string, icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: screen===key }} onPress={() => go(key)} style={({ pressed }) => [styles.tab, screen===key && { backgroundColor:t.soft }, pressed && !reduceMotion && styles.pressed]}><MaterialCommunityIcons name={icon} size={18} color={screen===key?t.accent:t.muted} /><Text style={[styles.tabText,{color:screen===key?t.accent:t.muted}]}>{label}</Text></Pressable>;
  const desktopTab = (key: Screen, label: string, icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: screen===key }} onPress={() => go(key)} style={({ pressed }) => [styles.desktopTab, screen===key && { backgroundColor:t.soft }, pressed && !reduceMotion && styles.pressed]}><MaterialCommunityIcons name={icon} size={18} color={screen===key?t.accent:t.muted} /><Text style={[styles.desktopTabText,{color:screen===key?t.accent:t.muted}]}>{label}</Text></Pressable>;
  const button = (label: string, action: () => void, primary = false, disabled = false) => <Pressable accessibilityRole="button" onPress={action} disabled={disabled} style={({ pressed }) => [styles.button, primary ? { backgroundColor:t.accent } : { backgroundColor:t.card, borderColor:t.line, borderWidth:1 }, disabled&&{opacity:.55}, pressed && !reduceMotion && styles.pressed]}><Text style={[styles.buttonText,{color:primary?'#fff':t.text}]}>{label}</Text></Pressable>;
  const field = (label: string, value: string, set: (v:string)=>void, placeholder = '', secure = false, keyboardType?: 'email-address'|'default'|'number-pad') => <View style={styles.field}><Text style={[styles.label,{color:t.muted}]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={t.muted} secureTextEntry={secure} keyboardType={keyboardType} autoCapitalize={keyboardType==='email-address'?'none':'sentences'} style={[styles.input,{backgroundColor:t.card,borderColor:t.line,color:t.text,textAlign:rtl?'right':'left',fontFamily:fontFamily(rtl?'400':'400')}]} /></View>;
  const card = (children: React.ReactNode, extra: object = {}) => <View style={[styles.card,{backgroundColor:t.card,borderColor:t.line},extra]}>{children}</View>;
  const gameCardBasis = width < 480 ? '47%' : width < 1024 ? '31.5%' : '23.5%';
  const gameCards = (limit?: number, onChoose: (selected:Game)=>void = startGame) => <View style={[styles.gameGrid,{flexDirection:rtl?'row-reverse':'row'}]}>{sortedGames.slice(0,limit).map(g=><Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${locale==='ar'?g.ar:g.title}, ${locale==='ar'?g.tagAr:g.tag}`} onPress={()=>onChoose(g)} style={({ pressed }) => [styles.gameCard,{backgroundColor:t.card,borderColor:t.line,flexBasis:gameCardBasis,minWidth:width<360?120:width<480?140:145},pressed && !reduceMotion && styles.pressed]}><View style={[styles.gameIcon,{backgroundColor:`${g.color}1B`}]}><MaterialCommunityIcons name={g.icon} size={22} color={g.color} /></View><Text style={[styles.gameTitle,{color:t.text,textAlign:rtl?'right':'left'}]}>{locale==='ar'?g.ar:g.title}</Text><Text style={[styles.gameTag,{color:t.muted,textAlign:rtl?'right':'left'}]}>{locale==='ar'?g.tagAr:g.tag}</Text></Pressable>)}</View>;
  const title = (headline:string, sub?:string, extra?:string) => <View style={styles.titleBlock}><Text style={[styles.h1,{color:t.text,textAlign:rtl?'right':'left'}]}>{headline}</Text>{sub&&<Text style={[styles.body,{color:t.muted,textAlign:rtl?'right':'left'}]}>{sub}</Text>}{extra&&<Text style={[styles.caption,{color:t.muted,textAlign:rtl?'right':'left'}]}>{extra}</Text>}</View>;
  const openSavedParty = (saved: Party) => { setParty(saved); if (saved.status === 'playing') setOpenedGameCode(saved.code); setScreen(saved.status === 'playing' ? 'game' : 'party'); };
  const content = () => {
    if (screen==='home') return <>
      <View style={[styles.hero,{backgroundColor:theme==='light'?'#24212F':'#2B2737'}]}><Text style={styles.eyebrow}>CHANCE CLUB  ·  {s.hello}</Text><Text style={styles.heroTitle}>{s.title}</Text><Text style={styles.heroSub}>{s.sub}</Text><View style={[styles.heroButtons,{flexDirection:rtl?'row-reverse':'row'}]}>{button(s.host,()=>go('party'),true)}{button(s.browse,()=>go('games'))}</View>{width>=520&&<View style={[styles.heroOrb,rtl?{left:70,right:undefined}:{right:70,left:undefined}]}><MaterialCommunityIcons name="creation" size={64} color="#B5A7FF" /></View>}</View>
      <View style={styles.sectionHead}><Text style={[styles.h2,{color:t.text}]}>{s.featured}</Text><Pressable accessibilityRole="button" onPress={()=>go('games')}><Text style={{color:t.accent,fontWeight:'700'}}>{s.allgames} →</Text></Pressable></View>{gameCards(6)}
      <View style={styles.sectionHead}><Text style={[styles.h2,{color:t.text}]}>{s.yourparty}</Text></View>{card(<><Text style={[styles.cardTitle,{color:t.text}]}>{parties[0]?.name || s.empty}</Text><Text style={[styles.body,{color:t.muted}]}>{parties[0]?`${parties[0].players.length} ${s.members.toLowerCase()} · ${parties[0].code}`:s.teamHint}</Text>{button(parties[0]?'Open party':s.host,()=>parties[0]?(setParty(parties[0]),go('party')):go('party'),true)}</>)}
    </>;
    if (screen==='party') return <>{title(party?s.partyReady:s.newparty,party?`${party.name} · ${party.players.length} ${s.members.toLowerCase()}`:s.names)}{party ? <>{card(<><Text style={[styles.cardTitle,{color:t.text}]}>{party.name}</Text><Text style={[styles.body,{color:t.muted}]}>{s.invite}</Text><Text selectable style={[styles.code,{color:t.accent,backgroundColor:t.soft}]}>{party.code}</Text>{Platform.OS==='web'&&typeof window!=='undefined'&&<><Text style={[styles.label,{color:t.muted}]}>{s.shareLink}</Text><Text selectable style={[styles.caption,{color:t.accent}]}>{`${window.location.origin}${window.location.pathname}?join=${party.code}`}</Text><Text style={[styles.caption,{color:t.muted}]}>{s.linkNote}</Text></>}<View style={{gap:7,marginTop:12}}>{(party.members||[]).map(member=><View key={member.id} style={[styles.memberRow,{borderColor:t.line,flexDirection:rtl?'row-reverse':'row'}]}><Text style={[styles.body,{color:t.text,flex:1,marginTop:0}]}>{member.name}{member.is_host?` · ${s.hostLabel}`:''}</Text><Text style={[styles.caption,{color:member.ready?t.accent:t.muted,marginTop:0}]}>{member.online?s.connected:s.reconnecting} · {member.ready?s.ready:s.notReady} · {s.points}: {member.score}</Text></View>)}</View>{party.status==='lobby'&&button(party.members?.find(member=>member.id===party.self_player_id)?.ready?s.notReady:s.ready,toggleReady,false,busy)}<Text style={[styles.caption,{color:t.muted}]}>{user?s.online:guest?s.online:s.saved}</Text></>)}{party.status==='playing' ? <>{button(s.start,()=>go('game'),true)}<Text style={[styles.caption,{color:t.muted}]}>{party.round?`${s.round} ${party.round.number} · ${party.round.prompt}`:s.lobbyWait}</Text></> : <><Text style={[styles.h2,{color:t.text,marginTop:22}]}>{party.is_host?s.chooseGame:s.lobbyWait}</Text>{party.is_host?gameCards(undefined,launchPartyGame):<Text style={[styles.body,{color:t.muted}]}>{s.lobbyWait}</Text>}</>}{button(s.startOver,()=>{setParty(null);setGame(null);setScreen('party');})}</> : <>{card(<>{field(s.partyname,partyName,setPartyName)}{!user&&field(s.guest,guestName,setGuestName,'e.g. Noor')}{button(busy?s.loading:s.continue,makeParty,true,busy)}</>)}<View style={styles.sectionHead}><Text style={[styles.h2,{color:t.text}]}>{s.join}</Text></View>{card(<>{field(s.code,joinCode,setJoinCode,'AB12CD')}{!user&&field(s.guest,guestName,setGuestName,'e.g. Noor')}{button(busy?s.loading:s.joinAction,joinParty,false,busy)}</>)}{parties.filter(item=>item.status).length>0&&<><Text style={[styles.h2,{color:t.text,marginTop:20}]}>{s.yourparty}</Text>{parties.filter(item=>item.status).map(p=><Pressable key={p.code} onPress={()=>openSavedParty(p)}>{card(<><Text style={[styles.cardTitle,{color:t.text}]}>{p.name}</Text><Text style={[styles.caption,{color:t.muted}]}>{p.code} · {p.players.length} {s.members.toLowerCase()}</Text></>)}</Pressable>)}</>}</> }</>;
    if (screen==='games') return <>{title(s.allgames,s.chooseGame)}{gameCards()}</>;
    if (screen==='game'&&game) return <>{(!party||party.status!=='playing')&&game.id==='wheel'&&field(rtl?'الأسماء (افصل بينها بفواصل)':'Wheel names (comma separated)',wheelNames,setWheelNames,'Alex, Sam, Jordan')}{(!party||party.status!=='playing')&&game.id==='dice'&&<View style={[styles.row,{flexDirection:rtl?'row-reverse':'row'}]}>{[1,2].map(n=><Pressable key={n} accessibilityRole="button" accessibilityState={{selected:diceCount===n}} onPress={()=>setDiceCount(n)} style={[styles.pill,diceCount===n&&{backgroundColor:t.soft}]}><Text style={{color:diceCount===n?t.accent:t.text}}>{n===1?(rtl?'نرد واحد':'One die'):(rtl?'نردان':'Two dice')}</Text></Pressable>)}</View>}{(!party||party.status!=='playing')&&game.id==='number'&&field(rtl?'الحد الأعلى':'Maximum number',numberRange,setNumberRange,'100',false,'number-pad')}<GamePlay key={game.id} game={game} locale={locale} palette={t} round={round} prompt={roundText} answer={roundAnswer} showAnswer={showAnswer} playerNames={party?.players||[]} wheelNames={wheelNames} diceCount={diceCount} numberMax={numberRange} reduceMotion={reduceMotion} fontFamily={fontFamily} onReveal={()=>setShowAnswer(v=>!v)} onOutcome={setGameOutcome} onNext={nextRound} onBack={()=>go(party?'party':'games')} onlineInfo={party?.status==='playing'&&party.round?{isHost:!!party.is_host,selfPlayerId:party.self_player_id||null,turnPlayerId:party.round.turn_player_id,status:party.round.status,prompt:party.round.prompt,privateClue:party.round.private_clue,result:party.round.result,submitted:party.round.submitted,submissionCount:party.round.submission_count,submissionStatus:party.round.submission_status,scoredPlayerIds:party.round.scored_player_ids,members:party.members||[]}:undefined} onOnlineAction={onlineAction} onOnlineNext={advanceOnlineRound} /></>;
    if (screen==='teams') return <>{title(s.teamsTitle,s.teamHint)}{card(<>{field(s.newTeam,teamName,setTeamName,'The dream team')}{button(s.addTeam,createTeam,true)}</>)}{card(<>{field(s.teamInvite,teamCode,setTeamCode,'AB12CD')}{button(busy?s.loading:s.joinTeam,joinTeam,false,busy)}</>)}{teams.length?teams.map(team=><View key={team.id}>{card(<><Text style={[styles.cardTitle,{color:t.text}]}>{team.name}</Text><Text style={[styles.body,{color:t.muted}]}>{team.members.join(' · ')}</Text>{team.code&&<Text selectable style={[styles.caption,{color:t.accent}]}>{s.teamInvite}: {team.code}</Text>}</>)}</View>):card(<Text style={[styles.body,{color:t.muted}]}>{s.empty}</Text>)}</>;
    if (screen==='auth') return <>{title(authMode==='register'?s.signUp:s.signIn,s.teamHint)}{card(<>{authMode==='register'&&field(s.name,authName,setAuthName)}{field(s.email,authEmail,setAuthEmail,s.email,false,'email-address')}{field(s.password,authPassword,setAuthPassword,'',true)}{button(busy?s.loading:authMode==='register'?s.signUp:s.signIn,authenticate,true,busy)}<Pressable accessibilityRole="button" onPress={()=>setAuthMode(authMode==='register'?'login':'register')}><Text style={[styles.caption,{color:t.accent,textAlign:'center',marginTop:14}]}>{authMode==='register'?s.haveAccount:s.noAccount} {authMode==='register'?s.signIn:s.signUp}</Text></Pressable></>)}</>;
    return <>
      {title(s.profileTitle,user?.name||s.account,user?.email)}
      {user ? <>
        <View style={[styles.profileGrid,{flexDirection:desktop?(rtl?'row-reverse':'row'):'column'}]}>
          <View style={styles.profileColumn}>
            {card(<>
              <View style={[styles.profileIdentity,{flexDirection:rtl?'row-reverse':'row'}]}>
                <View style={[styles.avatarLarge,{backgroundColor:t.soft}]}><Text style={[styles.avatarInitial,{color:t.accent}]}>{user.name?.[0]?.toUpperCase()||'C'}</Text></View>
                <View style={styles.profileIdentityText}><Text style={[styles.profileName,{color:t.text,textAlign:rtl?'right':'left'}]}>{user.name}</Text><Text style={[styles.profileMeta,{color:t.muted,textAlign:rtl?'right':'left'}]}>{s.account} · {s.online}</Text></View>
              </View>
              {field(s.name,profileName,setProfileName)}
              <Text selectable style={[styles.body,{color:t.muted,marginTop:0}]}>{user.email}</Text>
            </>,styles.profilePanel)}
          </View>
          <View style={styles.profileColumn}>
            {card(<>
              <View style={[styles.settingsHeader,{flexDirection:rtl?'row-reverse':'row'}]}><View style={[styles.settingsIcon,{backgroundColor:t.soft}]}><MaterialCommunityIcons name="tune-variant" size={19} color={t.accent} /></View><View><Text style={[styles.cardTitle,{color:t.text}]}>{s.settings}</Text><Text style={[styles.caption,{color:t.muted,marginTop:3}]}>{s.theme} · {s.language}</Text></View></View>
              <View style={styles.settingBlock}><Text style={[styles.label,{color:t.muted}]}>{s.theme}</Text><View style={[styles.row,{flexDirection:rtl?'row-reverse':'row'}]}>{(['light','dark'] as Theme[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:theme===x}} onPress={()=>setTheme(x)} style={({pressed})=>[styles.pill,theme===x&&{backgroundColor:t.soft,borderColor:t.accent},pressed&&!reduceMotion&&styles.pressed]}><MaterialCommunityIcons name={x==='light'?'white-balance-sunny':'moon-waning-crescent'} size={16} color={theme===x?t.accent:t.muted} /><Text style={{color:theme===x?t.accent:t.text}}>{x==='light'?s.light:s.dark}</Text></Pressable>)}</View></View>
              <View style={styles.settingBlock}><Text style={[styles.label,{color:t.muted}]}>{s.language}</Text><View style={[styles.row,{flexDirection:rtl?'row-reverse':'row'}]}>{(['en','ar'] as Locale[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:locale===x}} onPress={()=>setLocale(x)} style={({pressed})=>[styles.pill,locale===x&&{backgroundColor:t.soft,borderColor:t.accent},pressed&&!reduceMotion&&styles.pressed]}><MaterialCommunityIcons name="translate" size={16} color={locale===x?t.accent:t.muted} /><Text style={{color:locale===x?t.accent:t.text}}>{x==='en'?s.english:s.arabic}</Text></Pressable>)}</View></View>
            </>,styles.profilePanel)}
          </View>
        </View>
        <View style={[styles.profileActions,{flexDirection:rtl?'row-reverse':'row'}]}>{button(s.save,saveProfile,true,busy)}{button(s.signOut,signOut)}</View>
      </> : <>
        <View style={[styles.profileGrid,{flexDirection:desktop?(rtl?'row-reverse':'row'):'column'}]}>
          <View style={styles.profileColumn}>{card(<><View style={[styles.settingsHeader,{flexDirection:rtl?'row-reverse':'row'}]}><View style={[styles.settingsIcon,{backgroundColor:t.soft}]}><MaterialCommunityIcons name="account-circle-outline" size={20} color={t.accent} /></View><View><Text style={[styles.cardTitle,{color:t.text}]}>{s.account}</Text><Text style={[styles.caption,{color:t.muted,marginTop:3}]}>{s.teamHint}</Text></View></View>{button(s.signIn,()=>{setAuthMode('login');go('auth')},true)}{button(s.signUp,()=>{setAuthMode('register');go('auth')})}</>,styles.profilePanel)}</View>
          <View style={styles.profileColumn}>{card(<><View style={[styles.settingsHeader,{flexDirection:rtl?'row-reverse':'row'}]}><View style={[styles.settingsIcon,{backgroundColor:t.soft}]}><MaterialCommunityIcons name="tune-variant" size={19} color={t.accent} /></View><View><Text style={[styles.cardTitle,{color:t.text}]}>{s.settings}</Text><Text style={[styles.caption,{color:t.muted,marginTop:3}]}>{s.saved}</Text></View></View><View style={styles.settingBlock}><Text style={[styles.label,{color:t.muted}]}>{s.theme}</Text><View style={[styles.row,{flexDirection:rtl?'row-reverse':'row'}]}>{(['light','dark'] as Theme[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:theme===x}} onPress={()=>setTheme(x)} style={({pressed})=>[styles.pill,theme===x&&{backgroundColor:t.soft,borderColor:t.accent},pressed&&!reduceMotion&&styles.pressed]}><MaterialCommunityIcons name={x==='light'?'white-balance-sunny':'moon-waning-crescent'} size={16} color={theme===x?t.accent:t.muted} /><Text style={{color:theme===x?t.accent:t.text}}>{x==='light'?s.light:s.dark}</Text></Pressable>)}</View></View><View style={styles.settingBlock}><Text style={[styles.label,{color:t.muted}]}>{s.language}</Text><View style={[styles.row,{flexDirection:rtl?'row-reverse':'row'}]}>{(['en','ar'] as Locale[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:locale===x}} onPress={()=>setLocale(x)} style={({pressed})=>[styles.pill,locale===x&&{backgroundColor:t.soft,borderColor:t.accent},pressed&&!reduceMotion&&styles.pressed]}><MaterialCommunityIcons name="translate" size={16} color={locale===x?t.accent:t.muted} /><Text style={{color:locale===x?t.accent:t.text}}>{x==='en'?s.english:s.arabic}</Text></Pressable>)}</View></View></>,styles.profilePanel)}</View>
        </View>
      </>}
    </>;
  };
  return <AppTypography.Provider value={{ fontFamily, rtl }}><View style={[styles.root,{backgroundColor:t.bg}]}>
    <StatusBar style={theme==='dark'?'light':'dark'} />
    <View style={[styles.topbar,{backgroundColor:t.bg,borderColor:t.line,paddingHorizontal:width<600?16:width<1024?24:32,flexDirection:rtl?'row-reverse':'row'}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Chance Club home" onPress={()=>go('home')} style={({pressed})=>[styles.brand,pressed&&!reduceMotion&&styles.pressed]}>
        <View style={[styles.brandMark,{backgroundColor:t.accent}]}><MaterialCommunityIcons name="dice-multiple-outline" size={19} color="#fff" /></View>
        <View><Text style={[styles.brandText,{color:t.text}]}>Chance Club</Text>{desktop&&<Text style={[styles.brandTag,{color:t.muted}]}>PLAY TOGETHER</Text>}</View>
      </Pressable>
      {desktop&&<View style={[styles.desktopNav,{flexDirection:rtl?'row-reverse':'row'}]}>
        {desktopTab('home',s.home,'home-variant-outline')}{desktopTab('party',s.party,'party-popper')}{desktopTab('games',s.games,'gamepad-variant-outline')}{desktopTab('teams',s.teams,'account-group-outline')}{desktopTab('profile',s.profile,'account-circle-outline')}
      </View>}
      <View style={[styles.topActions,{flexDirection:rtl?'row-reverse':'row'}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={s.language} onPress={()=>setLocale(locale==='en'?'ar':'en')} style={({pressed})=>[styles.topPill,{borderColor:t.line,backgroundColor:t.card},pressed&&!reduceMotion&&styles.pressed]}><MaterialCommunityIcons name="translate" size={16} color={t.muted} /><Text style={{color:t.text}}>{locale==='en'?'عربي':'EN'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={s.profile} onPress={()=>go('profile')} style={({pressed})=>[styles.avatar,{backgroundColor:t.soft},pressed&&!reduceMotion&&styles.pressed]}><Text style={{color:t.accent,fontWeight:'800'}}>{(user?.name||guest?.name)?.[0]?.toUpperCase()||'A'}</Text></Pressable>
      </View>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.page,{paddingHorizontal:width<600?16:width<1024?32:48,paddingTop:width<600?20:32,paddingBottom:desktop?48:24}]} keyboardShouldPersistTaps="handled">
      <View key={screen} nativeID="cc-screen" style={[styles.content,{maxWidth:desktop?1280:940}]}>{content()}<Text style={[styles.footer,{color:t.muted}]}>CHANCE CLUB  ·  PLAY MORE, SCROLL LESS</Text></View>
    </ScrollView>
    {!desktop&&<View style={[styles.nav,{backgroundColor:t.card,borderColor:t.line,flexDirection:rtl?'row-reverse':'row'}]}>{tab('home',s.home,'home-variant-outline')}{tab('party',s.party,'party-popper')}{tab('games',s.games,'gamepad-variant-outline')}{tab('teams',s.teams,'account-group-outline')}{tab('profile',s.profile,'account-circle-outline')}</View>}
  </View></AppTypography.Provider>;
}

const styles = StyleSheet.create({
  root:{flex:1,minHeight:'100vh' as any}, scroll:{flex:1},
  topbar:{height:76,paddingHorizontal:24,borderBottomWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  brand:{flexDirection:'row',alignItems:'center',gap:11}, brandMark:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center'}, brandText:{fontSize:17,fontWeight:'800',letterSpacing:-.4}, brandTag:{fontSize:8,fontWeight:'700',letterSpacing:1.5,marginTop:2},
  topActions:{flexDirection:'row',alignItems:'center',gap:10}, topPill:{height:38,minWidth:64,paddingHorizontal:12,borderWidth:1,borderRadius:20,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7}, avatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  desktopNav:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4}, desktopTab:{minHeight:44,paddingHorizontal:12,borderRadius:14,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8}, desktopTabText:{fontSize:13,fontWeight:'600'},
  page:{paddingHorizontal:20,paddingTop:30,paddingBottom:42}, content:{width:'100%',maxWidth:940,alignSelf:'center'},
  hero:{minHeight:300,borderRadius:28,padding:32,overflow:'hidden',justifyContent:'center'}, eyebrow:{fontSize:10,color:'#D0C9F8',letterSpacing:1.4,fontWeight:'700',marginBottom:15}, heroTitle:{fontSize:42,lineHeight:48,color:'#fff',fontWeight:'800',letterSpacing:-1.1,maxWidth:560}, heroSub:{fontSize:15,lineHeight:23,color:'#D6D3DC',maxWidth:470,marginTop:12}, heroButtons:{flexDirection:'row',gap:10,marginTop:22,flexWrap:'wrap'}, heroOrb:{position:'absolute',right:70,top:62,width:150,height:150,borderRadius:75,backgroundColor:'#4A405F',alignItems:'center',justifyContent:'center',opacity:.8},
  sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:30,marginBottom:14}, h1:{fontSize:32,fontWeight:'800',letterSpacing:-.7}, h2:{fontSize:19,fontWeight:'700'}, body:{fontSize:14,lineHeight:21,marginTop:7}, caption:{fontSize:12,lineHeight:18,marginTop:10}, titleBlock:{marginBottom:20,marginTop:2}, card:{borderWidth:1,borderRadius:20,padding:20,marginBottom:14}, cardTitle:{fontSize:18,fontWeight:'700'},
  code:{fontSize:30,fontWeight:'800',letterSpacing:5,textAlign:'center',padding:15,borderRadius:13,overflow:'hidden',marginVertical:15}, button:{minHeight:46,paddingHorizontal:18,paddingVertical:12,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:10,alignSelf:'flex-start'}, buttonText:{fontSize:14,fontWeight:'700'}, pressed:{opacity:.88,transform:[{scale:.985}]}, field:{marginBottom:14}, label:{fontSize:12,fontWeight:'700',marginBottom:7}, input:{borderWidth:1,borderRadius:13,paddingHorizontal:14,paddingVertical:12,fontSize:15,minHeight:48},
  gameGrid:{flexDirection:'row',flexWrap:'wrap',gap:14}, gameCard:{flexGrow:0,flexShrink:0,minWidth:145,minHeight:136,borderWidth:1,borderRadius:20,padding:17,marginBottom:1,justifyContent:'flex-start'}, gameIcon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center',marginBottom:14}, gameTitle:{fontSize:14,fontWeight:'700',lineHeight:20}, gameTag:{fontSize:11,marginTop:5},
  actions:{flexDirection:'row',gap:10,flexWrap:'wrap',marginTop:4}, prompt:{fontSize:27,lineHeight:36,fontWeight:'800',letterSpacing:-.5}, answer:{fontSize:22,fontWeight:'800',textAlign:'center',marginTop:17}, row:{flexDirection:'row',gap:9,flexWrap:'wrap',marginTop:6}, pill:{minHeight:40,paddingHorizontal:14,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:'#B8B3C6',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7}, settingBlock:{marginTop:19},
  profileGrid:{flexDirection:'row',gap:16,alignItems:'stretch'}, profileColumn:{flex:1,minWidth:0}, profilePanel:{borderRadius:22,padding:22,minHeight:202}, profileIdentity:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:22}, avatarLarge:{width:62,height:62,borderRadius:22,alignItems:'center',justifyContent:'center'}, avatarInitial:{fontSize:26,fontWeight:'800'}, profileIdentityText:{flex:1,minWidth:0}, profileName:{fontSize:21,fontWeight:'800'}, profileMeta:{fontSize:12,marginTop:4}, settingsHeader:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12}, settingsIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'}, profileActions:{flexDirection:'row',gap:10,flexWrap:'wrap',marginTop:4},
  memberRow:{minHeight:38,borderBottomWidth:1,alignItems:'center',gap:10,paddingVertical:5}, nav:{height:72,borderTopWidth:1,flexDirection:'row',justifyContent:'space-around',alignItems:'center',paddingHorizontal:8,paddingTop:5}, tab:{flex:1,minWidth:0,maxWidth:140,paddingHorizontal:4,paddingVertical:8,borderRadius:14,alignItems:'center',justifyContent:'center',gap:4,marginHorizontal:3}, tabText:{fontSize:10,fontWeight:'600'}, footer:{fontSize:9,textAlign:'center',letterSpacing:1.2,marginTop:26,marginBottom:6}
});
