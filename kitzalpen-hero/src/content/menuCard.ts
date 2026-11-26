import type { Lang } from './hero';

/**
 * Speisekarte 2027 · 2028 – transcribed 1:1 from the owner's menu PDF (Kitzalpen_Meniu_final, Nov 2026).
 * The printed card is bilingual DE · EN; dish names and descriptions are shown in both languages on every site language.
 * Photos: cropped from the same PDF (public/images/menu/). Prices in euro incl. VAT.
 */
type T = Record<Lang, string>;
export type Allergen = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'L' | 'M' | 'N' | 'O' | 'P' | 'R';
export type Tag = 'chicken' | 'pork' | 'beef' | 'fish' | 'veggie';
export interface Dish { id: string; name: T; desc?: T; price: number; al?: Allergen[]; tag?: Tag; img?: string; note?: T }
export interface Extra { name: T; price: number; al?: Allergen[] }
export interface Drink { name: string; sub?: T; sizes: [string, number][] }
export interface DrinkGroup { id: string; title: T; items: Drink[] }
export interface Chapter { id: string; no: string; title: T; img: string; time?: T; dishes: Dish[]; extras?: Extra[]; extrasTitle?: T; daily?: { name: T; desc: T; price: number; list?: { name: T; al: Allergen[]; img?: string }[] } }

export const ALLERGENS: Record<Allergen, T> = {
  A: { de: 'Gluten', en: 'Gluten' }, B: { de: 'Krebstiere', en: 'Crustaceans' }, C: { de: 'Ei', en: 'Egg' }, D: { de: 'Fisch', en: 'Fish' },
  E: { de: 'Erdnuss', en: 'Peanut' }, F: { de: 'Soja', en: 'Soy' }, G: { de: 'Milch', en: 'Milk' }, H: { de: 'Schalenfrüchte', en: 'Tree nuts' },
  L: { de: 'Sellerie', en: 'Celery' }, M: { de: 'Senf', en: 'Mustard' }, N: { de: 'Sesam', en: 'Sesame' }, O: { de: 'Sulfite', en: 'Sulphites' },
  P: { de: 'Lupinen', en: 'Lupin' }, R: { de: 'Weichtiere', en: 'Molluscs' },
};
export const TAGS: Record<Tag, T> = {
  chicken: { de: 'Huhn', en: 'Chicken' }, pork: { de: 'Schwein', en: 'Pork' }, beef: { de: 'Rind', en: 'Beef' }, fish: { de: 'Fisch', en: 'Fish' }, veggie: { de: 'Vegetarisch', en: 'Vegetarian' },
};

