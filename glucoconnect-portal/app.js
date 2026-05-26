/* ============================================================
   GlucoConnect Doctor Portal — Main Application Controller
   Routes, Views, State Management, Event Handling
   ============================================================ */

(function () {
    'use strict';

    // ── Namespace ────────────────────────────────────────────
    window.GlucoConnect = window.GlucoConnect || {};
    const GC = window.GlucoConnect;

    // ── App State ────────────────────────────────────────────
    const state = {
        currentView: 'dashboard',
        selectedPatient: null,
        searchQuery: '',
        patientFilter: 'all',
        alertFilter: 'all',
        chartInstances: {},
        allAlerts: [],
        activeDoctor: null
    };

    // ── Utility Helpers ──────────────────────────────────────
    function $(selector) { return document.querySelector(selector); }
    function $$(selector) { return document.querySelectorAll(selector); }

    function getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    function formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    function formatShortDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }

    function timeAgo(dateStr) {
        const now = new Date();
        const d = new Date(dateStr);
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        return `${diffDays}d ago`;
    }

    function getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    function getGlucoseClass(value) {
        if (value < 54) return 'critical';
        if (value < 70) return 'below-range';
        if (value <= 180) return 'in-range';
        if (value <= 250) return 'above-range';
        return 'high';
    }

    function getGlucoseColor(value) {
        if (value < 54) return '#ff1744';
        if (value < 70) return '#00d4ff';
        if (value <= 180) return '#00e676';
        if (value <= 250) return '#ffb800';
        return '#ff4757';
    }

    function getSeverityIcon(severity) {
        const icons = {
            emergency: '🚨', urgent: '⚠️', alert: '🔔',
            warning: '⚡', caution: '📊', info: 'ℹ️'
        };
        return icons[severity] || 'ℹ️';
    }

    function getLatestReading(patient) {
        if (!patient.glucoseReadings || patient.glucoseReadings.length === 0) return null;
        const sorted = [...patient.glucoseReadings].sort((a, b) => {
            const da = new Date(a.date + 'T' + a.time);
            const db = new Date(b.date + 'T' + b.time);
            return db - da;
        });
        return sorted[0];
    }

    function getReadingsForDays(patient, days) {
        if (!patient.glucoseReadings) return [];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return patient.glucoseReadings.filter(r => new Date(r.date) >= cutoff);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Initialize ───────────────────────────────────────────
    function init() {
        setupAuth();

        
        if (GC.firebase && GC.firebase.auth) {
            GC.firebase.auth.onAuthStateChanged(user => {
                if (user) {
                    GC.firebase.db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists) {
                            state.activeDoctor = doc.data();
                            
                            // FORCE ADMIN UPGRADE
                            if(state.activeDoctor.email && state.activeDoctor.email.toLowerCase() === 'pranshujmodi2007@gmail.com' && state.activeDoctor.role !== 'admin') {
                                state.activeDoctor.role = 'admin';
                                GC.firebase.db.collection('users').doc(user.uid).update({ role: 'admin' });
                            }
                        } else {
                            state.activeDoctor = { id: user.uid, email: user.email, name: user.displayName || 'Unknown User', role: user.email.toLowerCase() === 'pranshujmodi2007@gmail.com' ? 'admin' : 'doctor', avatar: '?' };
                        }
                        
                        GC.firebase.db.collection('patients').where('doctorId', '==', user.uid).get().then(snap => {
                            state.patients = snap.docs.map(d => d.data());
                            initializeApp();
                        }).catch(err => {
                            console.error('Failed to load patients', err);
                            state.patients = [];
                            initializeApp();
                        });
                        
                    }).catch(err => {
                        console.error('Failed to load user', err);
                        showLogin();
                    });
                } else {
                    showLogin();
                }
            });
        } else {
            showLogin();
        }

        // Hide loading screen
        setTimeout(() => {
            $('#loading-screen').classList.add('hidden');
        }, 1500);
    }

    function showLogin() {
        $('#app').style.display = 'none';
        $('#login-screen').style.display = 'flex';
        $('#login-error').style.display = 'none';
    }

    function initializeApp() {
        $('#login-screen').style.display = 'none';
        $('#app').style.display = 'flex';

        // Set doctor UI
        $('#doctor-name').textContent = state.activeDoctor.name;
        $('#doctor-avatar').textContent = state.activeDoctor.avatar || getInitials(state.activeDoctor.name);
        if ($('#doctor-role')) $('#doctor-role').textContent = state.activeDoctor.specialty || state.activeDoctor.role;

        // Show admin link if admin
        const adminNav = $('#nav-admin');
        if (adminNav) {
            adminNav.style.display = state.activeDoctor.role === 'admin' ? 'block' : 'none';
        }

        // Set date
        $('#topbar-date').textContent = formatDate(new Date());

        // Generate all alerts
        if (GC.rules && GC.rules.alerts && (state.patients || [])) {
            state.allAlerts = GC.rules.alerts.generateAllAlerts((state.patients || []));
        }

        updateBadges();
        setupRouting();
        setupSearch();
        setupSidebarToggle();

        navigateTo(window.location.hash.slice(1) || 'dashboard');
    }

    // ── Auth Logic ───────────────────────────────────────────
    function setupAuth() {
        const loginForm = $('#login-form');
        const signupForm = $('#signup-form');
        const showSignupBtn = $('#show-signup');
        const showLoginBtn = $('#show-login');
        const authSubtitle = $('#auth-subtitle');

        if (showSignupBtn) {
            showSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
                authSubtitle.textContent = 'Create a new account';
            });
        }

        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
                authSubtitle.textContent = 'Sign in to your account';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = $('#login-email').value;
                const password = $('#login-password').value;
                const errEl = $('#login-error');
                
                if (GC.firebase && GC.firebase.auth) {
                    GC.firebase.auth.signInWithEmailAndPassword(email, password)
                        .catch(err => {
                            errEl.textContent = err.message;
                            errEl.style.display = 'block';
                        });
                }
            });
        }

        const googleLoginBtn = $('#btn-google-login');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => {
                if (GC.firebase && GC.firebase.auth) {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    GC.firebase.auth.signInWithPopup(provider)
                        .then(result => {
                            const user = result.user;
                            const role = user.email.toLowerCase() === 'pranshujmodi2007@gmail.com' ? 'admin' : 'doctor';
                            
                            // Check if they exist in Firestore, if not, create them
                            return GC.firebase.db.collection('users').doc(user.uid).get().then(doc => {
                                if (!doc.exists) {
                                    return GC.firebase.db.collection('users').doc(user.uid).set({
                                        id: user.uid,
                                        email: user.email,
                                        name: user.displayName || 'Unknown',
                                        specialty: role === 'admin' ? '' : 'Doctor',
                                        role: role,
                                        avatar: (user.displayName || '?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()
                                    });
                                }
                            });
                        })
                        .catch(err => {
                            const errEl = $('#login-error');
                            if(errEl) {
                                errEl.textContent = err.message;
                                errEl.style.display = 'block';
                            }
                        });
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = $('#signup-name').value;
                const email = $('#signup-email').value;
                const password = $('#signup-password').value;
                const errEl = $('#signup-error');
                
                if (GC.firebase && GC.firebase.auth) {
                    GC.firebase.auth.createUserWithEmailAndPassword(email, password)
                        .then(cred => {
                            const role = email.toLowerCase() === 'pranshujmodi2007@gmail.com' ? 'admin' : 'doctor';
                            return GC.firebase.db.collection('users').doc(cred.user.uid).set({
                                id: cred.user.uid,
                                email: email,
                                name: name,
                                specialty: role === 'admin' ? '' : 'Doctor',
                                role: role,
                                avatar: name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()
                            });
                        })
                        .catch(err => {
                            errEl.textContent = err.message;
                            errEl.style.display = 'block';
                        });
                }
            });
        }

        const logoutBtn = $('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (GC.firebase && GC.firebase.auth) {
                    GC.firebase.auth.signOut().then(() => {
                        state.activeDoctor = null;
                        showLogin();
                        window.location.hash = '';
                    });
                }
            });
        }
    }

    GC.app = GC.app || {};
    GC.app.loginAs = function(doctorId) {
        const doctors = GC.doctorsDatabase || [];
        const doctor = doctors.find(d => d.id === doctorId);
        if (doctor) {
            const sessionData = { id: doctor.id, username: doctor.username, name: doctor.name, specialty: doctor.specialty, avatar: doctor.avatar };
            localStorage.setItem('glucoConnectSession', JSON.stringify(sessionData));
            state.activeDoctor = sessionData;
            initializeApp();
        }
    };

    function updateBadges() {
        const patients = (state.patients || []) || [];
        $('#patient-count-badge').textContent = patients.length;

        const urgentAlerts = state.allAlerts.filter(a =>
            ['emergency', 'urgent', 'alert'].includes(a.severity)
        );
        const alertBadge = $('#alert-count-badge');
        alertBadge.textContent = urgentAlerts.length;
        if (urgentAlerts.length > 0) {
            alertBadge.classList.add('alert-badge');
            $('#notification-dot').classList.add('active');
        }
    }

    // ── Routing ──────────────────────────────────────────────
    function setupRouting() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            const parts = hash.split('/');
            if (parts[0] === 'patient' && parts[1]) {
                showPatientDetail(parts[1]);
            } else {
                navigateTo(parts[0] || 'dashboard');
            }
        });
    }

    function navigateTo(view) {
        state.currentView = view;
        state.selectedPatient = null;

        // Update nav active state
        $$('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Update topbar title
        const titles = {
            dashboard: 'Dashboard',
            patients: 'Patients',
            alerts: 'Alerts Center',
            analytics: 'Analytics',
            'food-db': 'Food Database',
            admin: 'System Admin Panel'
        };
        $('#topbar-title h1').textContent = titles[view] || 'Dashboard';

        // Destroy existing chart instances
        destroyCharts();

        // Render view
        const container = $('#view-container');
        switch (view) {
            case 'dashboard': renderDashboard(container); break;
            case 'patients': renderPatients(container); break;
            case 'alerts': renderAlerts(container); break;
            case 'analytics': renderAnalytics(container); break;
            case 'food-db': renderFoodDatabase(container); break;
            case 'admin': renderAdminPanel(container); break;
            default: renderDashboard(container);
        }
    }

    function showPatientDetail(patientId) {
        const patient = ((state.patients || []) || []).find(p => p.id === patientId);
        if (!patient) return navigateTo('patients');

        state.selectedPatient = patient;
        state.currentView = 'patient-detail';

        // Update topbar
        $('#topbar-title h1').textContent = patient.name;

        destroyCharts();
        renderPatientDetail($('#view-container'), patient);
    }

    function destroyCharts() {
        Object.values(state.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') chart.destroy();
        });
        state.chartInstances = {};
    }

    // ── Search ───────────────────────────────────────────────
    function setupSearch() {
        const input = $('#global-search');
        input.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            if (state.currentView === 'patients') {
                renderPatients($('#view-container'));
            } else if (state.currentView === 'dashboard') {
                renderDashboard($('#view-container'));
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && state.searchQuery) {
                window.location.hash = '#patients';
            }
        });
    }

    // ── Sidebar Toggle ───────────────────────────────────────
    function setupSidebarToggle() {
        const btn = $('#sidebar-toggle');
        const sidebar = $('#sidebar');

        btn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close on nav click (mobile)
        $$('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        });
    }

    // ════════════════════════════════════════════════════════
    //  DASHBOARD VIEW
    // ════════════════════════════════════════════════════════
    function renderDashboard(container) {
        const patients = (state.patients || []) || [];
        const rules = GC.rules || {};

        // Calculate stats
        const totalPatients = patients.length;
        const criticalPatients = patients.filter(p => p.riskLevel === 'critical').length;
        const highRiskPatients = patients.filter(p => p.riskLevel === 'high').length;
        const alertCount = state.allAlerts.filter(a => ['emergency', 'urgent', 'alert'].includes(a.severity)).length;

        // Average glucose
        let allLatestReadings = patients.map(p => getLatestReading(p)).filter(r => r);
        const avgGlucose = allLatestReadings.length > 0
            ? Math.round(allLatestReadings.reduce((sum, r) => sum + r.value, 0) / allLatestReadings.length)
            : 0;

        // In-range count
        const inRangeCount = allLatestReadings.filter(r => r.value >= 70 && r.value <= 180).length;
        const inRangePercent = allLatestReadings.length > 0
            ? Math.round((inRangeCount / allLatestReadings.length) * 100)
            : 0;

        // Priority patients (sorted by risk)
        const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
        const sortedPatients = [...patients].sort((a, b) => {
            return (riskOrder[a.riskLevel] || 3) - (riskOrder[b.riskLevel] || 3);
        });

        const filteredPatients = state.searchQuery
            ? sortedPatients.filter(p => p.name.toLowerCase().includes(state.searchQuery))
            : sortedPatients;

        // Top alerts
        const topAlerts = state.allAlerts.slice(0, 10);

        container.innerHTML = `
            <div class="animate-fadeIn">
                <!-- Greeting -->
                <div class="dashboard-greeting">
                    <h2 class="greeting-text">${getGreeting()}, <span>${state.activeDoctor ? state.activeDoctor.name : 'Doctor'}</span></h2>
                    <p class="greeting-subtitle">You have <strong class="text-red">${alertCount} active alerts</strong> and <strong class="text-amber">${criticalPatients + highRiskPatients} patients</strong> needing attention today.</p>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card cyan stagger-item">
                        <div class="stat-icon cyan">👥</div>
                        <div class="stat-value cyan">${totalPatients}</div>
                        <div class="stat-label">Total Patients</div>
                    </div>
                    <div class="stat-card ${avgGlucose > 180 ? 'amber' : 'green'} stagger-item">
                        <div class="stat-icon ${avgGlucose > 180 ? 'amber' : 'green'}">📊</div>
                        <div class="stat-value ${avgGlucose > 180 ? 'amber' : 'green'}">${avgGlucose}</div>
                        <div class="stat-label">Avg Glucose (mg/dL)</div>
                    </div>
                    <div class="stat-card red stagger-item">
                        <div class="stat-icon red">🚨</div>
                        <div class="stat-value red">${alertCount}</div>
                        <div class="stat-label">Active Alerts</div>
                    </div>
                    <div class="stat-card green stagger-item">
                        <div class="stat-icon green">✓</div>
                        <div class="stat-value green">${inRangePercent}%</div>
                        <div class="stat-label">Patients In Range</div>
                    </div>
                </div>

                <!-- Dashboard Grid -->
                <div class="dashboard-grid">
                    <!-- Priority Patient Queue -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                Priority Review Queue
                                <span class="count">${filteredPatients.length}</span>
                            </div>
                            <div class="section-actions">
                                <button class="section-btn active" onclick="GlucoConnect.app.filterDashboardPatients('all')">All</button>
                                <button class="section-btn" onclick="GlucoConnect.app.filterDashboardPatients('critical')">Critical</button>
                                <button class="section-btn" onclick="GlucoConnect.app.filterDashboardPatients('high')">High</button>
                            </div>
                        </div>
                        <div class="section-body">
                            <div class="patient-queue" id="dashboard-patient-queue">
                                ${filteredPatients.slice(0, 12).map((p, i) => renderPatientCard(p, i)).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Alerts Feed -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                Recent Alerts
                                <span class="count">${topAlerts.length}</span>
                            </div>
                            <div class="section-actions">
                                <button class="section-btn" onclick="window.location.hash='#alerts'">View All →</button>
                            </div>
                        </div>
                        <div class="section-body">
                            <div class="alert-feed" id="dashboard-alert-feed">
                                ${topAlerts.length > 0
                ? topAlerts.map((a, i) => renderAlertItem(a, i)).join('')
                : '<div class="empty-state"><div class="empty-icon">✓</div><p class="empty-state-text">No active alerts</p></div>'
            }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render sparklines for patient cards
        setTimeout(() => {
            filteredPatients.slice(0, 12).forEach(p => {
                const sparklineEl = document.getElementById(`sparkline-${p.id}`);
                if (sparklineEl && GC.charts && GC.charts.Sparkline) {
                    const readings = getReadingsForDays(p, 7).map(r => r.value);
                    if (readings.length > 2) {
                        const sparkline = new GC.charts.Sparkline(sparklineEl, readings, {
                            width: 100, height: 32, animate: true
                        });
                        sparkline.render();
                        state.chartInstances[`sparkline-${p.id}`] = sparkline;
                    }
                }
            });
        }, 100);
    }

    function renderPatientCard(patient, index) {
        const latest = getLatestReading(patient);
        const latestValue = latest ? latest.value : '--';
        const glucoseClass = latest ? getGlucoseClass(latest.value) : '';

        let trend = '';
        if (GC.rules && GC.rules.glucose) {
            const readings = getReadingsForDays(patient, 1);
            if (readings.length >= 2) {
                const trendData = GC.rules.glucose.getTrend(readings);
                trend = trendData.arrow || '';
            }
        }

        return `
            <div class="patient-card stagger-item" onclick="window.location.hash='#patient/${patient.id}'" style="animation-delay:${index * 60}ms">
                <div class="patient-avatar risk-${patient.riskLevel}">${getInitials(patient.name)}</div>
                <div class="patient-info">
                    <div class="patient-name">${escapeHtml(patient.name)}</div>
                    <div class="patient-meta">
                        <span>${patient.age}y, ${patient.gender}</span>
                        <span>•</span>
                        <span>HbA1c: ${patient.hba1c}%</span>
                    </div>
                </div>
                <div class="patient-sparkline" id="sparkline-${patient.id}"></div>
                <div class="patient-glucose glucose-value ${glucoseClass}">
                    ${latestValue !== '--' ? latestValue : '--'}
                    <span style="font-size:0.8em">${trend}</span>
                </div>
                <div class="patient-status">
                    <span class="badge badge-risk-${patient.riskLevel}">${patient.riskLevel}</span>
                </div>
            </div>
        `;
    }

    function renderAlertItem(alert, index) {
        return `
            <div class="alert-item severity-${alert.severity} stagger-item" style="animation-delay:${index * 60}ms"
                 onclick="window.location.hash='#patient/${alert.patientId}'">
                <div class="alert-severity-icon ${alert.severity}">
                    ${getSeverityIcon(alert.severity)}
                </div>
                <div class="alert-content">
                    <div class="alert-title">${escapeHtml(alert.title)}</div>
                    <div class="alert-message">${escapeHtml(alert.message)}</div>
                    <div class="alert-time">${alert.patientName} • ${timeAgo(alert.timestamp)}</div>
                </div>
            </div>
        `;
    }

    // ════════════════════════════════════════════════════════
    //  PATIENTS VIEW
    // ════════════════════════════════════════════════════════
    function renderPatients(container) {
        const patients = (state.patients || []);
        const filtered = filterPatients(patients);

        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="patients-header">
                    <div class="patients-filters">
                        ${['all', 'critical', 'high', 'moderate', 'low'].map(f =>
            `<button class="filter-btn ${state.patientFilter === f ? 'active' : ''}" onclick="GlucoConnect.app.setFilter('${f}')">${capitalize(f)}</button>`
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
                            ${filtered.map((p, i) => `
                                <tr class="stagger-item" style="animation-delay:${i * 30}ms">
                                    <td>
                                        <div style="display:flex;align-items:center;gap:12px">
                                            <div class="patient-avatar">${getInitials(p.name)}</div>
                                            <div>
                                                <div class="fw-600">${escapeHtml(p.name)}</div>
                                                <div class="text-secondary text-sm">ID: ${p.id} • Age ${p.age}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="status-badge status-${p.riskLevel}">${capitalize(p.riskLevel)}</span>
                                    </td>
                                    <td class="fw-500">${p.hba1c}%</td>
                                    <td>
                                        <div class="sparkline-container" id="spark-${p.id}"></div>
                                    </td>
                                    <td class="text-secondary">${formatDate(p.nextVisit)}</td>
                                    <td>
                                        <button class="section-btn" onclick="GlucoConnect.app.viewPatient('${p.id}')">View Detail</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    ${patients.length === 0 ? `
                        <div class="empty-state">
                            <div style="font-size:3rem;margin-bottom:10px">👥</div>
                            <h3>No Patients Found</h3>
                            <p class="text-secondary">You don't have any patients in your list yet.</p>
                            <button class="btn btn-primary mt-3" id="btn-seed-patients">Initialize Sample Patients</button>
                        </div>` : ''}
                    
                    ${patients.length > 0 && filtered.length === 0 ? `<div class="empty-state"><p class="text-secondary">No patients match the selected filter.</p></div>` : ''}
                </div>
            </div>
        `;

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
    
    // ════════════════════════════════════════════════════════
    //  PATIENT DETAIL VIEW
    // ════════════════════════════════════════════════════════
    function renderPatientDetail(container, patient) {
        const rules = GC.rules || {};
        const latest = getLatestReading(patient);
        const readings7d = getReadingsForDays(patient, 7);
        const readings30d = getReadingsForDays(patient, 30);

        // TIR calculation
        let tir = { inRange: 0, aboveRange: 0, belowRange: 0, veryHigh: 0, veryLow: 0, avgGlucose: 0, gmi: 0, cv: 0, stdDev: 0 };
        if (rules.glucose && readings30d.length > 0) {
            tir = rules.glucose.calculateTIR(readings30d);
        }

        // Patterns
        let patterns = [];
        if (rules.glucose && readings7d.length > 0) {
            patterns = rules.glucose.detectPatterns(readings7d, 7);
        }

        // Patient alerts
        let patientAlerts = state.allAlerts.filter(a => a.patientId === patient.id);

        // Medication adherence
        let adherenceData = null;
        if (rules.medication && patient.medicationLog) {
            adherenceData = rules.medication.checkAdherence(patient.medicationLog, 7);
        }

        // Latest readings for daily view
        const todayReadings = patient.glucoseReadings
            ? patient.glucoseReadings.filter(r => {
                const d = new Date(r.date);
                const today = new Date();
                return d.toDateString() === today.toDateString() ||
                    d >= new Date(today.getTime() - 86400000);
            }).sort((a, b) => {
                return (a.date + a.time).localeCompare(b.date + b.time);
            })
            : [];

        container.innerHTML = `
            <div class="patient-detail animate-fadeIn">
                <!-- Back Button -->
                <button class="back-btn" onclick="window.location.hash='#patients'">
                    ← Back to Patients
                </button>

                <!-- Patient Header -->
                <div class="patient-detail-header">
                    <div class="patient-detail-info">
                        <div class="patient-detail-avatar risk-${patient.riskLevel}" style="background:linear-gradient(135deg, ${getGlucoseColor(latest ? latest.value : 120)}, ${patient.riskLevel === 'critical' ? '#d50000' : patient.riskLevel === 'high' ? '#ff6d00' : '#00c853'})">
                            ${getInitials(patient.name)}
                        </div>
                        <div class="patient-detail-text">
                            <h2>${escapeHtml(patient.name)} <span class="badge badge-risk-${patient.riskLevel}" style="font-size:0.6rem;vertical-align:middle">${patient.riskLevel}</span></h2>
                            <div class="patient-detail-meta">
                                <span class="meta-item">📍 ${patient.city}</span>
                                <span class="meta-item">🎂 ${patient.age} years, ${patient.gender}</span>
                                <span class="meta-item">📅 Diagnosed ${formatShortDate(patient.diagnosisDate)}</span>
                                <span class="meta-item">⚖️ BMI ${patient.bmi}</span>
                                ${patient.comorbidities && patient.comorbidities.length > 0
                ? `<span class="meta-item">🩺 ${patient.comorbidities.join(', ')}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="patient-detail-stats">
                        <div class="detail-stat">
                            <div class="detail-stat-value" style="color:${patient.hba1c < 7 ? 'var(--accent-green)' : patient.hba1c < 8 ? 'var(--accent-amber)' : 'var(--accent-red)'}">${patient.hba1c}%</div>
                            <div class="detail-stat-label">HbA1c</div>
                        </div>
                        <div class="detail-stat">
                            <div class="detail-stat-value" style="color:${getGlucoseColor(tir.avgGlucose)}">${tir.avgGlucose || '--'}</div>
                            <div class="detail-stat-label">Avg Glucose</div>
                        </div>
                        <div class="detail-stat">
                            <div class="detail-stat-value" style="color:${tir.inRange >= 70 ? 'var(--accent-green)' : tir.inRange >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'}">${tir.inRange || 0}%</div>
                            <div class="detail-stat-label">Time in Range</div>
                        </div>
                        <div class="detail-stat">
                            <div class="detail-stat-value text-purple">${tir.gmi || '--'}%</div>
                            <div class="detail-stat-label">GMI</div>
                        </div>
                    </div>
                </div>

                <!-- Glucose Chart (Full Width) -->
                <div class="section-card full-width mb-lg">
                    <div class="section-header">
                        <div class="section-title">Glucose Timeline</div>
                        <div class="period-selector" id="glucose-period-selector">
                            <button class="period-btn" data-days="7" onclick="GlucoConnect.app.setGlucosePeriod(7, this)">7D</button>
                            <button class="period-btn active" data-days="14" onclick="GlucoConnect.app.setGlucosePeriod(14, this)">14D</button>
                            <button class="period-btn" data-days="30" onclick="GlucoConnect.app.setGlucosePeriod(30, this)">30D</button>
                        </div>
                    </div>
                    <div class="section-body">
                        <div class="chart-container" id="glucose-chart-container" style="height:350px"></div>
                    </div>
                </div>

                <!-- Detail Grid -->
                <div class="patient-detail-grid">
                    <!-- TIR -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">Time in Range (30d)</div>
                        </div>
                        <div class="section-body">
                            <div class="tir-display">
                                <div class="tir-bar">
                                    ${tir.veryLow > 0 ? `<div class="tir-segment very-low" style="width:${tir.veryLow}%">${tir.veryLow > 5 ? tir.veryLow + '%' : ''}</div>` : ''}
                                    ${tir.belowRange > 0 ? `<div class="tir-segment low" style="width:${Math.max(tir.belowRange - tir.veryLow, 0)}%">${tir.belowRange > 5 ? (tir.belowRange - tir.veryLow) + '%' : ''}</div>` : ''}
                                    <div class="tir-segment in-range" style="width:${tir.inRange}%">${tir.inRange}%</div>
                                    ${tir.aboveRange > 0 ? `<div class="tir-segment high" style="width:${Math.max(tir.aboveRange - tir.veryHigh, 0)}%">${tir.aboveRange > 5 ? (tir.aboveRange - tir.veryHigh) + '%' : ''}</div>` : ''}
                                    ${tir.veryHigh > 0 ? `<div class="tir-segment very-high" style="width:${tir.veryHigh}%">${tir.veryHigh > 5 ? tir.veryHigh + '%' : ''}</div>` : ''}
                                </div>
                                <div class="tir-legend">
                                    <div class="tir-legend-item"><div class="tir-legend-dot" style="background:#2196f3"></div> Very Low (&lt;54)</div>
                                    <div class="tir-legend-item"><div class="tir-legend-dot" style="background:#00bcd4"></div> Low (&lt;70)</div>
                                    <div class="tir-legend-item"><div class="tir-legend-dot" style="background:#00e676"></div> In Range</div>
                                    <div class="tir-legend-item"><div class="tir-legend-dot" style="background:#ffb800"></div> High (&gt;180)</div>
                                    <div class="tir-legend-item"><div class="tir-legend-dot" style="background:#ff4757"></div> Very High (&gt;250)</div>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px">
                                <div style="text-align:center;padding:8px;background:var(--bg-glass);border-radius:8px">
                                    <div class="text-mono fw-700" style="font-size:1.1rem;color:var(--text-primary)">${tir.cv || 0}%</div>
                                    <div style="font-size:0.68rem;color:var(--text-tertiary)">CV%</div>
                                </div>
                                <div style="text-align:center;padding:8px;background:var(--bg-glass);border-radius:8px">
                                    <div class="text-mono fw-700" style="font-size:1.1rem;color:var(--text-primary)">${tir.stdDev || 0}</div>
                                    <div style="font-size:0.68rem;color:var(--text-tertiary)">Std Dev</div>
                                </div>
                                <div style="text-align:center;padding:8px;background:var(--bg-glass);border-radius:8px">
                                    <div class="text-mono fw-700" style="font-size:1.1rem;color:var(--text-primary)">${readings30d.length}</div>
                                    <div style="font-size:0.68rem;color:var(--text-tertiary)">Readings</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Medications -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">Medications</div>
                        </div>
                        <div class="section-body">
                            <div class="medication-list">
                                ${(patient.medications || []).map(m => `
                                    <div class="medication-item">
                                        <div class="medication-icon">💊</div>
                                        <div class="medication-details">
                                            <div class="medication-name">${escapeHtml(m.name)}</div>
                                            <div class="medication-dose">${m.dose} • ${m.frequency} • ${m.timing.replace(/-/g, ' ')}</div>
                                        </div>
                                        <div class="medication-adherence" style="color:${m.adherence >= 0.9 ? 'var(--accent-green)' : m.adherence >= 0.7 ? 'var(--accent-amber)' : 'var(--accent-red)'}">
                                            ${Math.round(m.adherence * 100)}%
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Recent Readings -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">Recent Readings</div>
                        </div>
                        <div class="section-body">
                            <div class="daily-readings">
                                ${(todayReadings.length > 0 ? todayReadings.slice(-10) : (patient.glucoseReadings || []).slice(-10))
                .map(r => {
                    const pct = Math.min(Math.max((r.value - 40) / (350 - 40) * 100, 0), 100);
                    return `
                                        <div class="reading-row">
                                            <span class="reading-time">${formatTime(r.time)}</span>
                                            <span class="reading-type">${r.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                            <span class="reading-value glucose-value ${getGlucoseClass(r.value)}">${r.value}</span>
                                            <div class="reading-bar">
                                                <div class="reading-bar-fill" style="width:${pct}%;background:${getGlucoseColor(r.value)}"></div>
                                            </div>
                                            ${r.note ? `<span class="reading-note">${escapeHtml(r.note)}</span>` : ''}
                                        </div>
                                    `;
                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Medication Adherence Chart -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">Medication Adherence (30d)</div>
                        </div>
                        <div class="section-body">
                            <div id="adherence-chart-container" style="min-height:150px"></div>
                        </div>
                    </div>

                    <!-- AI Insights & Patterns -->
                    <div class="section-card full-width">
                        <div class="section-header">
                            <div class="section-title">🤖 AI Insights & Patterns</div>
                        </div>
                        <div class="section-body">
                            ${patterns.length > 0 || patientAlerts.length > 0
                ? `
                                ${patterns.map(p => `
                                    <div class="insight-item">
                                        <div class="insight-icon">${p.severity === 'urgent' ? '🚨' : p.severity === 'alert' ? '⚠️' : p.severity === 'warning' ? '⚡' : '📊'}</div>
                                        <div class="insight-text">
                                            <strong>${escapeHtml(p.message)}</strong><br>
                                            ${escapeHtml(p.recommendation)}
                                        </div>
                                    </div>
                                `).join('')}
                                ${patientAlerts.slice(0, 5).map(a => `
                                    <div class="insight-item">
                                        <div class="insight-icon" style="background:${a.severity === 'emergency' || a.severity === 'urgent' ? 'var(--accent-red-dim)' : 'var(--accent-amber-dim)'};color:${a.severity === 'emergency' || a.severity === 'urgent' ? 'var(--accent-red)' : 'var(--accent-amber)'}">
                                            ${getSeverityIcon(a.severity)}
                                        </div>
                                        <div class="insight-text">
                                            <strong>${escapeHtml(a.title)}</strong><br>
                                            ${escapeHtml(a.recommendation || a.message)}
                                        </div>
                                    </div>
                                `).join('')}
                            `
                : '<div class="empty-state"><div class="empty-state-icon">✅</div><p class="empty-state-text">No concerning patterns detected. Patient is doing well.</p></div>'
            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render glucose chart
        setTimeout(() => {
            const chartContainer = document.getElementById('glucose-chart-container');
            if (chartContainer && GC.charts && GC.charts.GlucoseChart) {
                const readings14d = getReadingsForDays(patient, 14);
                const chart = new GC.charts.GlucoseChart(chartContainer, {
                    readings: readings14d.length > 0 ? readings14d : (patient.glucoseReadings || []),
                    days: 14,
                    showTargetRange: true,
                    targetMin: 70,
                    targetMax: 180,
                    interactive: true,
                    animate: true,
                    height: 350
                });
                chart.render();
                state.chartInstances['glucoseChart'] = chart;
            }

            // Render adherence chart
            const adherenceContainer = document.getElementById('adherence-chart-container');
            if (adherenceContainer && GC.charts && GC.charts.AdherenceChart && patient.medicationLog) {
                const adherenceChart = new GC.charts.AdherenceChart(adherenceContainer, patient.medicationLog, {
                    days: 30,
                    medications: (patient.medications || []).map(m => m.name),
                    height: 150
                });
                adherenceChart.render();
                state.chartInstances['adherenceChart'] = adherenceChart;
            }
        }, 200);
    }

    // ════════════════════════════════════════════════════════
    //  ALERTS VIEW
    // ════════════════════════════════════════════════════════
    function renderAlerts(container) {
        const alerts = state.allAlerts;

        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="patients-header">
                    <div class="patients-filters">
                        ${['all', 'emergency', 'urgent', 'alert', 'warning', 'info'].map(f =>
            `<button class="filter-btn ${state.alertFilter === f ? 'active' : ''}"
                                 onclick="GlucoConnect.app.setAlertFilter('${f}')">${f === 'all' ? 'All Alerts' : f.charAt(0).toUpperCase() + f.slice(1)}</button>`
        ).join('')}
                    </div>
                    <div class="text-secondary" style="font-size:0.85rem">
                        ${alerts.length} total alerts
                    </div>
                </div>

                <div class="alerts-view-list" id="alerts-view-list">
                    ${alerts
                .filter(a => state.alertFilter === 'all' || a.severity === state.alertFilter)
                .map((a, i) => `
                            <div class="alert-view-item severity-${a.severity} stagger-item" style="animation-delay:${i * 40}ms"
                                 onclick="window.location.hash='#patient/${a.patientId}'">
                                <div class="alert-severity-icon ${a.severity}" style="width:48px;height:48px;font-size:1.2rem">
                                    ${getSeverityIcon(a.severity)}
                                </div>
                                <div class="alert-view-body">
                                    <div class="alert-view-title">${escapeHtml(a.title)}</div>
                                    <div class="alert-view-message">${escapeHtml(a.message)}</div>
                                    ${a.recommendation ? `<div class="alert-view-recommendation">💡 ${escapeHtml(a.recommendation)}</div>` : ''}
                                    <div class="alert-view-meta">
                                        <span>👤 ${escapeHtml(a.patientName)}</span>
                                        <span>•</span>
                                        <span>🏷️ ${a.category || 'clinical'}</span>
                                        <span>•</span>
                                        <span>🕐 ${timeAgo(a.timestamp)}</span>
                                        <span>•</span>
                                        <span class="badge badge-${a.severity}">${a.severity}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    }

    // ════════════════════════════════════════════════════════
    //  ANALYTICS VIEW
    // ════════════════════════════════════════════════════════
    function renderAnalytics(container) {
        const patients = (state.patients || []) || [];
        const rules = GC.rules || {};

        // Calculate population stats
        const avgHba1c = patients.length > 0
            ? (patients.reduce((s, p) => s + p.hba1c, 0) / patients.length).toFixed(1)
            : '--';

        const riskDistribution = { low: 0, moderate: 0, high: 0, critical: 0 };
        patients.forEach(p => { riskDistribution[p.riskLevel] = (riskDistribution[p.riskLevel] || 0) + 1; });

        const avgBmi = patients.length > 0
            ? (patients.reduce((s, p) => s + (p.bmi || 0), 0) / patients.length).toFixed(1)
            : '--';

        // Medication distribution
        const medCounts = {};
        patients.forEach(p => {
            (p.medications || []).forEach(m => {
                medCounts[m.name] = (medCounts[m.name] || 0) + 1;
            });
        });
        const topMeds = Object.entries(medCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

        // City distribution
        const cityCounts = {};
        patients.forEach(p => { cityCounts[p.city] = (cityCounts[p.city] || 0) + 1; });

        container.innerHTML = `
            <div class="animate-fadeIn">
                <!-- Summary Stats -->
                <div class="analytics-grid">
                    <div class="analytics-card stagger-item">
                        <h3>Average HbA1c</h3>
                        <div class="analytics-big-number" style="color:${parseFloat(avgHba1c) < 7 ? 'var(--accent-green)' : parseFloat(avgHba1c) < 8 ? 'var(--accent-amber)' : 'var(--accent-red)'}">${avgHba1c}%</div>
                        <p style="font-size:0.8rem;color:var(--text-tertiary)">Across all ${patients.length} patients</p>
                    </div>
                    <div class="analytics-card stagger-item">
                        <h3>Average BMI</h3>
                        <div class="analytics-big-number text-cyan">${avgBmi}</div>
                        <p style="font-size:0.8rem;color:var(--text-tertiary)">Population average</p>
                    </div>
                    <div class="analytics-card stagger-item">
                        <h3>Active Alerts</h3>
                        <div class="analytics-big-number text-red">${state.allAlerts.length}</div>
                        <p style="font-size:0.8rem;color:var(--text-tertiary)">${state.allAlerts.filter(a => a.severity === 'emergency' || a.severity === 'urgent').length} urgent/emergency</p>
                    </div>
                </div>

                <!-- Risk Distribution -->
                <div class="section-card mb-lg">
                    <div class="section-header">
                        <div class="section-title">Patient Risk Distribution</div>
                    </div>
                    <div class="section-body">
                        <div style="display:flex;gap:16px;align-items:flex-end;height:200px;padding:16px 0">
                            ${Object.entries(riskDistribution).map(([level, count]) => {
            const colors = { low: 'var(--accent-green)', moderate: 'var(--accent-amber)', high: 'var(--accent-red)', critical: '#ff1744' };
            const maxCount = Math.max(...Object.values(riskDistribution), 1);
            const height = (count / maxCount) * 160;
            return `
                                    <div style="flex:1;text-align:center">
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
                                            <span class="text-mono fw-700" style="color:${colors[level]}">${count}</span>
                                            <div style="width:100%;max-width:80px;height:${height}px;background:${colors[level]};border-radius:8px 8px 0 0;opacity:0.8;transition:height 0.5s ease"></div>
                                            <span style="font-size:0.75rem;color:var(--text-secondary);text-transform:capitalize">${level}</span>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Medication Distribution -->
                <div class="section-card mb-lg">
                    <div class="section-header">
                        <div class="section-title">Medication Distribution</div>
                    </div>
                    <div class="section-body">
                        <div style="display:flex;flex-direction:column;gap:8px">
                            ${topMeds.map(([name, count]) => {
            const pct = Math.round((count / patients.length) * 100);
            return `
                                    <div style="display:flex;align-items:center;gap:12px">
                                        <span style="width:140px;font-size:0.82rem;color:var(--text-secondary)">${name}</span>
                                        <div style="flex:1;height:24px;background:var(--bg-glass);border-radius:12px;overflow:hidden">
                                            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent-cyan),var(--accent-purple));border-radius:12px;display:flex;align-items:center;padding:0 8px;transition:width 0.5s ease">
                                                <span style="font-size:0.7rem;font-weight:600;color:white">${count} (${pct}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                </div>

                <!-- City Distribution -->
                <div class="section-card">
                    <div class="section-header">
                        <div class="section-title">Patient Location Distribution</div>
                    </div>
                    <div class="section-body">
                        <div style="display:flex;flex-wrap:wrap;gap:12px">
                            ${Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).map(([city, count]) => `
                                <div style="padding:12px 20px;background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:12px;text-align:center">
                                    <div class="text-mono fw-700" style="font-size:1.2rem;color:var(--accent-cyan)">${count}</div>
                                    <div style="font-size:0.75rem;color:var(--text-secondary)">${city}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ════════════════════════════════════════════════════════
    //  FOOD DATABASE VIEW
    // ════════════════════════════════════════════════════════
    function renderFoodDatabase(container) {
        const foods = GC.foodDatabase || [];
        const categories = [...new Set(foods.map(f => f.category))];

        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="patients-header mb-lg">
                    <div class="patients-filters" id="food-filters">
                        <button class="filter-btn active" onclick="GlucoConnect.app.filterFoods('all', this)">All</button>
                        ${categories.map(c => `
                            <button class="filter-btn" onclick="GlucoConnect.app.filterFoods('${c}', this)">${c.charAt(0).toUpperCase() + c.slice(1)}</button>
                        `).join('')}
                    </div>
                    <div class="text-secondary" style="font-size:0.85rem">${foods.length} foods in database</div>
                </div>

                <div class="food-grid" id="food-grid">
                    ${foods.map((f, i) => renderFoodCard(f, i)).join('')}
                </div>
            </div>
        `;
    }

    function renderFoodCard(food, index) {
        return `
            <div class="food-card stagger-item" data-category="${food.category}" style="animation-delay:${index * 30}ms">
                <div class="food-card-header">
                    <div class="food-name">${escapeHtml(food.name)}</div>
                    <div class="food-gi gi-${food.giClass}">GI: ${food.gi}</div>
                </div>
                <div class="food-details">
                    <div class="food-detail-item">
                        <div class="food-detail-value">${food.carbsPerServing || '--'}g</div>
                        <div class="food-detail-label">Carbs/Srv</div>
                    </div>
                    <div class="food-detail-item">
                        <div class="food-detail-value">${food.fiberPer100g || '--'}g</div>
                        <div class="food-detail-label">Fiber/100g</div>
                    </div>
                    <div class="food-detail-item">
                        <div class="food-detail-value">${food.proteinPer100g || '--'}g</div>
                        <div class="food-detail-label">Protein/100g</div>
                    </div>
                </div>
                <div class="food-notes">${escapeHtml(food.notes || '')}</div>
                <div class="food-tags">
                    <span class="food-tag ${food.giClass === 'low' ? 'friendly' : food.giClass === 'medium' ? 'caution' : 'avoid'}">${food.giClass} GI</span>
                    ${food.diabeticFriendly ? '<span class="food-tag friendly">✓ Diabetic Friendly</span>' : '<span class="food-tag avoid">⚠ Limit Intake</span>'}
                    ${(food.region || []).map(r => r !== 'all' ? `<span class="food-tag">${r}</span>` : '').join('')}
                </div>
            </div>
        `;
    }

    // ── Public API (called from onclick handlers) ────────────
    GC.app = {
        filterDashboardPatients: function (filter) {
            state.patientFilter = filter;
            renderDashboard($('#view-container'));
        },
        setPatientFilter: function (filter) {
            state.patientFilter = filter;
            renderPatients($('#view-container'));
        },
        setAlertFilter: function (filter) {
            state.alertFilter = filter;
            renderAlerts($('#view-container'));
        },
        setGlucosePeriod: function (days, btnEl) {
            if (!state.selectedPatient) return;
            // Update active btn
            $$('#glucose-period-selector .period-btn').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');

            // Update chart
            if (state.chartInstances['glucoseChart']) {
                const readings = getReadingsForDays(state.selectedPatient, days);
                state.chartInstances['glucoseChart'].setDays(days);
                state.chartInstances['glucoseChart'].update(readings.length > 0 ? readings : state.selectedPatient.glucoseReadings);
            }
        },
        filterFoods: function (category, btnEl) {
            // Update active btn
            $$('#food-filters .filter-btn').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');

            // Filter cards
            $$('#food-grid .food-card').forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    };

    // ── Boot ─────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    // ════════════════════════════════════════════════════════
    //  ADMIN PANEL VIEW
    // ════════════════════════════════════════════════════════
    function renderAdminPanel(container) {
        if (!state.activeDoctor || state.activeDoctor.role !== 'admin') {
            window.location.hash = '#dashboard';
            return;
        }

        container.innerHTML = `<div class="p-4 text-center text-secondary">Loading doctors from Firebase Cloud...</div>`;

        if (GC.firebase && GC.firebase.db) {
            GC.firebase.db.collection('users').where('role', '==', 'doctor').get().then(snapshot => {
                const doctors = snapshot.docs.map(doc => doc.data());
                renderAdminPanelWithData(container, doctors);
            }).catch(err => {
                container.innerHTML = `<div class="login-error">Failed to load doctors: ${err.message}</div>`;
            });
        }
    }

    function renderAdminPanelWithData(container, doctors) {
        container.innerHTML = `
            <div class="animate-fadeIn">
                <div class="section-card full-width mb-lg">
                    <div class="section-header">
                        <div class="section-title">Manage Doctors (Firebase Cloud)</div>
                        <div class="section-actions">
                            <button class="btn btn-primary" id="btn-add-doctor">+ Add New Doctor</button>
                        </div>
                    </div>
                    <div class="section-body">
                        <table class="patients-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Specialty</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${doctors.map((d, i) => `
                                    <tr class="stagger-item" style="animation-delay:${i * 40}ms">
                                        <td>
                                            <div style="display:flex;align-items:center;gap:12px">
                                                <div class="patient-avatar" style="width:36px;height:36px;font-size:0.7rem;background:var(--accent-purple);color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;">${d.avatar || '?'}</div>
                                                <div class="fw-600">${escapeHtml(d.name)}</div>
                                            </div>
                                        </td>
                                        <td class="text-secondary">${escapeHtml(d.email)}</td>
                                        <td class="text-secondary">${escapeHtml(d.specialty)}</td>
                                        <td>
                                            <button class="section-btn" onclick="GlucoConnect.app.deleteUser('${d.id}')" style="color:var(--accent-red);border-color:rgba(255,71,87,0.3)">Delete</button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${doctors.length === 0 ? '<tr><td colspan="4" class="text-center text-secondary py-4">No doctors found.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Add Doctor Form -->
                <div class="section-card full-width" id="add-doctor-panel" style="display:none; margin-top:20px;">
                    <div class="section-header">
                        <div class="section-title">Register New Doctor (Firebase Auth)</div>
                    </div>
                    <div class="section-body">
                        <form id="add-doctor-form" style="max-width:500px">
                            <div class="form-group" style="margin-bottom:15px">
                                <label style="display:block;margin-bottom:5px;color:var(--text-secondary)">Full Name</label>
                                <input type="text" id="new-doc-name" class="login-input" required>
                            </div>
                            <div class="form-group" style="margin-bottom:15px">
                                <label style="display:block;margin-bottom:5px;color:var(--text-secondary)">Email Address</label>
                                <input type="email" id="new-doc-email" class="login-input" required>
                            </div>
                            <div class="form-group" style="margin-bottom:15px">
                                <label style="display:block;margin-bottom:5px;color:var(--text-secondary)">Password</label>
                                <input type="text" id="new-doc-password" class="login-input" required>
                            </div>
                            <div class="form-group" style="margin-bottom:15px">
                                <label style="display:block;margin-bottom:5px;color:var(--text-secondary)">Specialty</label>
                                <input type="text" id="new-doc-specialty" class="login-input" required>
                            </div>
                            <div id="add-doc-error" class="login-error" style="display:none;margin-bottom:15px"></div>
                            <button type="submit" class="btn btn-primary">Create Account</button>
                            <button type="button" class="btn section-btn" id="btn-cancel-doc" style="margin-left:10px">Cancel</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const btnAdd = document.getElementById('btn-add-doctor');
            const panel = document.getElementById('add-doctor-panel');
            const btnCancel = document.getElementById('btn-cancel-doc');
            const form = document.getElementById('add-doctor-form');

            if(btnAdd) btnAdd.addEventListener('click', () => { panel.style.display = 'block'; });
            if(btnCancel) btnCancel.addEventListener('click', () => { panel.style.display = 'none'; form.reset(); });
            
            if(form) form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const name = document.getElementById('new-doc-name').value;
                const email = document.getElementById('new-doc-email').value;
                const password = document.getElementById('new-doc-password').value;
                const specialty = document.getElementById('new-doc-specialty').value;
                const errEl = document.getElementById('add-doc-error');

                if (GC.firebase && GC.firebase.adminAuth) {
                    GC.firebase.adminAuth.createUserWithEmailAndPassword(email, password)
                        .then(cred => {
                            return GC.firebase.db.collection('users').doc(cred.user.uid).set({
                                id: cred.user.uid,
                                email: email,
                                name: name,
                                specialty: specialty,
                                role: 'doctor',
                                avatar: name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()
                            });
                        })
                        .then(() => {
                            renderAdminPanel(document.getElementById('view-container')); // Refresh
                        })
                        .catch(err => {
                            errEl.textContent = err.message;
                            errEl.style.display = 'block';
                        });
                }
            });
        }, 100);
    }

    GC.app = GC.app || {};
    GC.app.deleteUser = function(id) {
        if(confirm("Are you sure you want to delete this doctor account from Firestore?")) {
            if (GC.firebase && GC.firebase.db) {
                GC.firebase.db.collection('users').doc(id).delete().then(() => {
                    if (state.currentView === 'admin') renderAdminPanel(document.getElementById('view-container'));
                }).catch(e => {
                    alert(e.message);
                });
            }
        }
    };
})();

