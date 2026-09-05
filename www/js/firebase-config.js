
const firebaseConfig = {
    apiKey: "AIzaSyAfyuVAHeJ6d_06YFod08yLWA1Ie1BcD7g",
    authDomain: "citizenreport-28323.firebaseapp.com",
    projectId: "citizenreport-28323",
    storageBucket: "citizenreport-28323.firebasestorage.app",
    messagingSenderId: "765175581085",
    appId: "1:765175581085:web:92aec8ca3901641d160774"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

db.enablePersistence().catch(function (err) {
    console.warn("Firestore persistence not enabled:", err.code);
});
