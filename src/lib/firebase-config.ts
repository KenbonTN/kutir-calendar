// The web app config from the Firebase console (Project settings → Your apps).
// These values are public identifiers, not secrets: access is controlled by
// Firestore security rules (firestore.rules) and the authorized domains list.
// While this is null, sign-in is hidden and crosses stay on the device only.

import type { FirebaseOptions } from "firebase/app";

export const firebaseConfig: FirebaseOptions | null = {
  apiKey: "AIzaSyByEUcxyswm_lLSre_cpIc_uhCwi_hQ-Kg",
  authDomain: "kutir-calendar.firebaseapp.com",
  projectId: "kutir-calendar",
  storageBucket: "kutir-calendar.firebasestorage.app",
  messagingSenderId: "401647531684",
  appId: "1:401647531684:web:6ca5bd706b68dc930c5831",
};
