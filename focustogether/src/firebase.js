// firebase.js — paste your Firebase project config below

import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://focustogether-d49a3-default-rtdb.firebaseio.com",
  projectId: "focustogether-d49a3",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);