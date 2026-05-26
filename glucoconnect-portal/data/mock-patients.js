(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};

    // Helper to generate readings
    function generateReadings(startDateStr, days, baseGlucose, variability, compliance) {
        const readings = [];
        const startDate = new Date(startDateStr);
        startDate.setDate(startDate.getDate() - days);

        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            // Random modifier based on variability
            const rnd = () => (Math.random() * 2 - 1) * variability;
            
            // Fasting (Morning)
            readings.push({ date: dateStr, time: '06:30', type: 'fasting', value: Math.round(baseGlucose.fasting + rnd()), note: '' });
            
            // Post-Breakfast
            const pbSpike = compliance === 'poor' ? 70 : compliance === 'moderate' ? 40 : 25;
            readings.push({ date: dateStr, time: '09:00', type: 'post-meal', value: Math.round(baseGlucose.fasting + pbSpike + rnd()), note: 'Breakfast' });
            
            // Post-Lunch
            const plSpike = compliance === 'poor' ? 80 : compliance === 'moderate' ? 50 : 30;
            readings.push({ date: dateStr, time: '14:30', type: 'post-meal', value: Math.round(baseGlucose.fasting + plSpike + rnd()), note: 'Lunch' });
            
            // Post-Dinner
            const pdSpike = compliance === 'poor' ? 90 : compliance === 'moderate' ? 45 : 25;
            readings.push({ date: dateStr, time: '21:30', type: 'post-meal', value: Math.round(baseGlucose.fasting + pdSpike + rnd()), note: 'Dinner' });
        }
        return readings;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    window.GlucoConnect.patients = [
        {
            id: 'P001',
            name: 'Rajesh Kumar Sharma',
            age: 52, gender: 'Male', city: 'Mumbai',
            diagnosisDate: '2019-03-15', diabetesType: 'Type 2',
            hba1c: 9.2,
            medications: [
                { name: 'Metformin', dose: '1000mg', frequency: 'BD', timing: 'with-meals', adherence: 0.60 },
                { name: 'Glimepiride', dose: '4mg', frequency: 'OD', timing: 'before-breakfast', adherence: 0.85 }
            ],
            weight: 85, height: 170, bmi: 29.4,
            bp: { systolic: 145, diastolic: 92 },
            comorbidities: ['Hypertension'],
            riskLevel: 'critical',
            lastVisit: '2026-04-10',
            glucoseReadings: generateReadings(todayStr, 30, { fasting: 180 }, 30, 'poor'),
            medicationLog: [], mealLog: [], activityLog: []
        },
        {
            id: 'P002',
            name: 'Priya Patel',
            age: 45, gender: 'Female', city: 'Ahmedabad',
            diagnosisDate: '2022-11-20', diabetesType: 'Type 2',
            hba1c: 7.8,
            medications: [
                { name: 'Metformin', dose: '500mg', frequency: 'BD', timing: 'with-meals', adherence: 0.85 },
                { name: 'Sitagliptin', dose: '50mg', frequency: 'OD', timing: 'morning', adherence: 0.90 }
            ],
            weight: 68, height: 160, bmi: 26.5,
            bp: { systolic: 128, diastolic: 82 },
            comorbidities: [],
            riskLevel: 'moderate',
            lastVisit: '2026-05-01',
            glucoseReadings: generateReadings(todayStr, 30, { fasting: 125 }, 15, 'moderate'),
            medicationLog: [], mealLog: [], activityLog: []
        },
        {
            id: 'P003',
            name: 'Anil Desai',
            age: 61, gender: 'Male', city: 'Pune',
            diagnosisDate: '2015-06-10', diabetesType: 'Type 2',
            hba1c: 6.4,
            medications: [
                { name: 'Metformin', dose: '500mg', frequency: 'OD', timing: 'with-dinner', adherence: 0.98 }
            ],
            weight: 70, height: 175, bmi: 22.8,
            bp: { systolic: 120, diastolic: 78 },
            comorbidities: [],
            riskLevel: 'low',
            lastVisit: '2026-05-15',
            glucoseReadings: generateReadings(todayStr, 30, { fasting: 95 }, 10, 'good'),
            medicationLog: [], mealLog: [], activityLog: []
        },
        {
            id: 'P004',
            name: 'Sunita Reddy',
            age: 58, gender: 'Female', city: 'Hyderabad',
            diagnosisDate: '2018-01-22', diabetesType: 'Type 2',
            hba1c: 8.5,
            medications: [
                { name: 'Glycomet-GP', dose: '2mg', frequency: 'BD', timing: 'before-meals', adherence: 0.70 }
            ],
            weight: 76, height: 155, bmi: 31.6,
            bp: { systolic: 135, diastolic: 88 },
            comorbidities: ['Obesity'],
            riskLevel: 'high',
            lastVisit: '2026-03-20',
            glucoseReadings: generateReadings(todayStr, 30, { fasting: 155 }, 25, 'poor'),
            medicationLog: [], mealLog: [], activityLog: []
        },
        {
            id: 'P005',
            name: 'Karthik Iyer',
            age: 48, gender: 'Male', city: 'Chennai',
            diagnosisDate: '2024-02-14', diabetesType: 'Type 2',
            hba1c: 7.1,
            medications: [
                { name: 'Dapagliflozin', dose: '10mg', frequency: 'OD', timing: 'morning', adherence: 0.95 }
            ],
            weight: 82, height: 172, bmi: 27.7,
            bp: { systolic: 125, diastolic: 80 },
            comorbidities: [],
            riskLevel: 'moderate',
            lastVisit: '2026-05-10',
            glucoseReadings: generateReadings(todayStr, 30, { fasting: 110 }, 15, 'moderate'),
            medicationLog: [], mealLog: [], activityLog: []
        }
    ];

    // Add a critical hypo reading for P001 manually to trigger alerts
    window.GlucoConnect.patients[0].glucoseReadings.push({
        date: todayStr, time: '03:00', type: 'random', value: 45, note: 'Woke up sweating'
    });

})();
