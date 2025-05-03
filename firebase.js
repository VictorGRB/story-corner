import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";  // 🔥 Add this

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
// const auth = getAuth(app);  // 🔥 Initialize auth

export { db};  // 🔥 Export it
