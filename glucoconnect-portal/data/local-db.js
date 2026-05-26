(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};

    const DB_KEY = 'glucoconnect_database_v1';

    const defaultDatabase = {
        users: [
            {
                id: 'ADMIN001',
                email: 'admin@glucoconnect.com',
                password: 'admin123',
                name: 'System Administrator',
                role: 'admin',
                avatar: 'SA'
            },
            {
                id: 'DOC001',
                email: 'drsharma@gmail.com',
                password: 'password123',
                name: 'Dr. Ananya Sharma',
                specialty: 'Endocrinologist',
                role: 'doctor',
                avatar: 'AS'
            },
            {
                id: 'DOC002',
                email: 'drpatel@gmail.com',
                password: 'password123',
                name: 'Dr. Vikram Patel',
                specialty: 'Diabetologist',
                role: 'doctor',
                avatar: 'VP'
            }
        ]
    };

    // Initialize Database
    let db = null;
    try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            db = JSON.parse(stored);
        } else {
            db = defaultDatabase;
            saveDb();
        }
    } catch (e) {
        console.error("Local DB initialization failed", e);
        db = defaultDatabase;
    }

    function saveDb() {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    // Export DB API
    window.GlucoConnect.db = {
        // Auth
        login: function(email, password) {
            const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
            return user || null;
        },
        
        // Users
        getUsers: function() {
            return db.users;
        },
        getDoctors: function() {
            return db.users.filter(u => u.role === 'doctor');
        },
        addUser: function(userObj) {
            const newUser = {
                id: 'USR' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                email: userObj.email,
                password: userObj.password,
                name: userObj.name,
                role: userObj.role || 'doctor',
                specialty: userObj.specialty || '',
                avatar: userObj.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
            };
            
            // Check if email exists
            if (db.users.find(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
                throw new Error("Email already registered in the system.");
            }

            db.users.push(newUser);
            saveDb();
            return newUser;
        },
        deleteUser: function(id) {
            if (id.startsWith('ADMIN')) throw new Error("Cannot delete the master admin account.");
            db.users = db.users.filter(u => u.id !== id);
            saveDb();
        }
    };
})();
