(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};
    window.GlucoConnect.rules = window.GlucoConnect.rules || {};

    window.GlucoConnect.rules.alerts = {
        generateAllAlerts: function(patients) {
            const alerts = [];
            
            patients.forEach(patient => {
                if (!patient.glucoseReadings || patient.glucoseReadings.length === 0) return;
                
                // Sort readings by date and time
                const sorted = [...patient.glucoseReadings].sort((a,b) => {
                    return (b.date + b.time).localeCompare(a.date + a.time);
                });
                
                const latest = sorted[0];
                
                // Critical Hypoglycemia
                if (latest.value < 54) {
                    alerts.push({
                        patientId: patient.id,
                        patientName: patient.name,
                        severity: 'emergency',
                        title: 'Severe Hypoglycemia (<54 mg/dL)',
                        message: `Latest reading is ${latest.value} mg/dL at ${latest.time}.`,
                        recommendation: 'Immediate intervention required. Call patient.',
                        timestamp: new Date().toISOString()
                    });
                }
                // DKA/HHS Risk
                else if (latest.value >= 400) {
                    alerts.push({
                        patientId: patient.id,
                        patientName: patient.name,
                        severity: 'emergency',
                        title: 'DKA/HHS Risk (>400 mg/dL)',
                        message: `Extremely high glucose: ${latest.value} mg/dL.`,
                        recommendation: 'Check for ketones immediately. Advise ER visit if symptomatic.',
                        timestamp: new Date().toISOString()
                    });
                }
                // Hypoglycemia
                else if (latest.value < 70) {
                    alerts.push({
                        patientId: patient.id,
                        patientName: patient.name,
                        severity: 'urgent',
                        title: 'Hypoglycemia Alert',
                        message: `Glucose dropped to ${latest.value} mg/dL.`,
                        recommendation: 'Follow 15-15 rule. Review medication dosing.',
                        timestamp: new Date().toISOString()
                    });
                }
                // High Hyperglycemia
                else if (latest.value > 300) {
                    alerts.push({
                        patientId: patient.id,
                        patientName: patient.name,
                        severity: 'urgent',
                        title: 'Severe Hyperglycemia',
                        message: `Glucose spiked to ${latest.value} mg/dL.`,
                        recommendation: 'Review adherence and recent meals. Adjust medication if persistent.',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Pattern alerts (from glucose-rules)
                if (window.GlucoConnect.rules.glucose) {
                    const patterns = window.GlucoConnect.rules.glucose.detectPatterns(patient.glucoseReadings);
                    patterns.forEach(p => {
                        alerts.push({
                            patientId: patient.id,
                            patientName: patient.name,
                            severity: p.severity,
                            title: p.message,
                            message: p.recommendation,
                            timestamp: new Date().toISOString()
                        });
                    });
                }
            });
            
            // Sort by severity (emergency > urgent > alert > warning)
            const severityRank = { 'emergency': 0, 'urgent': 1, 'alert': 2, 'warning': 3, 'info': 4 };
            return alerts.sort((a,b) => severityRank[a.severity] - severityRank[b.severity]);
        }
    };
})();
