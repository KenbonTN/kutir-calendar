// Publishes firestore.rules to the Firebase project with the admin key in .secrets/.
// Run after changing the rules, and before pushing app changes that save new fields:
//   node scripts/deploy-rules.mjs

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const root = new URL("../", import.meta.url);
const require = createRequire(new URL("scripts/reminders/package.json", root));
const { cert, initializeApp } = require("firebase-admin/app");
const { getSecurityRules } = require("firebase-admin/security-rules");

initializeApp({ credential: cert(JSON.parse(readFileSync(new URL(".secrets/firebase-admin.json", root), "utf8"))) });
const released = await getSecurityRules().releaseFirestoreRulesetFromSource(
  readFileSync(new URL("firestore.rules", root), "utf8"),
);
console.log(`rules published (${released.name.split("/").pop()})`);
