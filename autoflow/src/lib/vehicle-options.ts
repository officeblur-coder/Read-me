// Nomenclatoare pentru fișa autoturismului. Valorile (cheile) sunt stabile și se stochează în DB;
// etichetele sunt afișate în interfață și vor fi traduse (ro/hu/en).

export const FUEL_OPTIONS = {
  petrol: "Benzină",
  diesel: "Diesel",
  hybrid: "Hibrid",
  plugin_hybrid: "Hibrid plug-in",
  electric: "Electric",
  lpg: "Benzină + GPL",
  cng: "Benzină + CNG",
} as const;

export const TRANSMISSION_OPTIONS = {
  manual: "Manuală",
  automatic: "Automată",
} as const;

export const DRIVETRAIN_OPTIONS = {
  fwd: "Față",
  rwd: "Spate",
  awd: "Integrală (4x4)",
} as const;

export const EMISSION_OPTIONS = {
  euro3: "Euro 3",
  euro4: "Euro 4",
  euro5: "Euro 5",
  euro6: "Euro 6",
  euro6d: "Euro 6d",
  euro7: "Euro 7",
  na: "Nu se aplică (electric)",
} as const;

export const BODY_OPTIONS = {
  sedan: "Sedan",
  hatchback: "Hatchback",
  wagon: "Break",
  suv: "SUV",
  coupe: "Coupe",
  convertible: "Cabrio",
  mpv: "Monovolum",
  pickup: "Pickup",
  van: "Utilitară",
} as const;

export const ORIGIN_OPTIONS = {
  ro_new: "Cumpărată nouă din România",
  ro_used: "Rulată în România",
  imported: "Import",
  trade_in: "Preluată în schimb (buy-back)",
  leasing: "Ex-leasing",
} as const;

export type EquipmentCategory = { key: string; label: string; items: Record<string, string> };

export const EQUIPMENT: EquipmentCategory[] = [
  {
    key: "comfort",
    label: "Confort",
    items: {
      ac_manual: "Aer condiționat manual",
      climate_auto: "Climatronic",
      climate_multi: "Climatronic multi-zonă",
      heated_seats: "Scaune încălzite",
      ventilated_seats: "Scaune ventilate",
      electric_seats: "Scaune reglabile electric",
      seat_memory: "Memorie scaune",
      heated_wheel: "Volan încălzit",
      keyless: "Keyless entry / start",
      power_tailgate: "Hayon electric",
      panoramic_roof: "Trapă / plafon panoramic",
      aux_heating: "Încălzire auxiliară (Webasto)",
    },
  },
  {
    key: "safety",
    label: "Siguranță",
    items: {
      abs: "ABS",
      esp: "ESP",
      airbags_front: "Airbag-uri frontale",
      airbags_side: "Airbag-uri laterale",
      airbags_curtain: "Airbag-uri cortină",
      isofix: "Isofix",
      tpms: "Senzori presiune anvelope",
      alarm: "Alarmă",
      emergency_call: "Apel de urgență (eCall)",
    },
  },
  {
    key: "multimedia",
    label: "Multimedia",
    items: {
      navigation: "Navigație",
      carplay: "Apple CarPlay",
      android_auto: "Android Auto",
      bluetooth: "Bluetooth",
      digital_cockpit: "Bord digital",
      head_up: "Head-up display",
      premium_audio: "Sistem audio premium",
      wireless_charging: "Încărcare wireless telefon",
      usb: "Porturi USB",
    },
  },
  {
    key: "exterior",
    label: "Exterior",
    items: {
      alloy_wheels: "Jante aliaj",
      led_headlights: "Faruri LED",
      matrix_led: "Faruri Matrix LED",
      xenon: "Faruri xenon",
      tow_hook: "Cârlig remorcare",
      roof_rails: "Bare longitudinale",
      tinted_windows: "Geamuri fumurii",
      electric_mirrors: "Oglinzi rabatabile electric",
    },
  },
  {
    key: "interior",
    label: "Interior",
    items: {
      leather: "Tapițerie piele",
      alcantara: "Tapițerie Alcantara",
      sport_seats: "Scaune sport",
      ambient_light: "Iluminare ambientală",
      multifunction_wheel: "Volan multifuncțional",
      paddle_shifters: "Padele schimbător",
      split_rear_seats: "Banchetă rabatabilă fracționat",
    },
  },
  {
    key: "assist",
    label: "Asistență șofer",
    items: {
      cruise: "Pilot automat",
      acc: "Pilot automat adaptiv",
      lane_assist: "Asistent menținere bandă",
      blind_spot: "Monitorizare unghi mort",
      park_front: "Senzori parcare față",
      park_rear: "Senzori parcare spate",
      camera_rear: "Cameră marșarier",
      camera_360: "Camere 360°",
      self_parking: "Parcare automată",
      traffic_sign: "Recunoaștere indicatoare",
      auto_brake: "Frânare automată de urgență",
      hill_assist: "Asistent pornire în rampă",
    },
  },
];

export const EQUIPMENT_KEYS = new Set(EQUIPMENT.flatMap((c) => Object.keys(c.items)));

export function equipmentLabel(key: string): string {
  for (const c of EQUIPMENT) if (key in c.items) return c.items[key];
  return key;
}

export function optionLabel<T extends Record<string, string>>(options: T, key: string | null | undefined) {
  if (!key) return null;
  return (options as Record<string, string>)[key] ?? key;
}
