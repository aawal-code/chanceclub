// Server-held word banks. Words never leave the server except to the drawer (and at turn end).
module.exports = {
  en: `apple,banana,pizza,burger,cake,cookie,ice cream,carrot,tomato,egg,cheese,bread,coffee,watermelon,grapes,lemon,cherry,popcorn,sandwich,donut,
cat,dog,fish,bird,horse,cow,pig,sheep,rabbit,monkey,elephant,giraffe,lion,tiger,bear,snake,turtle,frog,spider,butterfly,bee,duck,penguin,shark,whale,octopus,crab,dolphin,owl,camel,
house,car,bus,train,airplane,boat,bicycle,rocket,helicopter,tractor,truck,ambulance,submarine,tent,castle,bridge,tower,lighthouse,windmill,school,hospital,
sun,moon,star,cloud,rain,rainbow,snowman,tree,flower,mountain,volcano,island,river,beach,desert,fire,lightning,tornado,
chair,table,bed,lamp,clock,door,window,key,umbrella,candle,mirror,television,telephone,computer,keyboard,camera,glasses,backpack,suitcase,scissors,hammer,ladder,broom,bucket,
hat,shoe,sock,shirt,crown,ring,necklace,watch,sword,shield,flag,balloon,gift,book,pencil,guitar,piano,drum,violin,trumpet,
football,basketball,tennis,trophy,medal,kite,robot,ghost,dragon,pirate,wizard,king,astronaut,clown,mermaid,snowflake,heart,skull,bone,eye,hand,tooth,nose,smile,
pancake,sausage,pineapple,strawberry,hamburger,spaghetti,sushi,cupcake,lollipop,teapot,frying pan,spoon,fork,bottle,cup,fridge,oven,toaster,bathtub,toothbrush,soap,towel,hammock,sofa,pillow,blanket,wardrobe,staircase,chimney,fence,fountain,statue,pyramid,sphinx,mosque,palm tree,cactus,sunflower,mushroom,leaf,acorn,snail,ladybug,scorpion,crocodile,hippo,zebra,kangaroo,panda,koala,parrot,peacock,flamingo,eagle,bat,squirrel,hedgehog,jellyfish,starfish,seahorse,lobster,cannon,anchor,compass,treasure chest,telescope,microscope,globe,satellite,spaceship,alien,planet,comet,skateboard,scooter,wheelchair,parachute,hot air balloon,roller coaster,ferris wheel,swing,slide,trampoline,dumbbell,boxing glove,goalkeeper,referee,cheerleader,snowboard,fishing rod,bow and arrow,microphone,headphones,radio,laptop,remote control,battery,plug,light bulb,magnet,vacuum cleaner,washing machine,mailbox,traffic light,police car,fire truck,campfire,igloo,sandcastle,surfboard,magician,detective,chef,doctor,nurse,firefighter,farmer`.replace(/\n/g, '').split(','),
  de: `Apfel,Banane,Pizza,Kuchen,Keks,Eis,Karotte,Tomate,Ei,Käse,Brot,Kaffee,Wassermelone,Trauben,Zitrone,Kirsche,Brezel,Wurst,
Katze,Hund,Fisch,Vogel,Pferd,Kuh,Schwein,Schaf,Hase,Affe,Elefant,Giraffe,Löwe,Tiger,Bär,Schlange,Schildkröte,Frosch,Spinne,Schmetterling,Biene,Ente,Pinguin,Hai,Wal,Krake,Krabbe,Eule,Kamel,
Haus,Auto,Bus,Zug,Flugzeug,Boot,Fahrrad,Rakete,Hubschrauber,Traktor,Lastwagen,Zelt,Burg,Brücke,Turm,Leuchtturm,Windmühle,Schule,
Sonne,Mond,Stern,Wolke,Regen,Regenbogen,Schneemann,Baum,Blume,Berg,Vulkan,Insel,Fluss,Strand,Wüste,Feuer,Blitz,
Stuhl,Tisch,Bett,Lampe,Uhr,Tür,Fenster,Schlüssel,Regenschirm,Kerze,Spiegel,Fernseher,Telefon,Computer,Kamera,Brille,Rucksack,Koffer,Schere,Hammer,Leiter,Besen,Eimer,
Hut,Schuh,Socke,Hemd,Krone,Ring,Halskette,Schwert,Schild,Flagge,Luftballon,Geschenk,Buch,Bleistift,Gitarre,Klavier,Trommel,Geige,
Fußball,Pokal,Drache,Roboter,Gespenst,Pirat,Zauberer,König,Astronaut,Clown,Meerjungfrau,Schneeflocke,Herz,Totenkopf,Knochen,Auge,Hand,Zahn,Nase,
Pfannkuchen,Ananas,Erdbeere,Hamburger,Spaghetti,Sushi,Muffin,Lutscher,Teekanne,Bratpfanne,Löffel,Gabel,Flasche,Tasse,Kühlschrank,Ofen,Toaster,Badewanne,Zahnbürste,Seife,Handtuch,Hängematte,Sofa,Kissen,Decke,Kleiderschrank,Treppe,Schornstein,Zaun,Brunnen,Statue,Pyramide,Sphinx,Moschee,Palme,Kaktus,Sonnenblume,Pilz,Blatt,Eichel,Schnecke,Marienkäfer,Skorpion,Krokodil,Nilpferd,Zebra,Känguru,Panda,Koala,Papagei,Pfau,Flamingo,Adler,Fledermaus,Eichhörnchen,Igel,Qualle,Seestern,Seepferdchen,Hummer,Kanone,Anker,Kompass,Schatzkiste,Teleskop,Mikroskop,Globus,Satellit,Raumschiff,Außerirdischer,Planet,Komet,Skateboard,Roller,Rollstuhl,Fallschirm,Heißluftballon,Achterbahn,Riesenrad,Schaukel,Rutsche,Trampolin,Hantel,Boxhandschuh,Torwart,Schiedsrichter,Cheerleader,Snowboard,Angelrute,Pfeil und Bogen,Mikrofon,Kopfhörer,Radio,Fotoapparat,Laptop,Fernbedienung,Batterie,Stecker,Glühbirne,Magnet,Staubsauger,Waschmaschine,Briefkasten,Ampel,Polizeiauto,Feuerwehrauto,Zeltlager,Lagerfeuer,Iglu,Schneekristall,Sandburg,Surfbrett,Magier,Detektiv,Koch,Arzt,Krankenschwester,Feuerwehrmann,Bauer`.replace(/\n/g, '').split(','),
  ar: `تفاحة,موزة,بيتزا,كعكة,بسكويت,آيس كريم,جزرة,طماطم,بيضة,جبن,خبز,قهوة,بطيخ,عنب,ليمون,كرزة,فشار,
قطة,كلب,سمكة,عصفور,حصان,بقرة,خروف,أرنب,قرد,فيل,زرافة,أسد,نمر,دب,ثعبان,سلحفاة,ضفدع,عنكبوت,فراشة,نحلة,بطة,بطريق,قرش,حوت,أخطبوط,سرطان,بومة,جمل,
بيت,سيارة,حافلة,قطار,طائرة,قارب,دراجة,صاروخ,مروحية,جرار,خيمة,قلعة,جسر,برج,منارة,مدرسة,مستشفى,هرم,
شمس,قمر,نجمة,سحابة,مطر,قوس قزح,رجل ثلج,شجرة,وردة,جبل,بركان,جزيرة,نهر,شاطئ,صحراء,نار,برق,
كرسي,طاولة,سرير,مصباح,ساعة,باب,نافذة,مفتاح,مظلة,شمعة,مرآة,تلفاز,هاتف,حاسوب,كاميرا,نظارة,حقيبة,مقص,مطرقة,سلم,مكنسة,دلو,
قبعة,حذاء,جورب,قميص,تاج,خاتم,عقد,سيف,درع,علم,بالون,هدية,كتاب,قلم,جيتار,بيانو,طبل,كمان,
كرة قدم,كأس,تنين,روبوت,شبح,قرصان,ساحر,ملك,رائد فضاء,مهرج,حورية البحر,ندفة ثلج,قلب,جمجمة,عظمة,عين,يد,سن,أنف,
فطيرة,نقانق,أناناس,فراولة,همبرغر,سباغيتي,سوشي,كب كيك,مصاصة,إبريق شاي,مقلاة,ملعقة,شوكة,زجاجة,فنجان,ثلاجة,فرن,محمصة خبز,حوض استحمام,فرشاة أسنان,صابون,منشفة,أرجوحة شبكية,أريكة,وسادة,بطانية,خزانة ملابس,درج,مدخنة,سياج,نافورة,تمثال,أبو الهول,مسجد,نخلة,صبار,عباد الشمس,فطر,ورقة,بلوط,حلزون,دعسوقة,عقرب,تمساح,فرس النهر,حمار وحشي,كنغر,باندا,كوالا,ببغاء,طاووس,فلامنغو,نسر,خفاش,سنجاب,قنفذ,قنديل البحر,نجمة البحر,حصان البحر,كركند,مدفع,مرساة,بوصلة,صندوق كنز,تلسكوب,مجهر,كرة أرضية,قمر صناعي,سفينة فضاء,كائن فضائي,كوكب,مذنب,لوح تزلج,سكوتر,كرسي متحرك,مظلة هبوط,منطاد,قطار الموت,عجلة دوارة,أرجوحة,زحليقة,ترامبولين,دمبل,قفاز ملاكمة,حارس مرمى,حكم,مشجعة,لوح تزلج ثلجي,صنارة,قوس وسهم,ميكروفون,سماعات,راديو,آلة تصوير,حاسوب محمول,جهاز تحكم,بطارية,قابس,لمبة,مغناطيس,مكنسة كهربائية,غسالة,صندوق بريد,إشارة مرور,سيارة شرطة,سيارة إطفاء,مخيم,نار مخيم,بيت جليدي,قلعة رملية,لوح ركوب الأمواج,محقق,طباخ,طبيب,ممرضة,رجل إطفاء,مزارع`.replace(/\n/g, '').split(','),
};

// Tiered banks: backend/content/draw.<locale>.txt ([medium] / [hard] sections). Legacy lists above count as easy.
(function loadTiers() {
  const fs = require('fs'), path = require('path');
  const dirs = [process.env.CONTENT_DIR, '/var/www/html/content', path.join(__dirname, '..', 'content')].filter(Boolean);
  const tiers = {};
  for (const loc of Object.keys(module.exports)) {
    const easy = module.exports[loc].slice();
    const t = { easy, medium: [], hard: [] };
    for (const d of dirs) {
      const f = path.join(d, `draw.${loc}.txt`);
      if (!fs.existsSync(f)) continue;
      let cur = null;
      for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\[(\w+)\]/);
        if (m) { cur = t[m[1]] ? m[1] : null; continue; }
        if (cur) for (const w of line.split(',')) { const x = w.trim(); if (x && !t.easy.includes(x) && !t.medium.includes(x) && !t.hard.includes(x)) t[cur].push(x); }
      }
      break;
    }
    tiers[loc] = t;
    module.exports[loc] = [...t.easy, ...t.medium, ...t.hard];
  }
  Object.defineProperty(module.exports, 'tiers', { value: tiers, enumerable: false });
})();
