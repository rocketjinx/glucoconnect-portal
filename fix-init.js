const fs = require('fs');
let app = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', 'utf8');

const oldInitStart = app.indexOf('// Check session');
const oldInitEnd = app.indexOf('// Hide loading screen');

if (oldInitStart !== -1 && oldInitEnd !== -1) {
    const newInit = `
        if (GC.firebase && GC.firebase.auth) {
            GC.firebase.auth.onAuthStateChanged(user => {
                if (user) {
                    GC.firebase.db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists) {
                            state.activeDoctor = doc.data();
                        } else {
                            state.activeDoctor = { id: user.uid, email: user.email, name: user.displayName || 'Unknown User', role: 'doctor', avatar: '?' };
                        }
                        
                        GC.firebase.db.collection('patients').where('doctorId', '==', user.uid).get().then(snap => {
                            state.patients = snap.docs.map(d => d.data());
                            initializeApp();
                        }).catch(err => {
                            console.error('Failed to load patients', err);
                            state.patients = [];
                            initializeApp();
                        });
                        
                    }).catch(err => {
                        console.error('Failed to load user', err);
                        showLogin();
                    });
                } else {
                    showLogin();
                }
            });
        } else {
            showLogin();
        }

        `;
        
    app = app.slice(0, oldInitStart) + newInit + app.slice(oldInitEnd);
    fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', app);
    console.log("Fixed init auth!");
} else {
    console.log("Could not find init boundaries.");
}
