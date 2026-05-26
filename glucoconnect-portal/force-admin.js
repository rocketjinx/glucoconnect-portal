const fs = require('fs');
let app = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', 'utf8');

const authListener = `GC.firebase.db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists) {
                            state.activeDoctor = doc.data();
                            
                            // FORCE ADMIN UPGRADE
                            if(state.activeDoctor.email && state.activeDoctor.email.toLowerCase() === 'pranshujmodi2007@gmail.com' && state.activeDoctor.role !== 'admin') {
                                state.activeDoctor.role = 'admin';
                                GC.firebase.db.collection('users').doc(user.uid).update({ role: 'admin' });
                            }
                        } else {
                            state.activeDoctor = { id: user.uid, email: user.email, name: user.displayName || 'Unknown User', role: user.email.toLowerCase() === 'pranshujmodi2007@gmail.com' ? 'admin' : 'doctor', avatar: '?' };
                        }`;

app = app.replace(/GC\.firebase\.db\.collection\('users'\)\.doc\(user\.uid\)\.get\(\)\.then\(doc => \{\s*if \(doc\.exists\) \{\s*state\.activeDoctor = doc\.data\(\);\s*\} else \{\s*state\.activeDoctor = \{ id: user\.uid, email: user\.email, name: user\.displayName \|\| 'Unknown User', role: 'doctor', avatar: '\?' \};\s*\}/m, authListener);

fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', app);
console.log('Force upgrade applied!');
