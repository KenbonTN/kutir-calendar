// Quote of the day. Old, public-domain sayings and Ethiopian proverbs, each
// with a short note on what it means for the day ahead. Each quote has a theme
// so the page can pick one that fits how things are going.

export type Theme = "time" | "start" | "steady" | "money" | "focus" | "purpose";
export type Quote = { text: string; am?: string; by: string; note: string; theme: Theme };

export const QUOTES: Quote[] = [
  // Time
  { theme: "time", by: "Seneca", text: "It is not that we have a short time to live, but that we waste a lot of it.",
    note: "Most days aren't short. They leak. Find the leak (for most of us it's the phone) and the day gets longer." },
  { theme: "time", by: "Seneca", text: "Hold every hour in your grasp.",
    note: "Pick the next hour and decide what it's for before it starts. Hours you don't plan get planned for you." },
  { theme: "time", by: "Benjamin Franklin", text: "Lost time is never found again.",
    note: "Money can be earned back and a missed task can be done tomorrow. The hour itself can't." },
  { theme: "time", by: "Charles Darwin", text: "A man who dares to waste one hour of time has not discovered the value of life.",
    note: "One hour a day is 365 hours a year. That's long enough to learn a language or read twenty books." },
  { theme: "time", by: "Ethiopian proverb", am: "ጊዜ ወርቅ ነው።", text: "Time is gold.",
    note: "Spend it the way you'd spend gold: on purpose, and on things that last." },
  { theme: "time", by: "Psalm 90:12", text: "So teach us to number our days, that we may apply our hearts unto wisdom.",
    note: "This is what a countdown is for. Seeing the days as a number makes each one count." },
  { theme: "time", by: "Leonardo da Vinci", text: "Time stays long enough for anyone who will use it.",
    note: "Feeling short of time is usually a sign the time is going somewhere you didn't choose." },

  // Starting / not postponing
  { theme: "start", by: "Seneca", text: "While we are postponing, life speeds by.",
    note: "Every task you push to tomorrow takes a little of tomorrow with it. Finish one postponed task first today." },
  { theme: "start", by: "Ethiopian saying", am: "የዛሬን ሥራ ለነገ አትተው።", text: "Don't leave today's work for tomorrow.",
    note: "Tomorrow already has its own list. Give it a clean start by finishing today's." },
  { theme: "start", by: "William James", text: "Nothing is so fatiguing as the eternal hanging on of an uncompleted task.",
    note: "A task you keep postponing tires you more than doing it would. Get it off your list and feel lighter." },
  { theme: "start", by: "Lao Tzu", text: "A journey of a thousand miles begins with a single step.",
    note: "Don't plan the whole thing. Do the first five minutes of the biggest task." },
  { theme: "start", by: "Epictetus", text: "First say to yourself what you would be; and then do what you have to do.",
    note: "Decide who you're becoming in these 90 days, then let that decide today's tasks." },
  { theme: "start", by: "Seneca", text: "Begin at once to live, and count each separate day as a separate life.",
    note: "Yesterday's crossed-off day is done. Today is a fresh one, so treat it that way." },
  { theme: "start", by: "Benjamin Franklin", text: "Well done is better than well said.",
    note: "Writing a task down is the easy part. Tick one box before you add another." },

  // Steady, consistent effort
  { theme: "steady", by: "Ethiopian proverb", am: "ቀስ በቀስ እንቁላል በእግሩ ይሄዳል።", text: "Little by little, the egg will walk.",
    note: "Big changes come from small steps repeated. A chick doesn't hatch overnight, and neither does a habit." },
  { theme: "steady", by: "Ethiopian proverb", am: "ድር ቢያብር አንበሳ ያስር።", text: "When spider webs unite, they can tie up a lion.",
    note: "One small task does little. Ninety days of small tasks can hold down something huge." },
  { theme: "steady", by: "Ethiopian proverb", am: "ጠብታ ውሃ ድንጋይ ይበሳል።", text: "Dripping water pierces stone.",
    note: "Persistence beats force. Keep showing up, even on days when it feels like nothing moves." },
  { theme: "steady", by: "Benjamin Franklin", text: "Little strokes fell great oaks.",
    note: "Your streak is a row of little strokes. Protect it." },
  { theme: "steady", by: "Aesop", text: "Slow and steady wins the race.",
    note: "You don't need a perfect day. You need a decent day, again and again." },
  { theme: "steady", by: "Epictetus", text: "No great thing is created suddenly.",
    note: "If progress feels slow, that's normal. Look back at the crossed-off days to see how far you've come." },
  { theme: "steady", by: "Galatians 6:9", text: "Let us not be weary in well doing: for in due season we shall reap, if we faint not.",
    note: "The middle of a countdown is the hardest part. The results come to those who don't quit halfway." },
  { theme: "steady", by: "Will Durant, on Aristotle", text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    note: "Your repeating tasks are where this happens. Treat them as the most important things on the list." },

  // Money
  { theme: "money", by: "Benjamin Franklin", text: "Beware of little expenses; a small leak will sink a great ship.",
    note: "Look at your biggest category this week. The leak is usually many small amounts, not one big one." },
  { theme: "money", by: "Benjamin Franklin", text: "If you would be wealthy, think of saving as well as getting.",
    note: "Earning more doesn't help if spending rises with it. Decide what to keep before you spend." },
  { theme: "money", by: "Epictetus", text: "Wealth consists not in having great possessions, but in having few wants.",
    note: "Before the next purchase, ask whether you want it or only want the feeling of buying it." },
  { theme: "money", by: "Proverbs 13:11", text: "Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.",
    note: "Slow, honest saving grows. Money that comes easily tends to leave easily too." },
  { theme: "money", by: "Luke 14:28", text: "For which of you, intending to build a tower, sitteth not down first, and counteth the cost?",
    note: "Plan the spending before the month starts, not after the money is gone." },
  { theme: "money", by: "Benjamin Franklin", text: "An investment in knowledge pays the best interest.",
    note: "If you're going to spend, books, courses and skills are the purchases that pay you back." },

  // Focus and attention
  { theme: "focus", by: "Henry David Thoreau", text: "It is not enough to be busy. The question is: what are we busy about?",
    note: "Scrolling feels busy. Before you open an app, name what you're actually busy with." },
  { theme: "focus", by: "Marcus Aurelius", text: "The happiness of your life depends upon the quality of your thoughts.",
    note: "What you feed your mind all day becomes your mood. Choose your feed as carefully as your food." },
  { theme: "focus", by: "Marcus Aurelius", text: "Waste no more time arguing what a good man should be. Be one.",
    note: "Less reading about self-improvement, more doing it. Today's task list is where it happens." },
  { theme: "focus", by: "Ecclesiastes 3:1", text: "To every thing there is a season, and a time to every purpose under the heaven.",
    note: "There's a time for rest and a time for scrolling, but neither should take over the time for work." },

  // Purpose
  { theme: "purpose", by: "Abebe Bikila", text: "I wanted the world to know that my country, Ethiopia, has always won with determination and heroism.",
    note: "He won the Olympic marathon in Rome running barefoot. Whatever you're short of, determination makes up for a lot." },
  { theme: "purpose", by: "Marcus Aurelius", text: "Do every act of your life as though it were the very last act of your life.",
    note: "Give the task in front of you your full attention, as if nothing else were waiting." },
  { theme: "purpose", by: "Proverbs 6:6", text: "Go to the ant, thou sluggard; consider her ways, and be wise.",
    note: "Nobody tells the ant to work. Build the habit so you don't need to be pushed either." },
];

