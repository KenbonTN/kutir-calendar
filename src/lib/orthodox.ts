// Ethiopian Orthodox Tewahedo commemorations, feasts and fasts for any day.
// Monthly commemorations follow the day of the month; annual feasts are fixed
// Ethiopian dates; movable feasts and fasts hang off Fasika (Easter).

import { fromJdn, gregorianToJdn, julianToJdn, toJdn, weekday } from "./ethiopian";

export type Named = { en: string; am: string };
export type Feast = Named & { kind: "major" | "feast" | "national" };
export type OrthodoxDay = { monthly: Named; feasts: Feast[]; fast: Named | null };

/** Who is remembered on each day of every month (index 0 = day 1). */
export const MONTHLY: Named[] = [
  { en: "Lideta (Birth of Mary) · Elias", am: "ልደታ ለማርያም · ኤልያስ" },
  { en: "Thaddeus the Apostle", am: "ታዴዎስ ሐዋርያ" },
  { en: "Be'eta (Mary enters the Temple)", am: "በአታ ለማርያም" },
  { en: "John the Apostle", am: "ዮሐንስ ወልደ ነጎድጓድ" },
  { en: "Peter & Paul · Abune Gebre Menfes Kidus", am: "ጴጥሮስ ወጳውሎስ · አቡነ ገብረ መንፈስ ቅዱስ" },
  { en: "Qusquam Mariam", am: "ቁስቋም ማርያም" },
  { en: "The Holy Trinity", am: "ሥላሴ" },
  { en: "Abba Kiros", am: "አባ ኪሮስ" },
  { en: "Thomas", am: "ቶማስ" },
  { en: "The Holy Cross", am: "መስቀል" },
  { en: "Hanna & Iyaqem · Fasiledes", am: "ሐና ወኢያቄም · ፋሲለደስ" },
  { en: "Archangel Michael", am: "ቅዱስ ሚካኤል" },
  { en: "God the Father · Archangel Raphael", am: "እግዚአብሔር አብ · ሩፋኤል" },
  { en: "Abune Aregawi · Gebre Kristos", am: "አቡነ አረጋዊ · ገብረ ክርስቶስ" },
  { en: "Qirqos & Iyeluta", am: "ቂርቆስ ወኢየሉጣ" },
  { en: "Kidane Mihret", am: "ኪዳነ ምሕረት" },
  { en: "Estifanos · Abba Gerima", am: "እስጢፋኖስ · አባ ገሪማ" },
  { en: "Abune Ewostatewos", am: "አቡነ ኤዎስጣቴዎስ" },
  { en: "Archangel Gabriel", am: "ቅዱስ ገብርኤል" },
  { en: "Hinsta Mariam", am: "ሕንጸታ ለማርያም" },
  { en: "Holy Virgin Mary", am: "እመቤታችን ማርያም" },
  { en: "Archangel Uriel · Deqsius", am: "ቅዱስ ዑራኤል · ደቅስዮስ" },
  { en: "Saint George", am: "ቅዱስ ጊዮርጊስ" },
  { en: "Abune Tekle Haymanot", am: "አቡነ ተክለ ሃይማኖት" },
  { en: "Merkorios", am: "መርቆሬዎስ" },
  { en: "Thomas the Apostle", am: "ቶማስ ሐዋርያ" },
  { en: "Medhane Alem", am: "መድኃኔ ዓለም" },
  { en: "Amanuel", am: "አማኑኤል" },
  { en: "Bale Wold · Saint Arsema", am: "በዓለ ወልድ · ቅድስት አርሴማ" },
  { en: "Mark the Evangelist", am: "ማርቆስ ወንጌላዊ" },
];

/** Fixed annual feasts: [month, day, feast]. Genna is added separately (it tracks 7 January). */
const FIXED: [number, number, Feast][] = [
  [1, 1, { en: "Enkutatash · New Year", am: "እንቁጣጣሽ", kind: "major" }],
  [1, 16, { en: "Demera · Meskel eve bonfire", am: "ደመራ", kind: "feast" }],
  [1, 17, { en: "Meskel · Finding of the True Cross", am: "መስቀል", kind: "major" }],
  [3, 12, { en: "Hidar Mikael", am: "ኅዳር ሚካኤል", kind: "feast" }],
  [3, 21, { en: "Hidar Tsion · Axum Tsion", am: "ኅዳር ጽዮን", kind: "feast" }],
  [4, 19, { en: "Tahsas Gabriel (Kulubi)", am: "ታኅሣሥ ገብርኤል", kind: "feast" }],
  [5, 10, { en: "Ketera · Timket eve", am: "ከተራ", kind: "feast" }],
  [5, 11, { en: "Timket · Epiphany", am: "ጥምቀት", kind: "major" }],
  [5, 12, { en: "Qana ze Galila · Michael", am: "ቃና ዘገሊላ", kind: "feast" }],
  [5, 21, { en: "Asteriyo Mariam", am: "አስተርዮ ማርያም", kind: "feast" }],
  [6, 16, { en: "Yekatit Kidane Mihret", am: "የካቲት ኪዳነ ምሕረት", kind: "feast" }],
  [6, 23, { en: "Adwa Victory Day", am: "የዓድዋ ድል በዓል", kind: "national" }],
  [7, 27, { en: "Megabit Medhane Alem", am: "መጋቢት መድኃኔ ዓለም", kind: "feast" }],
  [7, 29, { en: "Tsinset · Annunciation", am: "ጽንሰት · በዓለ ብሥራት", kind: "feast" }],
  [8, 23, { en: "Miyazya Giyorgis", am: "ሚያዝያ ጊዮርጊስ", kind: "feast" }],
  [8, 27, { en: "Patriots' Victory Day", am: "የአርበኞች ቀን", kind: "national" }],
  [9, 1, { en: "Lideta Mariam · Birth of Mary", am: "ልደታ ለማርያም", kind: "feast" }],
  [10, 12, { en: "Sene Mikael", am: "ሰኔ ሚካኤል", kind: "feast" }],
  [11, 5, { en: "Feast of Peter and Paul", am: "በዓለ ሐዋርያት", kind: "feast" }],
  [11, 19, { en: "Hamle Gabriel", am: "ሐምሌ ገብርኤል", kind: "feast" }],
  [12, 13, { en: "Debre Tabor · Buhe", am: "ደብረ ታቦር · ቡሄ", kind: "feast" }],
  [12, 16, { en: "Filseta · Assumption of Mary", am: "ፍልሰታ ለማርያም", kind: "major" }],
  [13, 3, { en: "Pagume Rufael", am: "ጳጉሜ ሩፋኤል", kind: "feast" }],
];

