(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};

    const firebaseConfig = {
      apiKey: "AIzaSyDzRRx0_-qhqAw3pSg41acWTjsKMU0takY",
      authDomain: "glucoconnect.firebaseapp.com",
      projectId: "glucoconnect",
      storageBucket: "glucoconnect.firebasestorage.app",
      messagingSenderId: "859188814762",
      appId: "1:859188814762:web:be123ab4e1b4070a2341d3",
      measurementId: "G-SPE9KE76N8"
    };

    try {
        // Initialize Primary App
        const app = firebase.initializeApp(firebaseConfig);
        
        // Initialize Secondary App for Admin to create users without being logged out
        const adminApp = firebase.initializeApp(firebaseConfig, "AdminApp");

        window.GlucoConnect.firebase = {
            auth: firebase.auth(),
            db: firebase.firestore(),
            adminAuth: adminApp.auth()
        };
        console.log("🔥 Connected to Google Firebase Cloud");
    } catch (e) {
        console.error("Firebase initialization error:", e);
    }
})();