export const MENU: Chapter[] = [
  {
    id: 'fruehstueck', no: '01', title: { de: 'Frühstück & Vorspeisen', en: 'Breakfast & starters' }, img: 'ch01', time: { de: 'Frühstück 8:00 – 10:00 Uhr', en: 'Breakfast 8:00 – 10:00' },
    dishes: [
      { id: 'spinat', name: { de: 'Spinat mit Spiegeleiern', en: 'Spinach with fried eggs' }, desc: { de: 'Spiegeleier auf Rahmspinat mit Knoblauch und pflanzlicher Kochcreme', en: 'Fried eggs on creamed spinach with garlic and plant-based cooking cream' }, price: 15, al: ['C', 'G'], tag: 'veggie', img: 'spinat' },
      { id: 'omelett', name: { de: 'Schinken-Käse-Omelett', en: 'Ham & cheese omelette' }, desc: { de: 'Lockeres Omelett mit Schinken, mit Käse überbacken', en: 'Fluffy omelette with ham, gratinated with cheese' }, price: 13, al: ['C', 'G'], img: 'omelett' },
      { id: 'english', name: { de: 'Englisches Frühstück', en: 'English breakfast' }, desc: { de: 'Käsewürstchen, Spiegeleier, Guanciale, Bohnen in Tomatensauce und hausgemachte Focaccia', en: 'Cheese sausages, fried eggs, guanciale, beans in tomato sauce and homemade focaccia' }, price: 13, al: ['A', 'C', 'G'], img: 'ch01' },
      { id: 'hummus', name: { de: 'Hummus-Teller', en: 'Hummus platter' }, desc: { de: 'Cremiger Hummus mit gerösteter Paprika, Falafel und knusprigem Fladenbrot', en: 'Creamy hummus with roasted pepper, falafel and crispy flatbread' }, price: 13, al: ['A', 'N'], tag: 'veggie', img: 'hummus' },
      { id: 'kalte-platte', name: { de: 'Kalte Platte', en: 'Cold platter' }, desc: { de: 'Schinken, Telemea-Schafskäse, Schnittkäse, gekochtes Ei, Tomaten und Gurken', en: 'Ham, telemea sheep cheese, sliced cheese, boiled egg, tomatoes and cucumbers' }, price: 13, al: ['C', 'G'], img: 'kalte-platte' },
      { id: 'camembert-start', name: { de: 'Gebackener Camembert', en: 'Breaded camembert' }, desc: { de: 'Mit Heidelbeermarmelade und Salat der Saison – Blattsalat, Spargel, knuspriger Karfiol, Granatapfel, Avocadocreme und Honigdressing', en: 'With blueberry jam and seasonal salad – mixed leaves, asparagus, crispy cauliflower, pomegranate, avocado cream and honey dressing' }, price: 15, al: ['A', 'C', 'G'], tag: 'veggie', img: 'ch05' },
    ],
    extrasTitle: { de: 'Extras', en: 'Extras' },
    extras: [
      { name: { de: 'Croissant', en: 'Croissant' }, price: 2.5 }, { name: { de: 'Extra Ei', en: 'Extra egg' }, price: 2 },
      { name: { de: 'Frischer Saft', en: 'Fresh juice' }, price: 3.5 }, { name: { de: 'Prosecco', en: 'Prosecco' }, price: 4.5 },
    ],
  },
  {
    id: 'suppen', no: '02', title: { de: 'Suppen', en: 'Soups' }, img: 'ch02',
    dishes: [
      { id: 'gulasch-suppe', name: { de: 'Gulaschsuppe vom Rind', en: 'Beef goulash soup' }, desc: { de: 'Kräftige Suppe mit zartem Rindfleisch, Paprika und Kräutern', en: 'Hearty soup with tender beef, paprika and fresh herbs' }, price: 10, al: ['L'], tag: 'beef', img: 'gulasch-suppe' },
      { id: 'leberknoedel', name: { de: 'Leberknödelsuppe', en: 'Liver dumpling soup' }, desc: { de: 'Klare Rindsuppe mit hausgemachten Leberknödeln vom Rind', en: 'Clear beef broth with homemade beef liver dumplings' }, price: 9, al: ['A', 'C', 'L'], tag: 'beef', img: 'leberknoedel' },
    ],
    daily: { name: { de: 'Tagessuppe', en: 'Soup of the day' }, desc: { de: 'Fragen Sie unser Service-Team', en: 'Please ask our service team' }, price: 10 },
  },
  {
    id: 'klassiker', no: '03', title: { de: 'Schnitzel & Klassiker', en: 'Schnitzel & classics' }, img: 'ch03',
    dishes: [
      { id: 'provence', name: { de: 'Hähnchenbrust Provence', en: 'Chicken breast Provence' }, desc: { de: 'Gebratene Hähnchenbrust mit Tomaten, Mozzarella, Pesto und Paprikasauce', en: 'Fried chicken breast with tomatoes, mozzarella, pesto and pepper sauce' }, price: 12, al: ['G', 'H'], tag: 'chicken', img: 'provence' },
      { id: 'chicken-grill', name: { de: 'Gegrillte Hähnchenbrust', en: 'Grilled chicken breast' }, desc: { de: 'Saftig vom Grill, mit Pfeffer gewürzt', en: 'Juicy and grilled, seasoned with pepper' }, price: 10, tag: 'chicken', img: 'chicken-grill', note: { de: 'Ohne Beilage', en: 'Without side dish' } },
      { id: 'wiener', name: { de: 'Wiener Schnitzel vom Schwein', en: 'Viennese pork schnitzel' }, desc: { de: 'Knusprig paniertes Schweineschnitzel nach Wiener Art, mit Kartoffeln und Salat', en: 'Crispy breaded pork schnitzel, Viennese style, with potatoes and salad' }, price: 15, al: ['A', 'C'], tag: 'pork', img: 'wiener' },
      { id: 'cordon', name: { de: 'Cordon Bleu à la Kitz', en: 'Cordon bleu à la Kitz' }, desc: { de: 'Schweineschnitzel gefüllt mit Schinken und Käse, mit Ei, dazu Knoblauch-Kartoffeln', en: 'Pork schnitzel filled with ham and cheese, with egg, served with garlic potatoes' }, price: 16, al: ['A', 'C', 'G'], tag: 'pork', img: 'cordon' },
      { id: 'schnitzel-kitz', name: { de: 'Schnitzel Kitzalpen', en: 'Kitzalpen schnitzel' }, desc: { de: 'Schweinskotelett mit Pilzsauce, Käse, Cheddar, Schinken, pflanzlicher Sahne und Ei', en: 'Pork cutlet with mushroom sauce, cheese, cheddar, ham, plant-based cream and egg' }, price: 18, al: ['A', 'C', 'G'], tag: 'pork', img: 'schnitzel-kitz' },
      { id: 'stinco', name: { de: 'Stinco di Maiale', en: 'Pork shank' }, desc: { de: 'Würzige Sauce mit Speck, Champignons, Cabanossi und Tomate, dazu bayerisches Püree', en: 'Spicy sauce with bacon, mushrooms, cabanossi and tomato, with Bavarian mash' }, price: 18, al: ['G'], tag: 'pork', img: 'stinco' },
      { id: 'pulled-potato', name: { de: 'Pulled Pork in der Ofenkartoffel', en: 'Pulled pork jacket potato' }, desc: { de: 'Langsam gegarter, geräucherter Schweinenacken, BBQ-Sauce, Kartoffel und Krautsalat', en: 'Slow-cooked smoked pork neck, BBQ sauce, potato and coleslaw' }, price: 15, al: ['C', 'G', 'M'], tag: 'pork', img: 'pulled-potato' },
      { id: 'pulled-burger', name: { de: 'Pulled Pork Burger', en: 'Pulled pork burger' }, desc: { de: 'Brötchen, Pulled Pork, Cheddar, Krautsalat, BBQ-Sauce, Pommes frites und Haussauce', en: 'Bun, pulled pork, cheddar, coleslaw, BBQ sauce, fries and house sauce' }, price: 15, al: ['A', 'C', 'G', 'M'], tag: 'pork', img: 'pulled-burger' },
      { id: 'forelle', name: { de: 'Bio-Forelle', en: 'Organic trout' }, desc: { de: 'Im Ganzen gegrillt, mit Pommes frites und Knoblauchsauce', en: 'Grilled whole, with fries and garlic sauce' }, price: 20, al: ['C', 'D'], tag: 'fish', img: 'forelle' },
      { id: 'lachs', name: { de: 'Lachs mit Spinat', en: 'Salmon with spinach' }, desc: { de: 'Mit goldenen Kartoffeln und Miesmuschelsauce', en: 'With golden potatoes and mussel sauce' }, price: 19, al: ['D', 'G', 'O', 'R'], tag: 'fish', img: 'lachs' },
      { id: 'rindsgulasch', name: { de: 'Rindsgulasch mit Nockerln', en: 'Beef goulash with dumplings' }, desc: { de: 'Geschmortes Rindfleisch mit Paprika und Zwiebeln, dazu hausgemachte Nockerln', en: 'Braised beef with peppers and onions, with homemade dumplings' }, price: 17, al: ['A', 'C'], tag: 'beef', img: 'rindsgulasch' },
      { id: 'eleven', name: { de: 'Eleven Burger', en: 'Eleven burger' }, desc: { de: 'Brötchen, Zwiebelmarmelade, Eisbergsalat, Black-Angus-Rindfleisch, Cheddar, Bacon, Burgersauce, Pommes frites, Haussauce und Parmesan', en: 'Bun, onion jam, iceberg lettuce, Black Angus beef patty, cheddar, bacon, burger sauce, fries, house sauce and parmesan' }, price: 15, al: ['A', 'C', 'G', 'M'], tag: 'beef', img: 'eleven' },
    ],
  },
  {
    id: 'pasta', no: '04', title: { de: 'Pasta', en: 'Pasta' }, img: 'ch04',
    dishes: [
      { id: 'spaetzle', name: { de: 'Käsespätzle', en: 'Cheese spätzle' }, desc: { de: 'Hausgemachte Spätzle mit würzigem Käse und karamellisierten Zwiebeln', en: 'Homemade spätzle with flavourful cheese and caramelised onions' }, price: 16, al: ['A', 'C', 'G'], tag: 'veggie', img: 'spaetzle' },
      { id: 'bolognese', name: { de: 'Penne Bolognese', en: 'Penne Bolognese' }, desc: { de: 'Hausgemachtes Ragù mit Tomaten, Oregano und Parmesan', en: 'Homemade ragù with tomatoes, oregano and parmesan' }, price: 15, al: ['A', 'G', 'L'], img: 'bolognese' },
      { id: 'carbonara', name: { de: 'Penne Carbonara', en: 'Penne Carbonara' }, desc: { de: 'Schinken, Ei, Sahne und Parmesan', en: 'Ham, egg, cream and parmesan' }, price: 16, al: ['A', 'C', 'G'], img: 'carbonara' },
    ],
  },
  {
    id: 'vegetarisch', no: '05', title: { de: 'Vegetarisch', en: 'Vegetarian' }, img: 'ch05',
    dishes: [
      { id: 'camembert-veg', name: { de: 'Gebackener Camembert', en: 'Breaded camembert' }, desc: { de: 'Mit Heidelbeermarmelade und Salat der Saison – Blattsalat, Spargel, knuspriger Karfiol, Granatapfel, Avocadocreme und Honigdressing', en: 'With blueberry jam and seasonal salad – mixed leaves, asparagus, crispy cauliflower, pomegranate, avocado cream and honey dressing' }, price: 14, al: ['A', 'C', 'G'], tag: 'veggie', img: 'camembert-veg' },
      { id: 'pilzragout', name: { de: 'Pilzragout mit Püree', en: 'Mushroom stew with mash' }, desc: { de: 'Champignons, Zwiebeln, Paprika und Weißwein, dazu Kartoffelpüree', en: 'Mushrooms, onions, peppers and white wine, with mashed potatoes' }, price: 12, al: ['G', 'O'], tag: 'veggie', img: 'pilzragout' },
      { id: 'veggie-burger', name: { de: 'Veggie Burger', en: 'Veggie burger' }, desc: { de: 'Brötchen, Cheddar, Eisbergsalat, karamellisierte Zwiebeln, Gemüse, Veggie-Laibchen, Pilze, Pommes frites, Haussauce und Parmesan', en: 'Bun, cheddar, iceberg lettuce, caramelised onions, vegetables, veggie patty, mushrooms, fries, house sauce and parmesan' }, price: 15, al: ['A', 'C', 'G', 'M'], tag: 'veggie', img: 'veggie-burger' },
    ],
  },
  {
    id: 'kinder', no: '06', title: { de: 'Kindermenü', en: 'Kids’ menu' }, img: 'ch06',
    dishes: [
      { id: 'kids-chicken', name: { de: 'Knuspriges Hähnchen', en: 'Crispy chicken' }, desc: { de: 'Knusprige Hähnchenstreifen mit Pommes frites und Ketchup', en: 'Crispy chicken strips with fries and ketchup' }, price: 13, al: ['A', 'C', 'G'], tag: 'chicken', img: 'kids-chicken' },
      { id: 'dinos', name: { de: 'Chicken Dinos', en: 'Chicken dinos' }, desc: { de: 'Mit Pommes frites und Ketchup', en: 'With fries and ketchup' }, price: 13, al: ['A', 'C', 'G'], tag: 'chicken', img: 'dinos' },
      { id: 'kids-carbonara', name: { de: 'Penne Carbonara mit Hühnerschinken', en: 'Penne carbonara with chicken ham' }, desc: { de: 'Mit Hühnerschinken, Ei, Sahne und Parmesan', en: 'With chicken ham, egg, cream and parmesan' }, price: 13, al: ['A', 'C', 'G'], tag: 'chicken', img: 'kids-carbonara' },
    ],
  },
  {
    id: 'salate', no: '07', title: { de: 'Salate', en: 'Salads' }, img: 'ch07',
    dishes: [
      { id: 'greek', name: { de: 'Griechischer Salat', en: 'Greek salad' }, desc: { de: 'Blattsalat und saisonale Kräuter, Tomaten, rote Zwiebeln, Gurke, Feta, bunte Paprika und Oliven', en: 'Leaf salad and seasonal herbs, tomatoes, red onion, cucumber, feta, peppers and olives' }, price: 12, al: ['G'], tag: 'veggie', img: 'greek' },
      { id: 'tuna', name: { de: 'Thunfischsalat', en: 'Tuna salad' }, desc: { de: 'Blattsalat, bunte Paprika, rote Zwiebeln, Thunfisch, Mais, Oliven und Zitrone', en: 'Leaf salad, peppers, red onion, tuna, sweetcorn, olives and lemon' }, price: 14, al: ['D', 'M'], tag: 'fish', img: 'tuna' },
      { id: 'potato-salad', name: { de: 'Kartoffelsalat', en: 'Potato salad' }, desc: { de: 'Kartoffeln, Mayonnaise, Essiggurken und Frühlingszwiebeln', en: 'Potatoes, mayonnaise, pickles and spring onions' }, price: 6, al: ['C', 'M'], tag: 'veggie', img: 'potato-salad' },
      { id: 'green', name: { de: 'Grüner Salat', en: 'Green salad' }, desc: { de: 'Mit Joghurt-Zitronen-Dressing', en: 'With yoghurt and lemon dressing' }, price: 5, al: ['G'], tag: 'veggie' },
    ],
  },
  {
    id: 'beilagen', no: '08', title: { de: 'Beilagen', en: 'Side dishes' }, img: 'ch08',
    dishes: [
      { id: 'bratkartoffeln', name: { de: 'Bratkartoffeln', en: 'Fried potatoes' }, desc: { de: 'Mit Zwiebeln, Speck und Petersilie', en: 'With onions, bacon and parsley' }, price: 7, img: 'bratkartoffeln' },
      { id: 'pueree', name: { de: 'Bayerisches Püree', en: 'Bavarian mash' }, desc: { de: 'Kartoffelpüree mit Speck, Käse und Schnittlauch', en: 'Mashed potatoes with bacon, cheese and chives' }, price: 7, al: ['G'], img: 'pueree' },
      { id: 'gemuese', name: { de: 'Gemüsesymphonie', en: 'Vegetable symphony' }, desc: { de: 'Zucchini, Aubergine, Paprika, Lauch, Pilze und Kirschtomaten mit Balsamico', en: 'Courgette, aubergine, peppers, leek, mushrooms and cherry tomatoes with balsamic' }, price: 8, al: ['F', 'O'], tag: 'veggie', img: 'gemuese' },
    ],
    extrasTitle: { de: 'Dazu', en: 'On the side' },
    extras: [
      { name: { de: 'Pommes frites', en: 'French fries' }, price: 7 }, { name: { de: 'Rustikale Kartoffeln', en: 'Rustic potatoes' }, price: 7 },
      { name: { de: 'Essiggemüse', en: 'Pickles' }, price: 4, al: ['O'] }, { name: { de: 'Hausbrot', en: 'Homemade bread' }, price: 1.5, al: ['A'] },
      { name: { de: 'Ketchup', en: 'Ketchup' }, price: 1.5 }, { name: { de: 'Mayonnaise', en: 'Mayonnaise' }, price: 1.5, al: ['C', 'M'] },
      { name: { de: 'Knoblauchsauce', en: 'Garlic sauce' }, price: 1.5, al: ['C', 'G'] },
    ],
  },
  {
    id: 'desserts', no: '09', title: { de: 'Desserts', en: 'Desserts' }, img: 'ch09',
    dishes: [
      { id: 'kaiserschmarrn', name: { de: 'Kaiserschmarrn', en: 'Emperor’s pancake' }, desc: { de: 'Zerrissener Pfannkuchen mit Puderzucker, Fruchtkompott und Vanilleeis', en: 'Shredded pancake with icing sugar, fruit compote and vanilla ice cream' }, price: 13, al: ['A', 'C', 'G'], img: 'kaiserschmarrn' },
      { id: 'brownie', name: { de: 'Brownie mit Pfirsich', en: 'Brownie with peach' }, desc: { de: 'Mit Pfirsichen und Schokoladensauce', en: 'With peaches and chocolate sauce' }, price: 12, al: ['A', 'C', 'G'], img: 'brownie' },
    ],
    daily: {
      name: { de: 'Dessert des Tages', en: 'Dessert of the day' }, desc: { de: 'Fragen Sie unser Service-Team nach dem heutigen Dessert. Täglich wechselnd.', en: 'Please ask our service team about today’s dessert. Daily changing.' }, price: 10,
      list: [
        { name: { de: 'Tiramisu mit Waldbeeren', en: 'Forest berry tiramisu' }, al: ['A', 'C', 'G'], img: 'tiramisu' },
        { name: { de: 'Crème Caramel', en: 'Crème caramel' }, al: ['C', 'G'], img: 'creme-caramel' },
        { name: { de: 'Palatschinken', en: 'House pancakes' }, al: ['A', 'C', 'G', 'H'], img: 'palatschinken' },
        { name: { de: 'Topfenknödel', en: 'Curd dumplings' }, al: ['A', 'C', 'G'], img: 'topfenknoedel' },
        { name: { de: 'Apfelstrudel', en: 'Apple strudel' }, al: ['A', 'C', 'G'], img: 'apfelstrudel' },
      ],
    },
  },
];

