(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};
    window.GlucoConnect.rules = window.GlucoConnect.rules || {};

    window.GlucoConnect.rules.glucose = {
        calculateTIR: function(readings) {
            if (!readings || readings.length === 0) return { inRange: 0, aboveRange: 0, belowRange: 0, veryHigh: 0, veryLow: 0, avgGlucose: 0 };
            
            let veryLow = 0, low = 0, inRange = 0, high = 0, veryHigh = 0;
            let sum = 0;
            
            readings.forEach(r => {
                sum += r.value;
                if (r.value < 54) veryLow++;
                else if (r.value < 70) low++;
                else if (r.value <= 180) inRange++;
                else if (r.value <= 250) high++;
                else veryHigh++;
            });
            
            const total = readings.length;
            const avg = Math.round(sum / total);
            
            // Calculate StdDev and CV
            const squareDiffs = readings.map(r => Math.pow(r.value - avg, 2));
            const variance = squareDiffs.reduce((a,b) => a+b, 0) / total;
            const stdDev = Math.round(Math.sqrt(variance));
            const cv = Math.round((stdDev / avg) * 100);
            
            // Estimated GMI (HbA1c)
            const gmi = (3.31 + (0.02392 * avg)).toFixed(1);

            return {
                veryLow: Math.round((veryLow / total) * 100),
                belowRange: Math.round(((veryLow + low) / total) * 100),
                inRange: Math.round((inRange / total) * 100),
                aboveRange: Math.round(((high + veryHigh) / total) * 100),
                veryHigh: Math.round((veryHigh / total) * 100),
                avgGlucose: avg,
                stdDev: stdDev,
                cv: cv,
                gmi: gmi
            };
        },

        getTrend: function(readings) {
            if (!readings || readings.length < 2) return { arrow: '→', direction: 'stable' };
            const recent = readings.slice(-2);
            const diff = recent[1].value - recent[0].value;
            
            if (diff > 40) return { arrow: '↑↑', direction: 'rising_fast' };
            if (diff > 15) return { arrow: '↗', direction: 'rising' };
            if (diff < -40) return { arrow: '↓↓', direction: 'falling_fast' };
            if (diff < -15) return { arrow: '↘', direction: 'falling' };
            return { arrow: '→', direction: 'stable' };
        },

        detectPatterns: function(readings, days = 7) {
            if (!readings || readings.length === 0) return [];
            const patterns = [];
            
            // Check for persistent highs
            const highs = readings.filter(r => r.value > 180);
            if (highs.length > 5) {
                patterns.push({
                    pattern: 'persistent_highs',
                    severity: 'alert',
                    message: 'Persistent Hyperglycemia',
                    recommendation: `Patient had ${highs.length} readings above 180 mg/dL in the last ${days} days. Review medication.`
                });
            }

            // Check for nocturnal hypos
            const nocturnalHypos = readings.filter(r => {
                const hour = parseInt(r.time.split(':')[0]);
                return hour >= 0 && hour <= 6 && r.value < 70;
            });
            if (nocturnalHypos.length >= 1) {
                patterns.push({
                    pattern: 'nocturnal_hypos',
                    severity: 'urgent',
                    message: 'Nocturnal Hypoglycemia Detected',
                    recommendation: 'Risk of dangerous overnight lows. Consider adjusting evening basal insulin or adding a bedtime snack.'
                });
            }

            return patterns;
        }
    };
})();
