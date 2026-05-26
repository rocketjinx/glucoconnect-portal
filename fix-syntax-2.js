const fs = require('fs');
let app = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', 'utf8');

const startIdx = app.indexOf('function renderPatients(container) {');
const endIdx = app.indexOf('// ════════════════════════════════════════════════════════\n    //  PATIENT DETAIL VIEW');

if(startIdx !== -1 && endIdx !== -1) {
const correctFunc = `function renderPatients(container) {
        const patients = (state.patients || []);
        const filtered = filterPatients(patients);

        container.innerHTML = \`
            <div class="animate-fadeIn">
                <div class="patients-header">
                    <div class="patients-filters">
                        \${['all', 'critical', 'high', 'moderate', 'low'].map(f =>
            \\\`<button class="filter-btn \${state.patientFilter === f ? 'active' : ''}" onclick="GlucoConnect.app.setFilter('\${f}')">\${capitalize(f)}</button>\\\`
        ).join('')}
                    </div>
                </div>

                <div class="section-card full-width">
                    <table class="patients-table">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Status</th>
                                <th>Latest HbA1c</th>
                                <th>Recent Glucose</th>
                                <th>Next Visit</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${filtered.map((p, i) => \\\`
                                <tr class="stagger-item" style="animation-delay:\${i * 30}ms">
                                    <td>
                                        <div style="display:flex;align-items:center;gap:12px">
                                            <div class="patient-avatar">\${getInitials(p.name)}</div>
                                            <div>
                                                <div class="fw-600">\${escapeHtml(p.name)}</div>
                                                <div class="text-secondary text-sm">ID: \${p.id} • Age \${p.age}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="status-badge status-\${p.riskLevel}">\${capitalize(p.riskLevel)}</span>
                                    </td>
                                    <td class="fw-500">\${p.hba1c}%</td>
                                    <td>
                                        <div class="sparkline-container" id="spark-\${p.id}"></div>
                                    </td>
                                    <td class="text-secondary">\${formatDate(p.nextVisit)}</td>
                                    <td>
                                        <button class="section-btn" onclick="GlucoConnect.app.viewPatient('\${p.id}')">View Detail</button>
                                    </td>
                                </tr>
                            \\\`).join('')}
                        </tbody>
                    </table>
                    
                    \${patients.length === 0 ? \\\`
                        <div class="empty-state">
                            <div style="font-size:3rem;margin-bottom:10px">👥</div>
                            <h3>No Patients Found</h3>
                            <p class="text-secondary">You don't have any patients in your list yet.</p>
                            <button class="btn btn-primary mt-3" id="btn-seed-patients">Initialize Sample Patients</button>
                        </div>\\\` : ''}
                    
                    \${patients.length > 0 && filtered.length === 0 ? \\\`<div class="empty-state"><p class="text-secondary">No patients match the selected filter.</p></div>\\\` : ''}
                </div>
            </div>
        \`;

        // Render sparklines
        setTimeout(() => {
            filtered.forEach(p => {
                if (GC.charts && GC.charts.renderSparkline) {
                    GC.charts.renderSparkline('spark-' + p.id, p.glucoseReadings.slice(-14).map(r => r.value));
                }
            });
        }, 50);

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
    }
    
    `;

    app = app.slice(0, startIdx) + correctFunc + app.slice(endIdx);
    fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', app);
    console.log('Fixed renderPatients function!');
} else {
    console.log('Could not find markers', startIdx, endIdx);
}
