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
  ar: `تفاحة,موزة,بيتزا,كيكة,بسكويت,أيس كريم,جزرة,طماطم,بيضة,جبنة,عيش,قهوة,بطيخ,عنب,
ليمون,كرزة,فشار,قطة,كلب,سمكة,عصفورة,حصان,بقرة,خروف,أرنب,قرد,فيل,زرافة,
أسد,نمر,دب,تعبان,سلحفاة,ضفدعة,عنكبوت,فراشة,نحلة,بطة,بطريق,قرش,حوت,أخطبوط,
كابوريا,بومة,جمل,بيت,عربية,أتوبيس,قطر,طيارة,مركب,عجلة,صاروخ,هليكوبتر,تراكتور,خيمة,
قلعة,كوبري,برج,فنار,مدرسة,مستشفى,هرم,شمس,قمر,نجمة,سحابة,مطر,قوس قزح,راجل تلج,
شجرة,وردة,جبل,بركان,جزيرة,نهر,البحر,صحرا,نار,برق,كرسي,ترابيزة,سرير,أباجورة,
ساعة,باب,شباك,مفتاح,شمسية,شمعة,مراية,تليفزيون,تليفون,كمبيوتر,كاميرا,نضارة,شنطة,مقص,
شاكوش,سلم,مقشة,جردل,طاقية,جزمة,شراب,قميص,تاج,خاتم,سلسلة,سيف,درع,علم,
بالونة,هدية,كتاب,قلم,جيتار,بيانو,طبلة,كمان,كورة,كاس,تنين,روبوت,عفريت,قرصان,
ساحر,ملك,رائد فضا,مهرج,عروسة البحر,ندفة تلج,قلب,جمجمة,عضمة,عين,إيد,سنة,مناخير,فطيرة,
سجق,أناناس,فراولة,برجر,مكرونة,سوشي,كب كيك,مصاصة,براد شاي,طاسة,معلقة,شوكة,إزازة,فنجان,
تلاجة,فرن,محمصة توست,بانيو,فرشة سنان,صابون,فوطة,أرجوحة شبكية,كنبة,مخدة,بطانية,دولاب,مدخنة,سور,
نافورة,تمثال,أبو الهول,جامع,نخلة,صبار,دوار الشمس,مشروم,ورقة شجر,بلوط,حلزونة,دعسوقة,عقرب,تمساح,
فرس النهر,حمار وحشي,كانجارو,باندا,كوالا,ببغا,طاووس,فلامنجو,نسر,خفاش,سنجاب,قنفد,قنديل البحر,نجمة البحر,
حصان البحر,استاكوزا,مدفع,مرساة,بوصلة,صندوق كنز,تليسكوب,ميكروسكوب,كورة أرضية,قمر صناعي,سفينة فضا,كائن فضائي,كوكب,مذنب,
سكيت,سكوتر,كرسي متحرك,باراشوت,منطاد,قطار الموت,عجلة دوارة,أرجوحة,زحليقة,ترامبولين,دمبل,جوانتي ملاكمة,حارس مرمى,حكم,
مشجعة,سنوبورد,سنارة,قوس وسهم,ميكروفون,سماعات,راديو,كاميرا فيديو,لابتوب,ريموت,بطارية,فيشة,لمبة,مغناطيس,
مكنسة كهربا,غسالة,صندوق بريد,إشارة مرور,عربية شرطة,عربية مطافي,مخيم,نار مخيم,إيجلو,قلعة رمل,سيرف,محقق,شيف,دكتور,
ممرضة,رجل مطافي,فلاح,
كشري,فول,طعمية,حواوشي,ملوخية,بسبوسة,كنافة,قطايف,جوافة,مانجا,بلح,عرقسوس,مشبك غسيل,زير,طبلية,حصيرة,مروحة,سخان,بوتاجاز,قفة,كرسي هزاز,ترمس,سلة مهملات,فانوس,دبوس,إبرة وخيط,ديك رومي,حمامة,بجعة,هدهد`.replace(/\n/g, '').split(','),
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