/** Chapter 10 – bar (price list). Sizes as printed: [size, price]. */
export const BAR: DrinkGroup[] = [
  { id: 'aperitif', title: { de: 'Aperitif', en: 'Aperitifs' }, items: [
    { name: 'Prosecco', sizes: [['0,2 l', 6.7], ['0,75 l', 24]] },
    { name: 'Aperol Veneziano', sub: { de: 'Soda, Prosecco, Aperol', en: 'Soda, prosecco, Aperol' }, sizes: [['0,35 l', 6.5]] },
    { name: 'Hugo', sub: { de: 'Soda, Prosecco, Holundersirup, Minze, Limette', en: 'Soda, prosecco, elderflower syrup, mint, lime' }, sizes: [['0,35 l', 6.5]] },
    { name: 'Hugo alkoholfrei', sizes: [['0,35 l', 5.5]] },
    { name: 'Limoncello Spritz', sizes: [['0,35 l', 6.5]] },
    { name: 'Martini', sub: { de: 'Bianco, Rosso', en: 'Bianco, rosso' }, sizes: [['5 cl', 5.9]] },
  ] },
  { id: 'bier', title: { de: 'Bier', en: 'Beer' }, items: [
    { name: 'Birra Moretti', sizes: [['0,4 l', 4.5]] }, { name: 'Stiegl', sizes: [['0,5 l', 4.5]] }, { name: 'Franziskaner Weizenbier', sizes: [['0,5 l', 4.7]] },
    { name: 'Franziskaner Weizen alkoholfrei', sizes: [['0,5 l', 4.5]] }, { name: 'Stiegl Radler', sizes: [['0,5 l', 4.5]] }, { name: 'Bier alkoholfrei', sizes: [['0,5 l', 4.3]] },
  ] },
  { id: 'soft', title: { de: 'Alkoholfreie Getränke', en: 'Soft drinks' }, items: [
    { name: 'Mineralwasser', sub: { de: 'Prickelnd oder still', en: 'Sparkling or still' }, sizes: [['0,33 l', 3.5]] },
    { name: 'Coca-Cola', sub: { de: 'Classic, Zero', en: 'Classic, Zero' }, sizes: [['0,33 l', 4.1]] },
    { name: 'Fanta', sizes: [['0,33 l', 4.1]] }, { name: 'Sprite', sizes: [['0,33 l', 4.1]] }, { name: 'Almdudler', sizes: [['0,33 l', 4.1]] },
    { name: 'Apfelsaft', sub: { de: 'Apfelsaft', en: 'Apple juice' }, sizes: [['0,33 l', 4.9]] },
    { name: 'Limonade', sub: { de: 'Zitrone, Holundersirup, Minze', en: 'Lemon, elderflower syrup, mint' }, sizes: [['0,4 l', 5.9]] },
    { name: 'Mezzo Mix / Spezi', sub: { de: 'Soda Zitrone', en: 'Soda lemon' }, sizes: [['0,4 l', 4.1]] },
    { name: 'Red Bull', sizes: [['0,33 l', 4.1]] },
  ] },
  { id: 'kaffee', title: { de: 'Kaffee & Tee', en: 'Coffee & tea' }, items: [
    { name: 'Kaffee', sub: { de: 'Espresso oder Long Coffee', en: 'Espresso or long coffee' }, sizes: [['', 3.2]] },
    { name: 'Cappuccino', sizes: [['', 4.2]] }, { name: 'Latte Macchiato', sizes: [['', 4.5]] },
    { name: 'Tee', sub: { de: 'Schwarztee, Grüntee, Früchtetee, Kräutertee', en: 'Black, green, fruit or herbal tea' }, sizes: [['', 3.9]] },
    { name: 'Matcha Latte', sizes: [['', 4.6]] }, { name: 'Heiße Schokolade', sub: { de: 'Heiße Schokolade', en: 'Hot chocolate' }, sizes: [['', 4.6]] },
  ] },
  { id: 'wein', title: { de: 'Weine', en: 'Wines' }, items: [
    { name: 'Weißwein', sub: { de: 'Weißwein', en: 'White wine' }, sizes: [['250 ml', 9.6], ['0,7 l', 31]] },
    { name: 'Roséwein', sub: { de: 'Roséwein', en: 'Rosé wine' }, sizes: [['250 ml', 9.6], ['0,7 l', 31]] },
    { name: 'Rotwein', sub: { de: 'Rotwein', en: 'Red wine' }, sizes: [['250 ml', 9.6], ['0,7 l', 31]] },
    { name: 'Spritzer', sub: { de: 'Weißwein gespritzt', en: 'White wine spritzer' }, sizes: [['250 ml', 4]] },
    { name: 'Glühwein', sub: { de: 'Glühwein', en: 'Mulled wine' }, sizes: [['250 ml', 6.5]] },
  ] },
  { id: 'schnaps', title: { de: 'Schnäpse', en: 'Schnapps' }, items: [{ name: 'Marille', sub: { de: 'Marille', en: 'Apricot' }, sizes: [['4 cl', 4.5]] }] },
  { id: 'likoer', title: { de: 'Likör', en: 'Liqueur' }, items: [
    { name: 'Baileys', sizes: [['4 cl', 5.6]] }, { name: 'Limoncello', sizes: [['4 cl', 5.6]] }, { name: 'Jägermeister', sizes: [['2 cl', 2.8], ['4 cl', 5.6]] },
  ] },
  { id: 'vodka', title: { de: 'Vodka', en: 'Vodka' }, items: [{ name: 'Absolut', sizes: [['4 cl', 5.5]] }, { name: 'Stolichnaya', sizes: [['4 cl', 5.5]] }] },
  { id: 'rumgin', title: { de: 'Rum & Gin', en: 'Rum & gin' }, items: [{ name: 'Bacardi', sizes: [['4 cl', 4.5]] }, { name: 'Gordon’s Gin', sizes: [['4 cl', 4.5]] }] },
  { id: 'whiskey', title: { de: 'Whiskey', en: 'Whiskey' }, items: [{ name: 'Jack Daniel’s', sizes: [['4 cl', 7.2]] }, { name: 'Ballantine’s', sizes: [['4 cl', 5.2]] }] },
];

