const fs = require('fs');
let app = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', 'utf8');
app = app.split('\\`').join('`');
fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/glucoconnect-portal/app.js', app);
