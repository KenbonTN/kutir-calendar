# Kutir Countdown Calendar

**Live:** https://kenbontn.github.io/kutir-calendar/

An Ethiopian calendar for tracking goals day by day. Pick a start date and a length (1 week up to 3 months, or any number of days), cross off each day with a big red X, and count down to the deadline.

- **Goals:** several at once, with progress, streak, hit rate and days left
- **Ethiopian calendar:** months in English and Amharic, Ge'ez numerals, the Gregorian date on every day
- **Orthodox calendar:** the saint remembered on each day of the month, annual feasts (Meskel, Genna, Timket, Fasika and the movable feasts), and fasting days
- **Football:** every Arsenal Premier League game and the big Champions League nights, with kickoff in Addis time on both the 24-hour and the Ethiopian clock

Crosses are saved in your browser (localStorage) on the device you use.

## Develop

```bash
npm install
npm run fixtures   # refresh src/data/fixtures.json
npm run dev
```

Built with Next.js (static export), Tailwind CSS and Motion. GitHub Actions rebuilds and deploys to GitHub Pages on every push and once a day, which keeps fixtures and results current.

Fixture data: Premier League from [openfootball](https://github.com/openfootball/football.json), Champions League from [TheSportsDB](https://www.thesportsdb.com).
