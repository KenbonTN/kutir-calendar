# Kutir ቁጥር

**A planner built on the Ethiopian calendar. Plan your days, then see how much of the plan you actually did.**

**Live:** https://kenbontn.github.io/kutir-calendar/ · install it on your phone from the browser (Share → Add to Home Screen on iPhone, or Install app on Android).

## What it does

- **Countdowns:** set a goal and a deadline. Each day that passes gets a big red ✕, and you see days left, perfect days and your streak.
- **Tasks:** plan each day. Unfinished tasks move to the next day and show how late they are. Repeating tasks cover habits, and you can star a top 3 for the day.
- **Focus timer:** time a task, then compare the time it took with your estimate.
- **Task pool:** a list of everything you want to do, grouped by life area (faith, family, health, work, each of your businesses…). Plan items onto days. If you finish early, pull more from the pool and they move to today.
- **Weekly review:** planned vs. done, how evenly your time went across life areas, and what keeps slipping. Each evening you can add a one-line reflection.
- **Life:** big goals for the year that countdowns and tasks link up to, a grid of squares for each habit, reminders to call the people you care about, and a log of the fast days you kept. On Enkutatash, a review of the year that just ended.
- **Money:** income by source and spending by category, in Birr. Also monthly budgets, equb rounds and payout dates, money lent and borrowed, and profit month by month for each business.
- **Birthdays & important dates:** they repeat every year on their Ethiopian or Gregorian date, show ages, and remind you ahead of time.
- **Screen time:** log TikTok, Instagram and YouTube minutes, and see what that time could have been.
- **Calendar:** Ethiopian and Gregorian months side by side, Ge'ez numerals, the saint of each day, feasts, fasts and national holidays.
- **Football (optional):** Arsenal and big Champions League games, with kickoff in Addis time.
- **Telegram quick-add:** send the bot `call the bank`, `tomorrow: gym`, `-250 taxi` or `+5000 salary`, and it lands in Kutir.
- **Everywhere:** sign in with Google to sync across your phone and laptop. It works offline, sends an evening reminder, exports a backup file and an .ics calendar, and has an Amharic option.

## How it's built

- **Next.js** (static export), **TypeScript**, **Tailwind CSS**, **Motion**
- Ethiopian calendar math on Julian Day Numbers, with Orthodox Easter from the Julian computus
- **Firebase** Auth + Firestore for sync. Every record carries a change time, so devices merge one record at a time without losing edits.
- **PWA** with a service worker and Web Push. GitHub Actions deploys to GitHub Pages, refreshes fixtures daily, sends evening reminders, and checks the Telegram bot for new messages every 5 minutes.

## Run it locally

```bash
npm install
npm run fixtures   # refresh football fixtures
npm run dev
```

Fixture data: Premier League from [openfootball](https://github.com/openfootball/football.json), Champions League from [TheSportsDB](https://www.thesportsdb.com).
