const fs = require('fs');
let app = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', 'utf8');

const lines = app.split('\n');

// Find line 541 (0-indexed 540)
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('? topAlerts.map((a, i) => renderAlertItem(a, i)).join(\'\')')) {
        // Replace the next 6 lines
        const newCode = "                : '<div class=\"empty-state\"><div class=\"empty-icon\">✓</div><p class=\"empty-state-text\">No active alerts</p></div>'";
        lines.splice(i + 1, 6, newCode);
        break;
    }
}

// Now put the emptyStateStr in the ACTUAL renderPatients function
let patientsStart = lines.findIndex(l => l.includes('function renderPatients(container) {'));
if (patientsStart !== -1) {
    let emptyStateIndex = -1;
    for (let i = patientsStart; i < patientsStart + 100; i++) {
        if (lines[i] && lines[i].includes('<div class="empty-state">')) {
            emptyStateIndex = i;
            break;
        }
    }
    
    if (emptyStateIndex !== -1) {
        const replacement = `                                : \`<div class="empty-state">
                                    <div style="font-size:3rem;margin-bottom:10px">👥</div>
                                    <h3>No Patients Found</h3>
                                    <p class="text-secondary">You don't have any patients in your list yet.</p>
                                    <button class="btn btn-primary mt-3" id="btn-seed-patients">Initialize Sample Patients</button>
                                </div>\`
        `;
        lines.splice(emptyStateIndex, 1, replacement);
    }
}

fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', lines.join('\n'));
console.log("Fixed syntax error and injected seed button properly.");
