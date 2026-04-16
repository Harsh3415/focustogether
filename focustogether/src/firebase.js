import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "https://focustogether-d49a3-default-rtdb.firebaseio.com",
  projectId: "focustogether-d49a3",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };