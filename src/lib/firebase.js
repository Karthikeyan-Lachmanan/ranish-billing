// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3w5jC1Rblzf-8qSoI4s-ysKYkwoN2tbI",
  authDomain: "ranishicecreams.firebaseapp.com",
  projectId: "ranishicecreams",
  storageBucket: "ranishicecreams.appspot.com",
  messagingSenderId: "1022205900020",
  appId: "1:1022205900020:web:85b4ca38200c1db3cc1aa1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
