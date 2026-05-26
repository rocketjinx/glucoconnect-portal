const fs = require('fs');
let app = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', 'utf8');

// Replace GC.patients with state.patients
app = app.replace(/GC\.patients/g, '(state.patients || [])');

// Add the init logic for fetching patients
const initBlock = `
        if (GC.firebase && GC.firebase.auth) {
            GC.firebase.auth.onAuthStateChanged(user => {
                if (user) {
                    GC.firebase.db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists) {
                            state.activeDoctor = doc.data();
                        } else {
                            state.activeDoctor = { id: user.uid, email: user.email, name: user.displayName || 'Unknown User', role: 'doctor', avatar: '?' };
                        }
                        
                        // FETCH PATIENTS FOR THIS DOCTOR
                        GC.firebase.db.collection('patients').where('doctorId', '==', user.uid).get().then(snap => {
                            state.patients = snap.docs.map(d => d.data());
                            initializeApp();
                        }).catch(err => {
                            console.error('Failed to load patients', err);
                            state.patients = [];
                            initializeApp();
                        });
                        
                    });
                } else {
                    showLogin();
                }
            });
        }
`;

app = app.replace(/if \(GC\.firebase && GC\.firebase\.auth\) \{\s*GC\.firebase\.auth\.onAuthStateChanged\(user => \{[\s\S]*?\}\);\s*\}/m, initBlock.trim());

// Add Seed button to renderPatients
const emptyStateStr = `<div class="empty-state">
                    <div style="font-size:3rem;margin-bottom:10px">👥</div>
                    <h3>No Patients Found</h3>
                    <p class="text-secondary">You don't have any patients in your list yet.</p>
                    <button class="btn btn-primary mt-3" id="btn-seed-patients">Initialize Sample Patients</button>
                </div>`;

app = app.replace(/<div class="empty-state">[\s\S]*?<\/div>/m, emptyStateStr);

// Now we need to add the event listener for btn-seed-patients
const seedLogic = `
        setTimeout(() => {
            const btnSeed = document.getElementById('btn-seed-patients');
            if(btnSeed) {
                btnSeed.addEventListener('click', () => {
                    if(!window.GlucoConnect.patients || window.GlucoConnect.patients.length === 0) {
                        alert('Error: Mock patient data not loaded from file.');
                        return;
                    }
                    
                    btnSeed.textContent = 'Uploading to Cloud...';
                    btnSeed.disabled = true;
                    
                    const sample = window.GlucoConnect.patients.slice(0, 5);
                    const batch = GC.firebase.db.batch();
                    
                    sample.forEach(p => {
                        const ref = GC.firebase.db.collection('patients').doc(p.id);
                        const data = Object.assign({}, p, { doctorId: state.activeDoctor.id });
                        batch.set(ref, data);
                    });
                    
                    batch.commit().then(() => {
                        window.location.reload();
                    }).catch(e => {
                        alert('Upload failed: ' + e.message);
                        btnSeed.textContent = 'Initialize Sample Patients';
                        btnSeed.disabled = false;
                    });
                });
            }
        }, 100);
`;

const renderPatientsStart = app.indexOf('function renderPatients(container) {');
const renderPatientsEnd = app.indexOf('}', app.indexOf(' container.innerHTML =', renderPatientsStart));
app = app.slice(0, renderPatientsEnd) + seedLogic + app.slice(renderPatientsEnd);

fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', app);
console.log('App updated for Multi-Tenancy!');
