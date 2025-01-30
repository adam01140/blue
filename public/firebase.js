/* firebase.js */

// 1) Setup
const firebaseConfig = {
  apiKey: "AIzaSyBlxFmFD-rz1V_Q9_oV0DkLsENbmyJ1k-U",
  authDomain: "flowchart-1eb90.firebaseapp.com",
  projectId: "flowchart-1eb90",
  storageBucket: "flowchart-1eb90.firebasestorage.app",
  messagingSenderId: "546103281533",
  appId: "1:546103281533:web:ae719cdbde727dcd94ee14",
  measurementId: "G-8VSXRFREY9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* We'll define some globals for user, color prefs, etc. */
window.currentUser = null;
window.colorPreferences = {
  text: "#4B82D5",
  checkbox: "#79AFFF",
  dropdown: "#ADD8E6",
  money: "#E0FFFF"
};

// Attempt local storage fallback
let storedPrefs = localStorage.getItem("colorPreferences");
if (storedPrefs) {
  try {
    window.colorPreferences = JSON.parse(storedPrefs);
  } catch(e){}
}

// Basic helper for cookies
window.setCookie = function(name, value, days=7) {
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
};
window.getCookie = function(name) {
  let decodedCookie = decodeURIComponent(document.cookie);
  let parts = decodedCookie.split(';');
  let prefix = name + "=";
  for (let c of parts) {
    let cc = c.trim();
    if (cc.indexOf(prefix)===0) {
      return cc.substring(prefix.length, cc.length);
    }
  }
  return "";
};

// Auth changes
auth.onAuthStateChanged(async (user) => {
  if (user) {
    window.currentUser = user;
    setCookie("flowchartUserId", user.uid);
    await loadColorPreferencesFromFirestore();

    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("logoutButton").style.display = "block";
    updateLegendBlocks(); // from color.js, to refresh squares
    if (window.graph) window.refreshAllCells();
  } else {
    let cUser = getCookie("flowchartUserId");
    if (cUser) {
      setCookie("flowchartUserId","",-1);
    }
    document.getElementById("logoutButton").style.display = "none";
    document.getElementById("loginOverlay").style.display = "flex";
  }
});

// Firestore logic
window.loadColorPreferencesFromFirestore = async function() {
  if (!window.currentUser) return;
  const docRef = db.collection("users").doc(window.currentUser.uid);
  try {
    let snap = await docRef.get();
    if (snap.exists) {
      let data = snap.data();
      if (data.colorPreferences) {
        window.colorPreferences = data.colorPreferences;
        localStorage.setItem("colorPreferences", JSON.stringify(window.colorPreferences));
      }
    }
  } catch(e) {
    console.warn("Could not load color prefs", e);
  }
};

window.saveColorPreferencesToFirestore = async function() {
  // always store locally
  localStorage.setItem("colorPreferences", JSON.stringify(window.colorPreferences));
  if (!window.currentUser) return;
  try {
    const docRef = db.collection("users").doc(window.currentUser.uid);
    await docRef.set({ colorPreferences: window.colorPreferences }, { merge: true });
  } catch(e) {
    console.warn("Could not save color prefs", e);
  }
};
