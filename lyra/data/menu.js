/* Meniul complet Restaurant Lyra — extras din meniu_lyra_nou_mai_2026 (31 pagini).
   Câmpuri: id, n (nr. din meniu), c (categorie), ro/hu (nume), d/dh (descriere RO/HU), p (preț lei), g (gramaj),
   al (alergeni), m (carne: porc/vita/pui/peste), hot (tigaie fierbinte), img, t (etichete), w (vin recomandat),
   v (variante de porție: [{l, lh, p, g}]), q (de verificat cu restaurantul). */
const CATS = [
  {id:"antreuri",ro:"Antreuri",hu:"Előételek"},
  {id:"dejun",ro:"Mic dejun",hu:"Reggeli",note:["Spanacul cu ochiuri se servește între 08:00–22:00","A spenótfőzelék 08:00–22:00 között kapható"]},
  {id:"nou",ro:"Noutăți",hu:"Új fogás"},
  {id:"platouri",ro:"Platouri",hu:"Tálak",note:["Pentru 2–3 persoane","2–3 személyre"]},
  {id:"specialitati",ro:"Specialitățile restaurantului",hu:"Az étterem specialitásai",note:["Din BBQ Pit Box Smoker-ul Lyra, gătite lent","A Lyra BBQ Pit Box Smokerből, lassan főzve"]},
  {id:"smash",ro:"Smash Burgers",hu:"Smash burgerek",note:["Nou: burgeri smash by Lyra","Új: smash burgerek by Lyra"]},
  {id:"burger",ro:"Lyra's Burger",hu:"Lyra's Burger",note:["Preparate la foc pe cărbune · chiflă artizanală, producție proprie","Faszénen készítve · saját készítésű kézműves zsemle"]},
  {id:"supe",ro:"Supe, ciorbe",hu:"Levesek",note:["Între orele 10:00–21:00","10 és 21 óra között"]},
  {id:"porc",ro:"Preparate din porc",hu:"Sertéshús ételek"},
  {id:"ardeal",ro:"Bucătăria transilvăneană",hu:"Erdélyi konyha"},
  {id:"pui",ro:"Preparate din pui",hu:"Csirke ételek"},
  {id:"peste",ro:"Preparate din pește",hu:"Halételek"},
  {id:"paste",ro:"Paste",hu:"Tészták"},
  {id:"salate",ro:"Salate",hu:"Saláták"},
  {id:"vegetariene",ro:"Preparate vegetariene",hu:"Vegetáriánus ételek"},
  {id:"post",ro:"Preparate de post",hu:"Böjti ételek"},
  {id:"kids",ro:"Lyra Kids",hu:"Lyra Kids"},
  {id:"garnituri",ro:"Garnituri",hu:"Köretek"},
  {id:"muraturi",ro:"Salate & murături",hu:"Saláták, savanyúságok"},
  {id:"sosuri",ro:"Sosuri",hu:"Szószok"},
  {id:"desert",ro:"Desert",hu:"Desszert"}
];
const FS = "Fetească Regală Pivnița Savu", CB = "Chardonnay Barrique Pivnița Savu", SB = "Sauvignon Blanc Pivnița Savu";
const MEDIE = (p, g) => ({l:"Porție medie", lh:"Közepes adag", p, g});
const M = [
 /* ---------- Antreuri ---------- */
 {id:"duo-vinete",n:1,c:"antreuri",ro:"Duo de vinete și zacuscă cu focaccia home made",hu:"Padlizsánkrém és zakuszka házi készítésű focacciával",d:"Salată de vinete și zacuscă, servite cu focaccia făcută în casă",dh:"Padlizsánkrém és zakuszka, házi focacciával",p:36,g:"100/100/30/100 gr",al:["gluten","ou"],img:"duo-vinete",t:["veg","home"],w:FS},
 {id:"pita-carbune",n:2,c:"antreuri",ro:"Pită prăjită la cuptor pe cărbune",hu:"Sütőben sült pirított kenyér szénen",d:"Cu slană și brânză de burduf, ceapă",dh:"Szalonnával és juhtúróval, hagymával",p:27,g:"100/100/50/30 gr",al:["gluten","lactoza"],m:"porc",hot:1,img:"pita-carbune",t:["coal"]},
 {id:"gustare",n:3,c:"antreuri",ro:"Gustare țărănească",hu:"Paraszti falatok",d:"Cârnați uscați, jumări, brânză de burduf, slănină, ceapă, roșii, castraveți",dh:"Száraz kolbász, tepertő, juhtúró, szalonna, hagyma, paradicsom, uborka",p:39,g:"40/40/60/40/60/60 gr",al:["lactoza","gluten"],m:"porc",img:"gustare"},
 {id:"focaccia-untura",n:4,c:"antreuri",ro:"Focaccia cu untură, ceapă și gem de ardei iute",hu:"Focaccia zsírral, hagymával és erőspaprika-krémmel",d:"Focaccia făcută în casă, untură, ceapă, gem de ardei iute",dh:"Házi focaccia, zsír, hagyma, erőspaprika-krém",p:25,g:"100 gr",al:["gluten"],img:"focaccia-untura",t:["home"]},
 {id:"platou-branzeturi",n:5,c:"antreuri",ro:"Platou brânzeturi",hu:"Sajttál",d:"Brânză maturată cu busuioc, brânză maturată cu trufe, Floare de Colț (Camembert), brânză maturată Apuseni, brânză dură tip parmezan",dh:"Érlelt sajt bazsalikommal, érlelt sajt szarvasgombával, Floare de Colț (camembert), érlelt Apuseni sajt, parmezán jellegű kemény sajt",p:42,g:"25/25/25/25 gr",al:["lactoza"],img:"platou-branzeturi",t:["veg"]},

 /* ---------- Mic dejun ---------- */
 {id:"bruschete",n:6,c:"dejun",ro:"Bruschete țărănești",hu:"Paraszti bruschetta",d:"Cu ou ochi, cartofi prăjiți și telemea, brânză de burduf, slănină, ceapă",dh:"Tükörtojással, sült burgonyával és juhtúróval",p:45,g:"100/30/150 gr",al:["gluten","ou"],m:"porc",hot:1,img:"bruschete"},
 {id:"english",n:7,c:"dejun",ro:"Mic dejun englezesc",hu:"Angol reggeli",d:"Cârnăciori cu cașcaval, ochiuri, guanciale, fasole în sos tomat, focaccia făcută în casă",dh:"Kolbászkák sajttal, tükörtojás, guanciale, babos paradicsomszósz, focaccia",p:47,g:"50/100/100/100/50 gr",al:["gluten","ou"],m:"porc",hot:1,img:"english"},
 {id:"omleta",n:8,c:"dejun",ro:"Omletă cu șuncă și cașcaval",hu:"Sonkával és sajttal rántotta",d:"Ouă, șuncă, cașcaval",dh:"Tojás, sonka, sajt",p:35,g:"300 gr",al:["lactoza","ou"],hot:1,img:"omleta"},
 {id:"spanac",n:9,c:"dejun",ro:"Spanac cu ochiuri",hu:"Spenótfőzelék tükörtojással",d:"Ouă, spanac, usturoi, cremă de gătit vegetală",dh:"Tojás, spenót, fokhagyma, növényi főzőkrém",p:38,g:"200/100 gr",al:["ou"],hot:1,img:"spanac",t:["veg"]},
 {id:"oua-posate",n:10,c:"dejun",ro:"Ouă poșate cu salată",hu:"Posírozott tojás salátával",d:"Mix salată, cremă de avocado, conopidă, rodie, sparanghel, dressing miere",dh:"Salátamix, avokádókrém, karfiol, gránátalma, spárga, mézes öntet",p:43,g:"300 gr",al:["lactoza","ou"],img:"oua-posate",t:["veg"]},
 {id:"paine-ou",n:8,c:"dejun",ro:"Pâine cu ou",hu:"Bundás kenyér",d:"",dh:"",p:35,g:"300 gr",al:["lactoza","ou"],img:"paine-ou",t:["veg"],q:"Are tot nr. 8, ca Omleta. Lipsește descrierea."},

 /* ---------- Noutăți ---------- */
 {id:"antricot",n:11,c:"nou",ro:"Antricot de vită la grătar",hu:"Grillezett marha hátszín (entrecôte)",d:"Alături de cartofi copți în coajă și rozmarin",dh:"Héjában sült burgonyával és rozmaringgal",p:145,g:"200/250 gr",al:["lactoza"],m:"vita",hot:1,img:"antricot",t:["garn"]},
 {id:"muschi",n:12,c:"nou",ro:"Mușchi de vită cu sos de piper",hu:"Marhabélszín borsmártással",d:"Piper murat, frișcă de gătit și piure de cartofi",dh:"Savanyított borssal, főzőtejszínnel és burgonyapürével",p:165,g:"160/150/100 gr",al:["lactoza"],m:"vita",img:"muschi",t:["garn"]},
 {id:"tocanita",n:13,c:"nou",ro:"Tocăniță de vițel cu găluște",hu:"Borjúpörkölt galuskával",d:"Pulpă de vită Black Angus, legume, paste",dh:"Black Angus marhapecsenye, zöldségek, tészta",p:66,g:"250/150 gr",al:["gluten","ou","telina"],m:"vita",hot:1,img:"tocanita",t:["angus"]},

 /* ---------- Platouri ---------- */
 {id:"platou-lyra",n:17,c:"platouri",ro:"Platou à la Lyra · 2–3 persoane",hu:"Vegyes tál Lyra módra · 2–3 személyre",d:"Ceafă de porc, cârnați de porc, costițe de porc, pulpă de porc, slănină, ciolan, piure de cartofi, cartofi în coajă cu parmezan, murături asortate, sos usturoi, sosul casei",dh:"Sertésnyak, sertéskolbász, sertésoldalas, sertéscomb, szalonna, csülök, burgonyapüré, héjas burgonya parmezánnal, vegyes savanyúság, fokhagymás szósz, házi szósz",p:290,g:"160/150/160/250/240/250/240/100/200/90/90 gr",al:["ou","mustar","lactoza"],m:"porc",hot:1,img:"platou-lyra",t:["share"]},
 {id:"platou-pui",n:18,c:"platouri",ro:"Platou de pui asortat · 2–3 persoane",hu:"Szárnyas vegyes tál · 2–3 személyre",d:"Aripioare de pui, crispy de pui, cordon bleu, șnițel Palermo, rondele de ceapă, cartofi copți în coajă, crochete din mozzarella, sosul casei, usturoi, murătură asortată",dh:"Csirkeszárnyak, csirkegrill, cordon bleu, Palermo szelet, hagymakarikák, héjában sült krumpli, mozzarella krokettek, házi szósz, fokhagyma, vegyes savanyúság",p:270,g:"600/500/90/60/90 gr",al:["gluten","ou","telina","lactoza"],m:"pui",hot:1,img:"platou-pui",t:["share"]},

 /* ---------- Specialitățile restaurantului ---------- */
 {id:"ciolan-varza",n:15,c:"specialitati",ro:"Ciolan fraged pe pat de varză roșie călită",hu:"Puha csülök vöröskáposzta ágyon",d:"Ciolan, varză, frișcă de gătit",dh:"Csülök, káposzta, főzőtejszín",p:85,g:"600/250/100 gr",al:["lactoza","seminte"],m:"porc",img:"ciolan-varza"},
 {id:"iahnie-ciolan",n:16,c:"specialitati",ro:"Iahnie de fasole cu ciolan afumat",hu:"Babfőzelék füstölt csülökkel",d:"Și ardei iute",dh:"És csípős paprikával",p:69,g:"350/200 gr",al:["gluten"],m:"porc",hot:1,img:"iahnie-ciolan"},
 {id:"sarmale",n:19,c:"specialitati",ro:"Sarmale cu ciolan și mămăliguță prăjită",hu:"Töltött káposzta füstölt csülökkel és pirított puliszkával",d:"Sarmale, ciolan de porc, ardei iute, smântână",dh:"Töltött káposzta, sertéscsülök, csípős paprika, tejföl",p:60,g:"400/100/90/45 gr",al:["lactoza"],m:"porc",hot:1,img:"sarmale",t:["casa"]},
 {id:"fasii-carnuri",n:20,c:"specialitati",ro:"Fâșii de cărnuri mixte ușor picante",hu:"Vegyes húscsíkok krumplival",d:"Piept de pui, mușchi de porc, înăbușite în legume (ceapă, usturoi, ardei gras, ciuperci), cartofi de casă copți în coajă și prăjiți cu ceapă și slănină",dh:"Csirke, sertés, zöldséges ágyban párolva (hagyma, fokhagyma, paprika, gomba), majd szalonnás, hagymás burgonyával tálalva",p:63,g:"100/100/100/250 gr",al:["soia"],m:"porc",hot:1,img:"fasii-carnuri",t:["garn","spicy"]},
 {id:"costite",n:21,c:"specialitati",ro:"Costițe Lyra fragede afumate cu sos BBQ",hu:"Lyra omlós, füstölt sertésoldalas BBQ szósszal",d:"Cu cartofi copți cu usturoi",dh:"Fokhagymás sült burgonyával",p:79,g:"300/150/100/40 gr",al:["gluten"],m:"porc",hot:1,img:"costite",t:["garn","casa","smoker"]},
 {id:"ceafa-afumata",n:22,c:"specialitati",ro:"Felie de ceafă afumată",hu:"Füstölt tarjaszeletek",d:"Gătită lent la temperatură joasă pentru păstrarea frăgezimii, cu piure de cartofi și sos brun",dh:"Alacsony hőmérsékleten, lassan főzve a porhanyósság megőrzéséért; krumplipüré, barna szósz",p:57,g:"180/150/50 gr",al:["telina","ou","lactoza"],m:"porc",hot:1,img:"ceafa-afumata",t:["garn","casa","smoker"]},
 {id:"pulled-pork",n:23,c:"specialitati",ro:"Pulled pork în cartof copt",hu:"Pulled pork sült krumpliban",d:"În cartof copt cu cașcaval și salată coleslaw, porumb; spată de porc gătită la foc lent în stil BBQ",dh:"Sült krumpli sajttal és coleslaw saláta, kukorica; lassú tűzön főtt sertés BBQ stílusban",p:47,g:"300/100 gr",al:["telina","ou","lactoza"],m:"porc",hot:1,img:"pulled-pork",t:["smoker"]},
 {id:"pulpa-smoker",n:24,c:"specialitati",ro:"Pulpă Pork Smoker cu piure de cartofi",hu:"Smokerben füstölt sertéscomb burgonyapürével",d:"Servită cu varză murată de casă; pulpă de porc gătită la foc lent în stil BBQ, piper, guanciale",dh:"Házi savanyú káposztával; lassan sült sertéscomb BBQ stílusban, bors, guanciale",p:59,g:"200/150 gr",al:["lactoza"],m:"porc",hot:1,img:"pulpa-smoker",t:["garn","smoker"]},

 /* ---------- Smash Burgers ---------- */
 {id:"double-smash",c:"smash",ro:"Double Smash",hu:"Double Smash",d:"2 × 60 g carne de vită, castraveți murați, brânză cheddar, sos burger, ceapă, unt, salată iceberg",dh:"2 × 60 g marhahús, csemegeuborka, cheddar, burger szósz, hagyma, vaj, jégsaláta",p:35,g:"2 × 60 g vită",al:["gluten","lactoza"],m:"vita",img:"double-smash",t:["new"],q:"Alergenii nu sunt în meniu; i-am dedus (chiflă, cheddar)."},
 {id:"spicy-smash",c:"smash",ro:"Spicy Smash",hu:"Spicy Smash",d:"2 × 60 g carne de vită, castraveți murați, brânză cheddar, sos Vifon, jalapeño, unt, ceapă, salată iceberg",dh:"2 × 60 g marhahús, csemegeuborka, cheddar, Vifon szósz, jalapeño, vaj, hagyma, jégsaláta",p:35,g:"2 × 60 g vită",al:["gluten","lactoza"],m:"vita",img:"spicy-smash",t:["new","spicy"],q:"Alergenii nu sunt în meniu; i-am dedus (chiflă, cheddar)."},
 {id:"smash",c:"smash",ro:"Smash Burger",hu:"Smash Burger",d:"1 × 60 g carne de vită, brânză cheddar, castraveți murați, sos burger, ceapă, unt, salată iceberg",dh:"1 × 60 g marhahús, cheddar, csemegeuborka, burger szósz, hagyma, vaj, jégsaláta",p:25,g:"1 × 60 g vită",al:["gluten","lactoza"],m:"vita",img:"smash",t:["new"],q:"Alergenii nu sunt în meniu; i-am dedus (chiflă, cheddar)."},
 {id:"special-fries",c:"smash",ro:"Special Fries",hu:"Special Fries",d:"Cartofi pai, brânză cheddar, bacon crocant, sos burger, chives (arpagic verde)",dh:"Hasábburgonya, cheddar, ropogós bacon, burger szósz, metélőhagyma",p:21,g:"200 gr",al:["lactoza"],m:"porc",img:"special-fries"},

 /* ---------- Lyra's Burger ---------- */
 {id:"chicken-burger",n:25,c:"burger",ro:"Meniu Chicken Burger",hu:"Chicken Burger menü",d:"Chiflă, dulceață de ceapă, salată iceberg, chiftea din pui 80%, slănină de porc 20%, brânză cheddar, sos burger, cartofi prăjiți și sosul casei, parmezan",p:56,g:"80 chiflă, 120 chiftea, 90 ingrediente, 150 cartofi, 40 sos gr",al:["gluten","lactoza"],m:"pui",img:"chicken-burger"},
 {id:"ozn-pulled",n:26,c:"burger",ro:"Meniu OZN Pulled Pork",hu:"OZN Pulled Pork menü",d:"Chiflă, spată de porc, cașcaval, salată coleslaw, sos BBQ, cartofi prăjiți și sosul casei, parmezan",p:49.5,g:"80 chiflă, 120 pulled porc, 120 ingrediente, 150 cartofi, 40 sos gr",al:["mustar","gluten","lactoza"],m:"porc",img:"ozn-pulled"},
 {id:"crispy-burger",n:27,c:"burger",ro:"Meniu Crispy Burger",hu:"Crispy Burger menü",d:"Crispy de pui de casă, cașcaval, salată, sos burger, cartofi prăjiți și sosul casei, parmezan",p:48.5,g:"80 chiflă, 100 crispy, 90 ingrediente, 150 cartofi, 40 sos gr",al:["gluten","lactoza"],m:"pui",img:"crispy-burger"},
 {id:"eleven-burger",n:28,c:"burger",ro:"Meniu Eleven Burger",hu:"Eleven Burger menü",d:"Chiflă, dulceață de ceapă, salată iceberg, chiftea din vită Black Angus, brânză cheddar, bacon, sos burger, cartofi prăjiți și sosul casei, parmezan",p:64.5,g:"80 chiflă, 100 chiftea, 90 ingrediente, 150 cartofi, 40 sos gr",al:["gluten","lactoza"],m:"vita",img:"eleven-burger",t:["angus"]},
 {id:"burger-ozn",n:29,c:"burger",ro:"Burger OZN",hu:"OZN Burger",d:"Chiftea Black Angus, salată iceberg, roșii, ceapă, sos burger, parmezan, cartofi, sos brânzeturi",p:60,g:"80/100/70/150/100 gr",al:["gluten","lactoza"],m:"vita",img:"burger-ozn",t:["angus"]},
 {id:"veggie-ozn",n:30,c:"burger",ro:"Meniu Veggie Burger OZN",hu:"Veggie OZN Burger menü",d:"Chiflă, brânză cheddar, salată iceberg, ceapă caramelizată, legume, chiftea veggie, ciuperci, cartofi prăjiți și sosul casei, parmezan",p:64,g:"80 chiflă, 100 chiftea veggie, 90 ingrediente, 150 cartofi, 40 sos gr",al:["mustar","gluten","lactoza"],img:"veggie-ozn",t:["veg"],w:SB},

 /* ---------- Supe, ciorbe ---------- */
 {id:"supa-crema",n:31,c:"supe",ro:"Supă cremă de legume",hu:"Zöldségkrémleves",d:"Crutoane de pâine, morcovi, țelină, mazăre, cartofi, roșii, varză, cremă de gătit",dh:"Zsemlekockákkal, sárgarépa, zeller, zöldborsó, krumpli, paradicsom, káposzta",p:29,g:"400/30 gr",al:["mustar","gluten","lactoza"],img:"supa-crema",t:["veg"],w:SB,v:[{l:"Porție întreagă",lh:"Egész adag",p:29,g:"400/30 gr"},MEDIE(22,"200/15 gr")]},
 {id:"ciorba-legume-supe",n:32,c:"supe",ro:"Ciorbă de legume",hu:"Zöldségleves",d:"Cu morcovi, țelină, mazăre, cartofi, roșii, varză",dh:"Sárgarépa, zeller, borsó, burgonya, paradicsom, káposzta",p:29,g:"400 gr",al:["telina"],img:"ciorba-legume2",t:["veg"],v:[{l:"Porție întreagă",lh:"Egész adag",p:29,g:"400 gr"},MEDIE(22,"200 gr")]},
 {id:"supa-pui",n:33,c:"supe",ro:"Supă de pui cu tăiței",hu:"Tyúkhúsleves",d:"Carne de pui, paste (fidea cu ou), morcov",dh:"Csirke, laska (tojásos metélt), sárgarépa",p:29,g:"350/50 gr",al:["gluten","telina","ou"],m:"pui",img:"supa-pui",v:[{l:"Porție întreagă",lh:"Egész adag",p:29,g:"350/50 gr"},MEDIE(18,"175/25 gr")]},
 {id:"ciorba-vita",n:34,c:"supe",ro:"Ciorbă de legume și carne de vită",hu:"Zöldségleves marhahússal",d:"Carne de vită, morcovi, țelină, mazăre, cartofi, roșii, varză, conopidă",dh:"Marhahús, sárgarépa, zeller, borsó, burgonya, paradicsom, káposzta, karfiol",p:34,g:"350/50 gr",al:["telina"],m:"vita",img:"ciorba-vita",v:[{l:"Porție întreagă",lh:"Egész adag",p:34,g:"350/50 gr"},MEDIE(23,"175/25 gr")]},
 {id:"ciorba-fasole-ciolan",n:35,c:"supe",ro:"Ciorbă de fasole cu ciolan afumat",hu:"Bableves füstölt csülökkel",d:"Cu ciolan de porc afumat",dh:"Füstölt sertéscsülökkel",p:32,g:"350/50 gr",al:["lactoza","telina"],m:"porc",img:"ciorba-fasole-ciolan",v:[{l:"Porție întreagă",lh:"Egész adag",p:32,g:"350/50 gr"},MEDIE(23,"175/25 gr")]},
 {id:"supa-salata",n:36,c:"supe",ro:"Supă de salată verde cu mămăliguță",hu:"Zöldsalátaleves puliszkával",d:"Brânză de burduf, slănină, smântână, franjuri de omletă",dh:"Juhtúró, szalonna, tejszín, omlettcsíkok",p:54,g:"400/300/70/30 gr",al:["gluten","lactoza"],m:"porc",img:"supa-salata",t:["casa"]},
 {id:"ciorba-pita-ciolan",n:37,c:"supe",ro:"Ciorbă de fasole în pită prăjită",hu:"Bableves pirított kenyércipóban",d:"Cu ciolan de porc afumat și ceapă roșie",dh:"Sertéscsülökkel, piros hagymával",p:39.5,g:"350/60/50 gr",al:["gluten","lactoza","telina"],m:"porc",img:"fasole-pita2"},
 {id:"gulas",n:38,c:"supe",ro:"Supă gulaș",hu:"Gulyásleves",d:"Cu carne de vită, cartofi, găluște și ardei iute",dh:"Marhahússal, burgonyával, galuskával és csípős paprikával",p:39,g:"300/70 gr",al:["lactoza","ou"],m:"vita",img:"gulas",t:["spicy"]},
 {id:"burta",n:39,c:"supe",ro:"Ciorbă de burtă",hu:"Pacalleves",d:"Ou, burtă, lezon, supă de oase · rețetă proprie",dh:"Tojás, pacal, habarcs, csontleves · saját recept",p:34,g:"300/120 gr",al:["ou","lactoza"],m:"vita",img:"burta",t:["casa"]},
 {id:"lascute",n:40,c:"supe",ro:"Ciorbă de lășcuțe cu ciolan",hu:"Csipetkés leves csülökkel",d:"Legume, lășcuțe, smântână, ou, ciolan, tarhon și ardei iute",dh:"Zöldségekkel, laskatésztával, tejföllel, tojással, füstölt csülökkel, tárkonnyal és csípős paprikával",p:27,g:"400 ml/50 gr",al:["ou","lactoza"],m:"porc",img:"lascute"},

 /* ---------- Preparate din porc ---------- */
 {id:"ciolan-lyra",n:41,c:"porc",ro:"Ciolan à la Lyra cu cartofi petală și cașcaval",hu:"Csülök Lyra módra",d:"Servit pe pat de cartofi cu cașcaval, sos de hrean cu usturoi, cremă de gătit, smântână",dh:"Sajtos burgonyaágyon tálalva, fokhagymás tormamártással, főzőtejszínnel és tejföllel",p:55,g:"180/110/50 gr",al:["gluten","mustar","soia","ou","lactoza","telina"],m:"porc",hot:1,img:"ciolan-lyra",t:["garn","casa"]},
 {id:"ceafa-tiganeasca",n:42,c:"porc",ro:"Ceafă țigănească fragedă și cartofi Lyra",hu:"Omlós cigánypecsenye tarja és Lyra burgonya",d:"Ceafă de porc, mujdeiul casei, boia, slănină prăjită, cartofi cu usturoi și cașcaval",dh:"Sertéstarja házi fokhagymamártással, pirospaprikával, sült szalonnával, fokhagymás-sajtos burgonyával",p:68,g:"170/250/45/75 gr",al:["lactoza"],m:"porc",hot:1,img:"ceafa-tiganeasca",t:["coal","garn"]},
 {id:"carne-garnita",n:43,c:"porc",ro:"Carne la garniță",hu:"Omlós sertéshúsdarabok",d:"Prăjită lent în untură, usturoi, gust autentic de odinioară: ceafă de porc, ciolan de porc, cârnați de porc, usturoi, untură condimentată, mămăliguță prăjită, ochi, telemea",dh:"Lassan, zsírban és fokhagymával sütve, a régi idők igazi íze: sertésnyak, sertéscsülök, sertéskolbász, fokhagyma, fűszeres zsír, sült puliszka, tükörtojás, túró",p:63,g:"220/150/50 gr",al:["gluten","mustar"],m:"porc",hot:1,img:"carne-garnita",t:["casa"]},
 {id:"mititei",n:44,c:"porc",ro:"Mititei cu muștar · bucata",hu:"Miccs mustárral · darab",d:"Preț pe bucată, cu muștar",dh:"Darabár, mustárral",p:9.5,g:"1 buc / 70/20 gr",al:["gluten","mustar"],m:"porc",img:"mititei"},
 {id:"mix-grill",n:45,c:"porc",ro:"Mix grill Lyra",hu:"Mix grill Lyra",d:"2 mititei, 1 ceafă de porc, cartofi prăjiți cu usturoi și cașcaval",dh:"2 miccs, 1 szelet sertéstarja, hasábburgonya fokhagymával és sajttal",p:49,g:"350 gr",al:["gluten","mustar"],m:"porc",img:"mix-grill",t:["garn"]},
 {id:"snitel-lyra",n:48,c:"porc",ro:"Șnițel Lyra din cotlet",hu:"Lyra karaj szelet",d:"Cotlet de porc, sos ciuperci, cașcaval, cheddar, șuncă, smântână vegetală, ou",dh:"Sertéstarja, gombás szósz, cheddar, sajt, sonka, növényi tejszín",p:57,g:"350 gr",al:["lactoza","ciuperci","ou"],m:"porc",hot:1,img:"snitel-lyra",w:CB},

 /* ---------- Bucătăria transilvăneană ---------- */
 {id:"fasole-batuta",n:46,c:"ardeal",ro:"Fasole bătută cu cârnați de casă",hu:"Tört bab házi kolbásszal",d:"Prăjiți în untură și ceapă călită",dh:"Zsírban sütve, pirított hagymával",p:59,g:"250/150 gr",al:["gluten","soia","lactoza"],m:"porc",hot:1,img:"fasole-batuta"},
 {id:"papricas",n:47,c:"ardeal",ro:"Papricaș de pui cu mămăliguță prăjită",hu:"Csirkepaprikás puliszkával",d:"Pulpă de pui, ceapă, ardei, cremă vegetală pentru gătit",dh:"Csirkecomb, hagyma, paprika, főzéshez növényi krém",p:45,g:"300/130 gr",al:["gluten","ou","telina"],m:"pui",hot:1,img:"papricas"},
 {id:"ficatei",n:49,c:"ardeal",ro:"Ficăței la tigaie rumeniți cu dulceață de ceapă",hu:"Serpenyőben pirított csirkemáj hagymalekvárral",d:"",dh:"",p:47,g:"250/130 gr",al:["gluten"],m:"pui",hot:1,img:"ficatei",q:"Lipsește descrierea în meniu."},

 /* ---------- Preparate din pui ---------- */
 {id:"piept-lyra",n:50,c:"pui",ro:"Piept de pui à la Lyra",hu:"Csirkemell Lyra módra",d:"Piept de pui la grătar, ciuperci, șuncă de pui, cașcaval cheddar, cremă de gătit",dh:"Csirkemell, gomba, sonka, sajt, cheddar sajt, főzőkrém",p:39,g:"80/100/40/40 gr",al:["gluten","mustar","soia","lactoza","telina"],m:"pui",hot:1,img:"piept-lyra",w:FS,t:["nogarn"]},
 {id:"borzas",n:51,c:"pui",ro:"Borzaș",hu:"Borzás",d:"Piept de pui, cartofi răzuiți, ou, usturoi, smântână, sos de usturoi",dh:"Csirkemell, reszelt burgonya, tojás, fokhagyma, tejföl, fokhagymás szósz",p:49,g:"300 gr",al:["ou","lactoza","telina"],m:"pui",img:"borzas",w:FS,v:[{l:"Porție întreagă",lh:"Egész adag",p:49,g:"300 gr"},MEDIE(32,"200 gr")]},
 {id:"cordon-bleu",n:52,c:"pui",ro:"Cordon bleu cu cartofi à la Lyra",hu:"Cordon bleu burgonyával à la Lyra",d:"Șuncă de pui, cașcaval, cartofi cu usturoi, ou",dh:"Sajt, sonka, fokhagymás burgonya és sajt",p:49,g:"150/250 gr",al:["ou","soia","mustar","gluten","lactoza","telina"],m:"pui",hot:1,img:"cordon-bleu",w:FS,t:["garn"]},
 {id:"salata-pui",n:53,c:"pui",ro:"Salată cu piept de pui",hu:"Csirkemell saláta",d:"Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, piept de pui",dh:"Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, csirkemell",p:52,g:"150/80/30 gr",al:["soia","ou","seminte"],m:"pui",img:"salata-pui",w:FS},
 {id:"crispy-pui",n:54,c:"pui",ro:"Crispy de pui cu cartofi prăjiți",hu:"Ropogós csirke sült burgonyával",d:"Piept de pui, fulgi de porumb, sos de usturoi, parmezan, iaurt",dh:"Csirkemell, kukoricapehely, fokhagymás szósz, parmezán",p:42,g:"300/150/90 gr",al:["gluten","lactoza"],m:"pui",img:"crispy-pui",w:CB,t:["casa","garn"]},
 {id:"piept-carbune",n:55,c:"pui",ro:"Piept de pui la foc de cărbune",hu:"Csirkemell faszénen sütve",d:"Piept de pui gătit în cuptorul pe cărbune",dh:"Faszenes kemencében sült csirkemell",p:36,g:"100/200 gr",al:["mustar","telina"],m:"pui",hot:1,img:"piept-carbune",w:FS,t:["coal","nogarn"]},
 {id:"piept-vienez",n:56,c:"pui",ro:"Piept de pui vienez",hu:"Bécsi szelet csirkemellből",d:"Piept de pui, făină, ou, pesmet panko",dh:"Csirkemell, tojás, prézli",p:39,g:"230 gr",al:["gluten","lactoza"],m:"pui",img:"piept-vienez",t:["nogarn"]},
 {id:"piept-palermo",n:57,c:"pui",ro:"Piept de pui Palermo",hu:"Palermói csirkemell",d:"Piept de pui, ouă, cașcaval",dh:"Csirkemell, tojás, sajt",p:46,g:"300 gr",al:["gluten","mustar","ou","lactoza","telina"],m:"pui",img:"piept-palermo",t:["nogarn"]},

 /* ---------- Preparate din pește ---------- */
 {id:"pastrav",n:58,c:"peste",ro:"Păstrăv proaspăt din Munții Călimani",hu:"Friss pisztráng a Kelemen-havasokból",d:"Gătit la foc de cărbune, simplu, pentru a păstra gustul autentic de munte, cu mămăliguță prăjită și mujdeiul casei",dh:"Faszénen sütve, egyszerűen, a hegyek hamisítatlan ízéért, pirított puliszkával és házi fokhagymamártással",p:65,g:"190/150/45 gr",al:["mustar","peste"],m:"peste",hot:1,img:"pastrav",t:["coal","garn"]},
 {id:"biban",n:59,c:"peste",ro:"File de biban pane",hu:"Rántott süllőfilé",d:"Cu cartofi petale și sosul casei",dh:"Sziromburgonyával és házi szósszal",p:63,g:"120/250/100 gr",al:["gluten","peste"],m:"peste",img:"biban",t:["garn"]},

 /* ---------- Paste ---------- */
 {id:"carbonara",n:60,c:"paste",ro:"Penne Carbonara",hu:"Carbonara penne",d:"Guanciale, ou, parmezan, cremă de gătit",dh:"Guanciale, tojás, főzőtejszín, parmezán",p:46,g:"250/50/50/30 gr",al:["gluten","ou","telina"],m:"porc",img:"carbonara"},
 {id:"bolognese",n:61,c:"paste",ro:"Penne Bolognese",hu:"Bolognai penne",d:"Carne de vită tocată, legume, parmezan",dh:"Darált marhahús, zöldség, parmezán",p:46,g:"250/120/30 gr",al:["gluten","ou","telina"],m:"vita",img:"bolognese"},

 /* ---------- Salate ---------- */
 {id:"halloumi",n:62,c:"salate",ro:"Salată Halloumi",hu:"Halloumi saláta",d:"Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, halloumi",dh:"Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, halloumi",p:47,g:"400 gr",al:["ou","telina","lactoza"],img:"halloumi",t:["veg"]},
 {id:"camembert",n:63,c:"salate",ro:"Camembert pane cu gem de afine și salată de sezon",hu:"Rántott camembert áfonyalekvárral és salátával",d:"Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, camembert",dh:"Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, camembert",p:62,g:"170/100/50 gr",al:["lactoza"],img:"camembert",t:["veg"]},

 /* ---------- Vegetariene ---------- */
 {id:"snitel-vegetal",n:64,c:"vegetariene",ro:"Șnițel vegetal Lyra",hu:"Lyra vegetáriánus szelet",d:"Șnițel veggie, sos ciuperci, cheddar, cașcaval, smântână vegetală",dh:"Vegetáriánus rántott szelet, gombás szósz, cheddar sajt, trappista sajt, növényi tejszín",p:53,g:"250 gr",al:["lactoza"],hot:1,img:"snitel-vegetal",t:["veg"]},
 {id:"papricas-ciuperci",n:65,c:"vegetariene",ro:"Papricaș de ciuperci",hu:"Gombapaprikás sült puliszkával",d:"Cu mămăligă prăjită, ceapă, ardei, pastă de tomate, ciuperci, hribi, cremă de gătit",dh:"Hagyma, paprika, paradicsompüré, gomba, vargánya, főzőtejszín",p:42,g:"250/100 gr",al:["gluten","soia","lactoza"],img:"papricas-ciuperci",t:["veg"]},
 {id:"mamaliguta-branza",n:66,c:"vegetariene",ro:"Mămăliguță cu brânză",hu:"Puliszka sajttal",d:"Cu smântână și ceapă condimentată",dh:"Tejföllel és fűszerezett hagymával",p:35,g:"300/150/100 gr",al:["lactoza"],img:"mamaliguta-branza",t:["veg"]},
 {id:"veggie-burger-veg",n:67,c:"vegetariene",ro:"Veggie Burger OZN",hu:"Veggie OZN Burger",d:"Chiflă, cheddar, salată iceberg, ceapă caramelizată, legume, ciuperci, chiftea veggie, cartofi prăjiți, sos cașcaval",dh:"Zsemle, cheddar, jégsaláta, karamellizált hagyma, zöldségek, vega fasírt, sült krumpli",p:64,g:"300/150 gr",al:["gluten","lactoza"],hot:1,img:"veggie-ozn2",t:["veg"],q:"Apare și ca nr. 30 la Lyra's Burger, cu altă descriere. Păstrăm ambele?"},
 {id:"cartofi-taranesti-veg",n:68,c:"vegetariene",ro:"Cartofi țărănești",hu:"Parasztburgonya",d:"Cartofi, ceapă, boia, condimente",dh:"Burgonya, hagyma, pirospaprika, fűszerek",p:15,g:"180 gr",al:["lactoza","gluten"],img:"cartofi-taranesti",t:["veg"],q:"Apare și la Garnituri (nr. 81) cu 200 gr. Care e corect?"},
 {id:"cascaval-pane",n:69,c:"vegetariene",ro:"Cașcaval pane",hu:"Rántott sajt",d:"Cașcaval, ou, pesmet",dh:"Sajt, tojás, prézli",p:31,g:"120 gr",al:["telina"],img:"cascaval-pane",w:FS,t:["veg","nogarn"]},

 /* ---------- Post ---------- */
 {id:"ciorba-legume",n:71,c:"post",ro:"Ciorbă de legume",hu:"Zöldségleves",d:"",dh:"",p:29,g:"400 gr",al:["telina"],img:"ciorba-legume",t:["post"]},
 {id:"ciorba-fasole",n:72,c:"post",ro:"Ciorbă de fasole",hu:"Bableves",d:"",dh:"",p:29,g:"400 gr",al:[],img:"ciorba-fasole",t:["post"]},
 {id:"ciorba-pita",n:73,c:"post",ro:"Ciorbă de fasole în pită prăjită",hu:"Bableves pirított kenyércipóban",d:"",dh:"",p:37,g:"270/400/50 gr",al:["gluten"],img:"ciorba-pita",t:["post"],q:"În meniu titlul începe cu „68.” (greșeală de tipar)."},
 {id:"iahnie-soia",n:74,c:"post",ro:"Iahnie de fasole cu șnițel soia",hu:"Babpörkölt szójaszelettel",d:"",dh:"",p:52,g:"250/130 gr",al:["lactoza"],img:"iahnie-soia",t:["post"]},

 /* ---------- Lyra Kids ---------- */
 {id:"kids-supa-pui",n:75,c:"kids",ro:"Supă de pui cu tăiței",hu:"Tyúkhúsleves",d:"Porție pentru copii",dh:"Gyerekadag",p:16,g:"280 ml/20 gr",al:["ou","telina","gluten"],m:"pui",img:"kids-supa-pui"},
 {id:"kids-supa-crema",n:76,c:"kids",ro:"Supă cremă de legume",hu:"Zöldségkrémleves",d:"Cu cremă de gătit și crutoane",dh:"Főzőtejszínnel és krutonnal",p:16,g:"250 ml/15 gr",al:["telina","gluten","soia"],img:"kids-supa-crema",t:["veg"]},
 {id:"kids-dino",n:77,c:"kids",ro:"Dino de pui",hu:"Csirke dínók",d:"Cu cartofi prăjiți și sos de usturoi",dh:"Hasábburgonyával és fokhagymás szósszal",p:33,g:"75/100/45 gr",al:["mustar","gluten"],m:"pui",img:"kids-dino"},
 {id:"kids-crispy",n:78,c:"kids",ro:"Crispy de pui",hu:"Ropogós csirke",d:"Cu cartofi prăjiți și sos de usturoi",dh:"Hasábburgonyával és fokhagymás szósszal",p:33,g:"150/100/45 gr",al:["mustar","gluten"],m:"pui",img:"kids-crispy"},
 {id:"kids-carbonara",n:79,c:"kids",ro:"Penne Carbonara cu șuncă de pui",hu:"Carbonara penne csirkesonkával",d:"Porție pentru copii",dh:"Gyerekadag",p:29,g:"150/50/100/30 gr",al:["ou","mustar","gluten"],m:"pui",img:"kids-carbonara"},

 /* ---------- Garnituri ---------- */
 {id:"cartofi-coaja",n:80,c:"garnituri",ro:"Cartofi copți în coajă",hu:"Héjában sült burgonya",d:"",dh:"",p:15.5,g:"250 gr",al:["lactoza"],img:"cartofi-coaja",t:["veg"]},
 {id:"cartofi-lyra",n:80,c:"garnituri",ro:"Cartofi Lyra",hu:"Burgonya Lyra módra",d:"Din cartofi copți la cuptor și prăjiți, sos de usturoi, cașcaval",dh:"Sütőben sült és olajban sült burgonyából, fokhagymaszósszal, sajttal",p:16,g:"250 gr",al:["lactoza"],t:["veg"],q:"Are tot nr. 80, ca Cartofii copți în coajă."},
 {id:"cartofi-taranesti",n:81,c:"garnituri",ro:"Cartofi țărănești",hu:"Parasztos burgonya",d:"Cartofi, ceapă, boia, condimente",dh:"Burgonya, hagyma, pirospaprika, fűszerek",p:15,g:"200 gr",al:["lactoza"],img:"cartofi-taranesti",t:["veg"]},
 {id:"legume-tigaie",n:82,c:"garnituri",ro:"Legume la tigaie",hu:"Serpenyős zöldségek",d:"Ceapă, mix ardei, ciuperci, ulei de măsline",dh:"Hagyma, paprikamix, gomba, olívaolaj",p:22,g:"200 gr",al:["lactoza"],t:["veg"]},
 {id:"risotto",n:82,c:"garnituri",ro:"Risotto cu parmezan",hu:"Parmezános rizottó",d:"Orez, parmezan, unt, vin",dh:"Rizs, parmezán, vaj, bor",p:22,g:"200 gr",al:["lactoza"],t:["veg"],q:"Are tot nr. 82, ca Legumele la tigaie."},
 {id:"piure",n:83,c:"garnituri",ro:"Piure de cartofi",hu:"Burgonyapüré",d:"",dh:"",p:14,g:"150 gr",al:["lactoza"],t:["veg"]},
 {id:"cartofi",n:84,c:"garnituri",ro:"Cartofi prăjiți",hu:"Hasábburgonya",d:"",dh:"",p:15,g:"150 gr",al:[],img:"cartofi",t:["veg"]},
 {id:"mamaliguta",n:85,c:"garnituri",ro:"Mămăliguță prăjită",hu:"Sült puliszka",d:"",dh:"",p:12,g:"150 gr",al:["gluten"],t:["veg"]},
 {id:"pita-coapta",n:86,c:"garnituri",ro:"Pită coaptă",hu:"Sült kenyér",d:"",dh:"",p:4.5,g:"50 gr",al:["gluten"],t:["veg"]},
 {id:"focaccia",n:87,c:"garnituri",ro:"Focaccia home made",hu:"Focaccia home made",d:"Aluat bine hidratat, uns cu ulei de măsline extravirgin și rozmarin",dh:"Jól hidratált tészta, extraszűz olívaolajjal és rozmaringgal megkenve",p:7.5,g:"2 buc / 70 gr",al:["gluten"],img:"focaccia",t:["veg","home"]},

 /* ---------- Salate & murături ---------- */
 {id:"varza-murata",n:88,c:"muraturi",ro:"Varză murată",hu:"Savanyúkáposzta",d:"Rețetă tradițională · de sezon",dh:"Hagyományos recept · idényjellegű",p:15,g:"130 gr",al:[],img:"varza-murata",t:["post"]},
 {id:"muraturi",n:89,c:"muraturi",ro:"Murături asortate",hu:"Vegyes savanyúság",d:"Varză murată, castraveți, gogoșari · rețetă tradițională",dh:"Savanyúkáposzta, uborka, paprika",p:16,g:"130 gr",al:[],img:"muraturi",t:["post"]},
 {id:"sfecla",n:90,c:"muraturi",ro:"Salată de sfeclă roșie",hu:"Céklasaláta",d:"Rețetă tradițională",dh:"Hagyományos recept",p:16,g:"130 gr",al:[],img:"sfecla",t:["post"]},
 {id:"ardei-copti",n:91,c:"muraturi",ro:"Ardei copți",hu:"Sült paprika",d:"",dh:"",p:15,g:"130 gr",al:[],img:"ardei-copti",t:["post"]},
 {id:"salata-varza",n:92,c:"muraturi",ro:"Salată de varză",hu:"Káposztasaláta",d:"",dh:"",p:13,g:"130 gr",al:[],img:"salata-varza",t:["post"]},
 {id:"salata-asortata",n:93,c:"muraturi",ro:"Salată asortată",hu:"Vegyes saláta",d:"",dh:"",p:15,g:"130 gr",al:[],img:"salata-asortata",t:["post"]},
 {id:"ardei-iute",n:94,c:"muraturi",ro:"Ardei iute murat sau proaspăt",hu:"Ecetes csípős paprika vagy friss",d:"",dh:"",p:4.5,g:"1 buc",al:[],img:"ardei-iute",t:["post"],v:[{l:"Murat",lh:"Ecetes",p:4.5,g:"1 buc"},{l:"Proaspăt",lh:"Friss",p:4.5,g:"1 buc"}]},
 {id:"ceapa",n:95,c:"muraturi",ro:"Ceapă roșie",hu:"Vöröshagyma",d:"",dh:"",p:5,g:"50 gr",al:[],img:"ceapa",t:["post"]},

 /* ---------- Sosuri ---------- */
 {id:"sos-usturoi",n:96,c:"sosuri",ro:"Sos de usturoi",hu:"Fokhagymás szósz",d:"Rețeta casei: usturoi, iaurt, lămâie",dh:"Házi recept: fokhagyma, joghurt, citrom",p:10,g:"90 gr",al:["lactoza"]},
 {id:"mujdei",n:97,c:"sosuri",ro:"Mujdeiul casei",hu:"Házi mujdei",d:"Rețeta casei: usturoi, boia, ulei, sare, zeamă de lămâie",dh:"Házi recept: fokhagyma, paprika, olaj, só, citromlé",p:10,g:"90 gr",al:[],t:["post"]},
 {id:"sosul-casei",n:98,c:"sosuri",ro:"Sosul casei",hu:"A ház szósza",d:"Usturoi, boia, maioneză, ou",dh:"Fokhagyma, paprika, majonéz, tojás",p:10,g:"90 gr",al:["ou","lactoza"]},
 {id:"smantana",n:99,c:"sosuri",ro:"Smântână",hu:"Tejföl",d:"",dh:"",p:5,g:"45 gr",al:["lactoza"]},
 {id:"ketchup",n:100,c:"sosuri",ro:"Ketchup",hu:"Ketchup",d:"",dh:"",p:7,g:"90 gr",al:[]},
 {id:"mustar",n:101,c:"sosuri",ro:"Muștar",hu:"Mustár",d:"",dh:"",p:7,g:"90 gr",al:["mustar"]},
 {id:"maioneza",n:102,c:"sosuri",ro:"Maioneză",hu:"Majonéz",d:"",dh:"",p:7,g:"90 gr",al:["lactoza","ou"]},
 {id:"sos-iaurt",n:103,c:"sosuri",ro:"Sos de iaurt cu usturoi copt",hu:"Joghurtos szósz sült fokhagymával",d:"",dh:"",p:10,g:"90 gr",al:[]},

 /* ---------- Desert ---------- */
 {id:"papanas",n:104,c:"desert",ro:"Papanaș",hu:"Túrógombóc",d:"Rumenit, cu smântână și dulceață de afine. Brânză de vaci, telemea, făină, gem de afine, smântână, zahăr pudră, ou",dh:"Aranybarnára sütve, tejföllel és áfonyalekvárral. Túró, telemea, liszt, áfonyalekvár, tejföl, porcukor, tojás",p:33,g:"120/70/70 gr",al:["gluten","ou","lactoza"],img:"papanas",t:["home"]},
 {id:"lapte-pasare",n:105,c:"desert",ro:"Lapte de pasăre",hu:"Madártej",d:"După rețeta clasică de acasă: cremă fină de vanilie, albușuri bătute, zahăr",dh:"A klasszikus házi recept szerint: finom vaníliakrém, felvert tojásfehérje, cukor",p:29,g:"130/30 gr",al:["gluten","ou","telina"],img:"lapte-pasare",t:["home"]},
 {id:"tarta-mere",n:105,c:"desert",ro:"Tartă cu mere",hu:"Almás pite",d:"Semințe de pin, scorțișoară, mere, zahăr, ouă, unt, lapte, stafide",dh:"Fenyőmag, fahéj, alma, cukor, tojás, vaj, tej, mazsola",p:29,g:"180 gr",al:["lactoza"],img:"tarta-mere",q:"Are tot nr. 105, ca Laptele de pasăre."},
 {id:"panna-cotta",n:106,c:"desert",ro:"Panna cotta",hu:"Panna cotta",d:"Smântână pentru frișcă, esență de vanilie, zahăr, gelatină, gem de zmeură, păstăi de vanilie",dh:"Habtejszín, vanília aroma, cukor, zselatin, málnalekvár",p:29,g:"150 gr",al:["ou","lactoza"],img:"panna-cotta"},
 {id:"melba",n:107,c:"desert",ro:"Melba · mix de înghețată",hu:"Melba · vegyes fagylalt",d:"Vanilie, ciocolată și fructe de pădure, cu cremă de ciocolată albă belgiană cu mascarpone și topping",dh:"Vanília, csokoládé és erdei gyümölcs fagylalt, belga fehér csokoládékrém mascarponéval és toppinggal",p:32,g:"180 gr",al:["ou","lactoza"],img:"melba"},
 {id:"clatite",n:108,c:"desert",ro:"Clătite fermecate cu Nutella",hu:"Varázslatos palacsinta Nutellával",d:"Cremă de ciocolată albă belgiană cu mascarpone, Nutella, zahăr pudră și topping",dh:"Belga fehér csokoládékrém mascarponéval, Nutella, porcukor és topping",p:28,g:"130/70 gr",al:["ou","lactoza"],img:"clatite",t:["home"]},
 {id:"somloi",n:109,c:"desert",ro:"Găluște Șomloi",hu:"Somlói galuska",d:"După o rețetă de casă unică, cu ciocolată belgiană: blat de vanilie și ciocolată însiropat, sos de vanilie, ciocolată, stafide, cremă de ciocolată albă belgiană cu mascarpone, topping caramel",dh:"Egyedi házi recept alapján, belga csokoládéval: vaníliás és csokoládés piskóta, vaníliás szósz, csokoládé, mazsola, belga fehér csokoládékrém mascarponéval",p:29,g:"350 gr",al:["ou","lactoza"],img:"somloi",t:["home"]}
];
const BY = Object.fromEntries(M.map(x=>[x.id,x]));