export const MENU_COPY = {
  de: {
    eyebrow: 'Kitzalpen Küche · 2027 · 2028', title: 'Speisekarte', sub: 'Alpenküche, Klassiker und Hausgemachtes – zum Mittag, am Abend und an der Bar. Die Karte in Deutsch und Englisch.',
    chapter: 'Kapitel', all: 'Alle', filter: 'Filtern', allergens: 'Allergene', legend: 'Allergene', vat: 'Alle Preise in Euro inkl. MwSt.',
    daily: 'Täglich wechselnd', ask: 'Fragen Sie unser Service-Team', bar: 'Bar', barTitle: 'Getränke & Bar', close: 'Schließen', details: 'Details ansehen',
    pdf: 'Speisekarte als PDF', back: 'Zum Restaurant', book: 'Tisch anfragen', end: 'Guten Appetit', endSub: 'Wir hoffen, es gefällt Ihnen bei uns.',
    review: 'Bewerten Sie uns auf Google', none: 'Keine Gerichte für diesen Filter in diesem Kapitel.', noAl: 'ohne', dinner: 'Abendessen Di – So, 17 – 21 Uhr',
    prev: 'Vorheriges Gericht', next: 'Nächstes Gericht', filterLabel: 'Was möchten Sie essen?',
  },
  en: {
    eyebrow: 'Kitzalpen kitchen · 2027 · 2028', title: 'Menu', sub: 'Alpine cooking, classics and homemade dishes – for lunch, dinner and at the bar. The card in German and English.',
    chapter: 'Chapter', all: 'All', filter: 'Filter', allergens: 'Allergens', legend: 'Allergens', vat: 'All prices in euro incl. VAT',
    daily: 'Daily changing', ask: 'Please ask our service team', bar: 'Bar', barTitle: 'Drinks & bar', close: 'Close', details: 'View details',
    pdf: 'Menu as PDF', back: 'Back to the restaurant', book: 'Ask for a table', end: 'Enjoy your meal', endSub: 'We hope you enjoy your time with us.',
    review: 'Rate us on Google', none: 'No dishes for this filter in this chapter.', noAl: 'without', dinner: 'Dinner Tue – Sun, 5 – 9 pm',
    prev: 'Previous dish', next: 'Next dish', filterLabel: 'What would you like?',
  },
};
export const eur = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
