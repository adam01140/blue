/* 
 ************************************************************************************************************
 ************************************************************************************************************
 ***                                                                                                      ***
 ***     S E C T I O N 5:   F I R E B A S E   &   A U T H                                                 ***
 ***                                                                                                      ***
 ************************************************************************************************************
 ************************************************************************************************************
*/

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
const db = firebase.firestore();
let currentUser = null;

let colorPreferences = {
  text: "#749FFE",
  checkbox: "#A1B8FE",
  dropdown: "#C5D4FE",
  money: "#E2EAFF"
};

const loginOverlay = document.getElementById("loginOverlay");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

function showLoginOverlay() {
  loginOverlay.style.display = "flex";
}
function hideLoginOverlay() {
  loginOverlay.style.display = "none";
}
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days*24*60*60*1000);
  const expires = "expires="+ d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}
function getCookie(name) {
  const ca = document.cookie.split(';');
  name = name + "=";
  for (let i=0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function checkForSavedLogin() {
  const savedUid = getCookie("flowchart_uid");
  if (savedUid) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user && user.uid === savedUid) {
        currentUser = user;
        hideLoginOverlay();
        loadUserColorPrefs();
      } else {
        showLoginOverlay();
      }
    });
  } else {
    showLoginOverlay();
  }
}

loginButton.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then((cred) => {
      currentUser = cred.user;
      setCookie("flowchart_uid", currentUser.uid, 7);
      hideLoginOverlay();
      loadUserColorPrefs();
    })
    .catch((err) => {
      loginError.textContent = err.message;
    });
});
signupButton.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();
  firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then((cred) => {
      currentUser = cred.user;
      setCookie("flowchart_uid", currentUser.uid, 7);
      hideLoginOverlay();
      saveUserColorPrefs().then(() => {
        loadUserColorPrefs();
      });
    })
    .catch((err) => {
      loginError.textContent = err.message;
    });
});

function loadUserColorPrefs() {
  if (!currentUser) return;
  db.collection("users")
    .doc(currentUser.uid)
    .collection("preferences")
    .doc("colors")
    .get()
    .then(docSnap => {
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data.text) colorPreferences.text = data.text;
        if (data.checkbox) colorPreferences.checkbox = data.checkbox;
        if (data.dropdown) colorPreferences.dropdown = data.dropdown;
        if (data.money) colorPreferences.money = data.money;
      }
      updateLegendColors();
      refreshAllCells();
    })
    .catch(err => {
      console.error("Error loading color prefs:", err);
    });
}
function saveUserColorPrefs() {
  if (!currentUser) return Promise.resolve();
  return db.collection("users")
    .doc(currentUser.uid)
    .collection("preferences")
    .doc("colors")
    .set(colorPreferences, { merge: true });
}

// Start the login check right away.
checkForSavedLogin();