export type QuoteSignals = {
  /** average minutes a day on social apps over the last week */
  screenAvg: number;
  /** unfinished tasks today that were postponed from earlier days */
  postponed: number;
  /** spending in the last 7 days compared with the 7 before (1.2 = 20% more) */
  spendRatio: number;
  /** finished days in a row with every task done */
  streak: number;
};

/** Which theme fits today, and a sentence on why it was picked. */
export function themeFor(s: QuoteSignals): { theme: Theme | null; why: string | null } {
  if (s.postponed >= 2) return { theme: "start", why: `Picked because ${s.postponed} tasks are waiting from earlier days.` };
  if (s.screenAvg >= 120) return { theme: "time", why: `Picked because you're averaging ${Math.round(s.screenAvg / 6) / 10} hours a day on social apps.` };
  if (s.spendRatio >= 1.25) return { theme: "money", why: `Picked because your spending is up ${Math.round((s.spendRatio - 1) * 100)}% on the week before.` };
  if (s.streak >= 3) return { theme: "steady", why: `Picked to keep your ${s.streak}-day streak going.` };
  return { theme: null, why: null };
}

/** The quote for a day; `skip` steps to the next one in the same pool. */
export function quoteFor(day: number, s: QuoteSignals, skip = 0) {
  const { theme, why } = themeFor(s);
  const pool = theme ? QUOTES.filter((q) => q.theme === theme) : QUOTES;
  // Stepping 11 a day (coprime with every pool size here) visits every quote before repeating.
  const i = (day * 11 + skip) % pool.length;
  return { quote: pool[i], why: skip ? null : why };
}
