(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};

    window.GlucoConnect.foodDatabase = [
        {
            id: 'F001', name: 'Chana Dal', category: 'dal',
            gi: 18, giClass: 'low', gl: 3,
            carbsPer100g: 47, fiberPer100g: 12, proteinPer100g: 20,
            typicalServingG: 30, carbsPerServing: 14,
            region: ['all'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: true,
            notes: 'Exceptionally low GI. Excellent for diabetics due to high fiber and protein.',
            alternatives: ['Moong Dal', 'Masoor Dal'],
            pairingTips: 'Pair with mixed vegetable salad to further lower overall glycemic response.'
        },
        {
            id: 'F002', name: 'Moong Dal', category: 'dal',
            gi: 38, giClass: 'low', gl: 5,
            carbsPer100g: 42, fiberPer100g: 10, proteinPer100g: 22,
            typicalServingG: 30, carbsPerServing: 12,
            region: ['all'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: true,
            notes: 'Easy to digest and good for all meals.',
            alternatives: ['Chana Dal'],
            pairingTips: 'Often used in khichdi which keeps GI moderate.'
        },
        {
            id: 'F003', name: 'White Basmati Rice', category: 'rice',
            gi: 55, giClass: 'medium', gl: 15,
            carbsPer100g: 78, fiberPer100g: 1.5, proteinPer100g: 8,
            typicalServingG: 150, carbsPerServing: 40,
            region: ['all'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: false,
            notes: 'Lower GI than regular white rice, but portion control is critical.',
            alternatives: ['Brown Rice', 'Quinoa'],
            pairingTips: 'Always pair with a large portion of dal and vegetables.'
        },
        {
            id: 'F004', name: 'Brown Rice', category: 'rice',
            gi: 50, giClass: 'low', gl: 12,
            carbsPer100g: 73, fiberPer100g: 3.5, proteinPer100g: 7,
            typicalServingG: 150, carbsPerServing: 35,
            region: ['all'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: true,
            notes: 'Higher fiber than white rice, better choice for blood sugar control.',
            alternatives: ['Cauliflower Rice', 'Millet'],
            pairingTips: 'Mix with vegetables to increase fiber.'
        },
        {
            id: 'F005', name: 'Regular White Rice (Sona Masoori)', category: 'rice',
            gi: 78, giClass: 'high', gl: 25,
            carbsPer100g: 80, fiberPer100g: 1, proteinPer100g: 7,
            typicalServingG: 150, carbsPerServing: 42,
            region: ['south'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: false,
            notes: 'Causes rapid glucose spikes. Cooling and reheating can slightly lower GI.',
            alternatives: ['Brown Rice', 'Basmati Rice'],
            pairingTips: 'Strict portion control required.'
        },
        {
            id: 'F006', name: 'Wheat Roti (Chapati)', category: 'roti',
            gi: 62, giClass: 'medium', gl: 14,
            carbsPer100g: 65, fiberPer100g: 10, proteinPer100g: 12,
            typicalServingG: 40, carbsPerServing: 15,
            region: ['all'], mealType: ['breakfast', 'lunch', 'dinner'],
            diabeticFriendly: true,
            notes: 'Ensure whole wheat atta is used. Avoid maida (refined flour).',
            alternatives: ['Multigrain Roti', 'Bajra Roti'],
            pairingTips: 'Eat with protein-rich dal or paneer.'
        },
        {
            id: 'F007', name: 'Multigrain Roti', category: 'roti',
            gi: 52, giClass: 'low', gl: 10,
            carbsPer100g: 60, fiberPer100g: 15, proteinPer100g: 14,
            typicalServingG: 40, carbsPerServing: 13,
            region: ['all'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: true,
            notes: 'Mixed grain flours (wheat, bajra, ragi, oats) lower the glycemic impact.',
            alternatives: ['Wheat Roti'],
            pairingTips: 'Ideal substitute for standard chapati.'
        },
        {
            id: 'F008', name: 'Bitter Gourd (Karela)', category: 'vegetable',
            gi: 15, giClass: 'low', gl: 1,
            carbsPer100g: 4, fiberPer100g: 2.5, proteinPer100g: 1,
            typicalServingG: 100, carbsPerServing: 4,
            region: ['all'], mealType: ['lunch', 'dinner'],
            diabeticFriendly: true,
            notes: 'Contains compounds with insulin-like effects. Highly recommended.',
            alternatives: ['Okra', 'Spinach'],
            pairingTips: 'Cook with minimal oil to retain health benefits.'
        },
        {
            id: 'F009', name: 'Guava', category: 'fruit',
            gi: 20, giClass: 'low', gl: 2,
            carbsPer100g: 14, fiberPer100g: 5.4, proteinPer100g: 2.6,
            typicalServingG: 100, carbsPerServing: 14,
            region: ['all'], mealType: ['snack'],
            diabeticFriendly: true,
            notes: 'One of the best fruits for diabetics. High fiber and Vitamin C.',
            alternatives: ['Apple', 'Papaya'],
            pairingTips: 'Eat as a mid-morning or mid-evening snack.'
        },
        {
            id: 'F010', name: 'Jalebi', category: 'sweet',
            gi: 95, giClass: 'high', gl: 45,
            carbsPer100g: 70, fiberPer100g: 0, proteinPer100g: 2,
            typicalServingG: 50, carbsPerServing: 35,
            region: ['all'], mealType: ['snack'],
            diabeticFriendly: false,
            notes: 'Pure sugar and refined flour. Causes extreme glucose spike. Avoid completely.',
            alternatives: ['Fresh Fruit'],
            pairingTips: 'Avoid.'
        },
        {
            id: 'F011', name: 'Poha', category: 'dish',
            gi: 60, giClass: 'medium', gl: 20,
            carbsPer100g: 40, fiberPer100g: 2, proteinPer100g: 5,
            typicalServingG: 150, carbsPerServing: 45,
            region: ['west', 'central'], mealType: ['breakfast'],
            diabeticFriendly: true,
            notes: 'Lower GI than white rice. Adding peanuts and vegetables reduces overall GI.',
            alternatives: ['Upma', 'Oats'],
            pairingTips: 'Add plenty of peas, onions, and peanuts for better protein/fiber ratio.'
        },
        {
            id: 'F012', name: 'Idli', category: 'rice',
            gi: 75, giClass: 'high', gl: 18,
            carbsPer100g: 30, fiberPer100g: 1.5, proteinPer100g: 4,
            typicalServingG: 100, carbsPerServing: 20,
            region: ['south'], mealType: ['breakfast'],
            diabeticFriendly: false,
            notes: 'Despite fermentation, the white rice content causes significant spikes.',
            alternatives: ['Ragi Idli', 'Oats Idli'],
            pairingTips: 'Pair with lots of sambar and coconut chutney.'
        }
    ];
})();