/** Orthodox Easter (Fasika) as a JDN, for a Gregorian year (Meeus' Julian computus). */
export function fasikaJdn(gYear: number) {
  const a = gYear % 4, b = gYear % 7, c = gYear % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return julianToJdn(gYear, month, day);
}

type YearInfo = {
  feasts: Map<number, Feast[]>;
  fastRanges: [number, number, Named][];
  fasika: number;
  genna: number;
  timket: number;
};

const cache = new Map<number, YearInfo>();

function yearInfo(y: number): YearInfo {
  const hit = cache.get(y);
  if (hit) return hit;

  const feasts = new Map<number, Feast[]>();
  const add = (j: number, f: Feast) => feasts.set(j, [...(feasts.get(j) ?? []), f]);

  for (const [m, d, f] of FIXED) add(toJdn(y, m, d), f);

  const genna = gregorianToJdn(y + 8, 1, 7);
  const timket = toJdn(y, 5, 11);
  add(genna, { en: "Genna · Christmas", am: "ገና · ልደት", kind: "major" });

  const E = fasikaJdn(y + 8);
  add(E - 69, { en: "Tsome Nenewe begins (fast of Nineveh)", am: "ጾመ ነነዌ", kind: "feast" });
  add(E - 55, { en: "Abiy Tsom begins (Great Lent)", am: "ዐቢይ ጾም", kind: "feast" });
  add(E - 28, { en: "Debre Zeit", am: "ደብረ ዘይት", kind: "feast" });
  add(E - 7, { en: "Hosanna · Palm Sunday", am: "ሆሳዕና", kind: "major" });
  add(E - 2, { en: "Siklet · Good Friday", am: "ስቅለት", kind: "major" });
  add(E, { en: "Fasika · Easter", am: "ፋሲካ · ትንሣኤ", kind: "major" });
  add(E + 39, { en: "Erget · Ascension", am: "ዕርገት", kind: "feast" });
  add(E + 49, { en: "Peraklitos · Pentecost", am: "ጰራቅሊጦስ", kind: "feast" });

  const fastRanges: [number, number, Named][] = [
    [toJdn(y, 3, 15), genna - 1, { en: "Tsome Nebiyat (Advent fast)", am: "ጾመ ነቢያት" }],
    [timket - 1, timket - 1, { en: "Gahad (Timket eve fast)", am: "ጋድ" }],
    [E - 69, E - 67, { en: "Tsome Nenewe", am: "ጾመ ነነዌ" }],
    [E - 55, E - 1, { en: "Abiy Tsom (Great Lent)", am: "ዐቢይ ጾም" }],
    [E + 50, toJdn(y, 11, 4), { en: "Tsome Hawariat (Apostles' fast)", am: "ጾመ ሐዋርያት" }],
    [toJdn(y, 12, 1), toJdn(y, 12, 15), { en: "Tsome Filseta", am: "ጾመ ፍልሰታ" }],
  ];

  const info = { feasts, fastRanges, fasika: E, genna, timket };
  cache.set(y, info);
  return info;
}

export function orthodoxDay(j: number): OrthodoxDay {
  const e = fromJdn(j);
  const info = yearInfo(e.y);
  const monthly = MONTHLY[(e.d - 1) % 30];
  const feasts = info.feasts.get(j) ?? [];

  let fast: Named | null = null;
  for (const [a, b, f] of info.fastRanges) if (j >= a && j <= b) fast = f;
  const wd = weekday(j);
  const fiftyDays = j >= info.fasika && j <= info.fasika + 49;
  const feastDay = j === info.genna || j === info.timket;
  if (!fast && (wd === 2 || wd === 4) && !fiftyDays && !feastDay) {
    fast = wd === 2
      ? { en: "Wednesday fast (Tsome Dihnet)", am: "የረቡዕ ጾም" }
      : { en: "Friday fast (Tsome Dihnet)", am: "የዓርብ ጾም" };
  }
  return { monthly, feasts, fast };
}
