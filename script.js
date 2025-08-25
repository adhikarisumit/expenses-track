/* script.js - Yen Budget Manager (English, Light/Dark, LocalStorage) */
(() => {
    // Utilities
    const fmt = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
    const ymd = (d) => new Date(d).toISOString().slice(0, 10);
    const ym = (d) => ymd(d).slice(0, 7);
    const today = () => ymd(new Date());
    const monthName = (s) => {
        const d = new Date(s + '-01');
        return `${d.getFullYear()} ${d.toLocaleString('en-US', { month: 'long' })}`;
    };
    const el = (sel, root = document) => root.querySelector(sel);
    const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const byId = (id) => document.getElementById(id);

    // Storage key & state
    const KEY = 'yen-budget-manager:v1';
    const defaultState = {
    theme: (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark',
    tx: {}, // Change from [] to {}
    budgets: {}, // Will store { amount: number, spent: number }
    goal: { income: 0, rate: 0 },
    categories: ['Food', 'Rent', 'Transport', 'Utilities', 'Comms', 'Social', 'Entertainment', 'Education', 'Medical', 'Household', 'Savings', 'Income', 'Other']
};
    let state = load() || defaultState;
    console.log('Initial state loaded:', state);
    console.log('State.tx type:', typeof state.tx);
    console.log('State.tx value:', state.tx);
    
    // Ensure state.tx is properly initialized
    if (!state.tx || typeof state.tx !== 'object') {
        console.log('Fixing state.tx initialization');
        state.tx = {};
    }
    
    // Ensure essential categories exist
    if (!state.categories.includes('Income')) {
        state.categories.push('Income');
        console.log('Added missing Income category');
    }
    if (!state.categories.includes('Other')) {
        state.categories.push('Other');
        console.log('Added missing Other category');
    }
    
    // Migrate old budget format to new format
    Object.keys(state.budgets).forEach(cat => {
        if (typeof state.budgets[cat] === 'number') {
            // Convert old format (number) to new format (object)
            const oldAmount = state.budgets[cat];
            state.budgets[cat] = {
                amount: oldAmount,
                spent: 0
            };
            console.log(`Migrated budget for ${cat} from old format to new format`);
        }
    });

    // Persist with a timestamp and broadcast to other tabs/clients
    const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('yen-budget-channel') : null;

    function save() {
        state._updated = Date.now();
        console.log('Saving state:', state);
        localStorage.setItem(KEY, JSON.stringify(state));
        // Signal storage event in environments without BroadcastChannel consumers
        try { localStorage.setItem(KEY + ':signal', String(state._updated)); } catch (e) {}
        // Broadcast to other tabs (if available)
        try { bc?.postMessage({ type: 'state', state }); } catch (e) {}
        console.log('State saved to localStorage');
    }

    function load() {
        try { 
            const loaded = JSON.parse(localStorage.getItem(KEY));
            console.log('Loaded state from localStorage:', loaded);
            return loaded;
        } catch (e) { 
            console.log('Error loading state:', e);
            return null; 
        }
    }

    // Handle an incoming state from another tab/client
    function handleIncomingState(incoming) {
        if (!incoming) return;
        // Only accept newer states
        if ((incoming._updated || 0) > (state._updated || 0)) {
            state = incoming;
            renderAll();
        }
    }

    // Listen for BroadcastChannel messages
    if (bc) {
        bc.onmessage = (ev) => {
            if (ev.data && ev.data.type === 'state') handleIncomingState(ev.data.state);
        };
        // close channel when leaving page
        window.addEventListener('beforeunload', () => bc.close());
    }

    // Fallback: listen to storage events (other tabs writing localStorage)
    window.addEventListener('storage', (e) => {
        if (!e.key) return;
        if (e.key === KEY || e.key === KEY + ':signal') {
            const s = load();
            handleIncomingState(s);
        }
    });

    // Optional: connect to a WebSocket server for cross-device real-time sync
    // Uncomment and provide wsUrl to enable server push
    /*
    const wsUrl = 'wss://your-server.example/ws';
    let ws;
    function initWebSocket() {
        ws = new WebSocket(wsUrl);
        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'hello', since: state._updated || 0 }));
        });
        ws.addEventListener('message', (m) => {
            try {
                const msg = JSON.parse(m.data);
                if (msg.type === 'state') handleIncomingState(msg.state);
            } catch (e) {}
        });
        // send local updates to server
        const origSave = save;
        save = function() {
            origSave();
            if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'state', state }));
        };
    }
    // initWebSocket(); // call if using server
    */

    // Theme
    function applyTheme() {
        const isDark = state.theme === 'dark';
        
        // Apply theme class to document root
        document.documentElement.classList.toggle('dark', isDark);
        
        // Force navbar theme update
        const navbar = document.querySelector('header.navbar');
        if (navbar) {
            if (isDark) {
                navbar.style.background = 'var(--header-bg-gradient)';
                navbar.style.borderBottomColor = 'var(--border-primary)';
            } else {
                navbar.style.background = 'var(--header-bg-gradient)';
                navbar.style.borderBottomColor = 'var(--border-primary)';
            }
        }
        
        // Enhanced theme toggle button with smooth transitions
        const btn = byId('toggleTheme');
        if (btn) {
            // Smooth icon transition
            btn.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                btn.textContent = isDark ? '☀️' : '🌙';
                btn.title = isDark ? 'Switch to Light Mode (Ctrl+L)' : 'Switch to Dark Mode (Ctrl+L)';
                btn.style.transform = 'rotate(0deg)';
            }, 150);
            
            // Enhanced button styling based on theme
            if (isDark) {
                btn.style.background = 'var(--accent-gradient)';
                btn.style.borderColor = 'transparent';
                btn.style.color = 'var(--text-inverse)';
            } else {
                btn.style.background = 'var(--bg-tertiary)';
                btn.style.borderColor = 'var(--border-primary)';
                btn.style.color = 'var(--text-primary)';
            }
        }
        
        // Enhanced theme transition effects
        addThemeTransitionEffects();
        
        // Update meta theme color for mobile browsers
        updateMetaThemeColor(isDark);
        
        // Enhanced chart colors based on theme
        updateChartColors(isDark);
        
        // Debug: Log theme state
        console.log('Theme applied:', state.theme, 'isDark:', isDark, 'dark class:', document.documentElement.classList.contains('dark'));
    }
    
    // Force update navbar theme colors
    function updateNavbarTheme() {
        const isDark = state.theme === 'dark';
        const navbar = document.querySelector('header.navbar');
        
        console.log('Updating navbar theme:', { isDark, theme: state.theme, navbar: !!navbar });
        
        if (navbar) {
            // Update navbar background
            const bgGradient = isDark ? 
                'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 
                'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
            
            navbar.style.background = bgGradient;
            console.log('Navbar background set to:', bgGradient);
            
            // Update navbar border
            const borderColor = isDark ? '#334155' : '#e2e8f0';
            navbar.style.borderBottomColor = borderColor;
            console.log('Navbar border set to:', borderColor);
            
            // Update all navbar text colors
            const navbarTexts = navbar.querySelectorAll('.navbar-brand, .navbar-nav .nav-link, .btn-outline-light');
            navbarTexts.forEach(el => {
                el.style.color = '#ffffff';
            });
            console.log('Updated', navbarTexts.length, 'navbar text elements');
            
            // Update nav link active states
            const navLinks = navbar.querySelectorAll('.navbar-nav .nav-link');
            navLinks.forEach(link => {
                if (link.classList.contains('active')) {
                    link.style.background = isDark ? 
                        'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    link.style.color = '#ffffff';
                    link.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                } else {
                    link.style.background = 'transparent';
                    link.style.color = '#ffffff';
                    link.style.boxShadow = 'none';
                }
            });
            console.log('Updated', navLinks.length, 'nav link elements');
            
            // Update badge colors
            const badges = navbar.querySelectorAll('.badge');
            badges.forEach(badge => {
                badge.style.background = 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)';
                badge.style.color = '#ffffff';
            });
            console.log('Updated', badges.length, 'badge elements');
            
            // Update button colors
            const primaryBtn = navbar.querySelector('.btn-primary');
            if (primaryBtn) {
                const btnGradient = isDark ? 
                    'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                primaryBtn.style.background = btnGradient;
                primaryBtn.style.color = '#ffffff';
                console.log('Primary button background set to:', btnGradient);
            }
        } else {
            console.warn('Navbar element not found!');
        }
    }
    
    // Enhanced theme toggle with better user feedback
    byId('toggleTheme').addEventListener('click', () => {
        const btn = byId('toggleTheme');
        
        // Add click animation
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 100);
        
        // Toggle theme
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        updateNavbarTheme(); // Force navbar update
        save();
        
            // Update chart colors for theme change
    updateChartColors(state.theme === 'dark');
    
    // Force refresh of all charts with new theme colors
    setTimeout(() => {
        if (isReportsPage()) {
            renderReports();
        }
        // Refresh main dashboard charts
        if (window.incomeExpenseChart) {
            window.incomeExpenseChart.destroy();
            setTimeout(() => renderIncomeExpenseTrend(), 100);
        }
        if (window.categoryPieChart) {
            window.categoryPieChart.destroy();
            setTimeout(() => renderCategoryBreakdown(), 100);
        }
        if (window.savingsBarChart) {
            window.savingsBarChart.destroy();
            setTimeout(() => renderSavingsTrend(), 100);
        }
    }, 200);
        
        // Refresh reports charts if on reports page
        if (isReportsPage()) {
            renderReports();
        }
        
        // Refresh other charts
        if (window.incomeExpenseChart) {
            window.incomeExpenseChart.destroy();
            setTimeout(() => renderIncomeExpenseTrend(), 100);
        }
        if (window.categoryPieChart) {
            window.categoryPieChart.destroy();
            setTimeout(() => renderCategoryBreakdown(), 100);
        }
        if (window.savingsBarChart) {
            window.savingsBarChart.destroy();
            setTimeout(() => renderSavingsTrend(), 100);
        }
        
        // Show theme change notification
        showThemeNotification(state.theme);
        
        // Update reports in real-time
        updateReportsRealTime();
        
        // Also sync dashboard and reports to ensure consistency after theme change
        setTimeout(() => {
            if (window.syncDashboardAndReports) {
                window.syncDashboardAndReports();
            }
        }, 300);
    });
    
    // Enhanced theme transition effects
    function addThemeTransitionEffects() {
        // Add smooth transition class to body
        document.body.classList.add('theme-transitioning');
        
        // Remove transition class after animation completes
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
    }
    
    // Update meta theme color for mobile browsers
    function updateMetaThemeColor(isDark) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        metaThemeColor.content = isDark ? '#0f172a' : '#ffffff';
    }
    
    // Enhanced chart colors based on theme
    function updateChartColors(isDark) {
        if (window.Chart && window.chartRefs) {
            Object.values(window.chartRefs).forEach(chart => {
                if (chart && chart.options) {
                    // Update chart colors based on theme
                    const textColor = isDark ? '#f8fafc' : '#1e293b';
                    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                    
                    // Update scales colors
                    if (chart.options.scales) {
                        if (chart.options.scales.x) {
                            chart.options.scales.x.grid.color = gridColor;
                            chart.options.scales.x.ticks.color = textColor;
                        }
                        if (chart.options.scales.y) {
                            chart.options.scales.y.grid.color = gridColor;
                            chart.options.scales.y.ticks.color = textColor;
                        }
                    }
                    
                    // Update legend colors
                    if (chart.options.plugins && chart.options.plugins.legend) {
                        chart.options.plugins.legend.labels.color = textColor;
                    }
                    
                    chart.update('none'); // Update without animation for theme change
                }
            });
        }
    }
    
    // Enhanced theme change notification
    function showThemeNotification(theme) {
        // Remove existing notification
        const existingNotification = document.querySelector('.theme-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${theme === 'dark' ? 'moon' : 'sun'}"></i>
                <span>Switched to ${theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            color: var(--text-primary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-md);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow-lg);
            z-index: 9999;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Enhanced system theme detection
    function detectSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Set initial theme based on system preference if no stored preference
            if (!state.theme) {
                state.theme = mediaQuery.matches ? 'dark' : 'light';
                save();
            }
            
            // Listen for system theme changes
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!state.theme || state.theme === 'auto') {
                    state.theme = e.matches ? 'dark' : 'light';
                    applyTheme();
                    save();
                }
            });
        }
    }
    
    // Enhanced theme persistence with better error handling
    function saveTheme() {
        try {
            state._updated = Date.now();
            localStorage.setItem(KEY, JSON.stringify(state));
            
            // Signal storage event
            try { 
                localStorage.setItem(KEY + ':signal', String(state._updated)); 
            } catch (e) {
                console.warn('Theme signal storage failed:', e);
            }
            
            // Broadcast to other tabs
            try { 
                bc?.postMessage({ type: 'state', state }); 
            } catch (e) {
                console.warn('Theme broadcast failed:', e);
            }
        } catch (e) {
            console.error('Theme save failed:', e);
            // Fallback: try to save just the theme
            try {
                localStorage.setItem(KEY + ':theme', state.theme);
            } catch (fallbackError) {
                console.error('Theme fallback save also failed:', fallbackError);
            }
        }
    }
    
    // Enhanced theme loading with fallback
    function loadTheme() {
        try {
            const saved = localStorage.getItem(KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch (e) {
            console.warn('Theme load failed, trying fallback:', e);
            // Try to load just the theme
            try {
                const theme = localStorage.getItem(KEY + ':theme');
                if (theme) {
                    return { theme: theme === 'dark' ? 'dark' : 'light' };
                }
            } catch (fallbackError) {
                console.error('Theme fallback load also failed:', fallbackError);
            }
        }
        return null;
    }
    
    // Override the original save function to use enhanced theme saving
    const originalSave = save;
    save = function() {
        originalSave();
        // Additional theme-specific saving if needed
        if (state.theme) {
            saveTheme();
        }
    };
    
    // Enhanced theme initialization
    function initializeTheme() {
        // Detect system theme preference
        detectSystemTheme();
        
        // Apply stored theme or default
        const savedState = loadTheme();
        if (savedState && savedState.theme) {
            state.theme = savedState.theme;
        } else {
            // Default to system preference
            state.theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        
        // Apply theme
        applyTheme();
        
        // Add theme change listener for other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === KEY && e.newValue) {
                try {
                    const newState = JSON.parse(e.newValue);
                    if (newState.theme && newState.theme !== state.theme) {
                        state.theme = newState.theme;
                        applyTheme();
                    }
                } catch (parseError) {
                    console.warn('Failed to parse theme from storage:', parseError);
                }
            }
        });
    }
    
    // Initialize theme system
    initializeTheme();

    // Page Navigation System - Replace tab system with proper page navigation
    function navigateToPage(pageId) {
        // Hide all sections first
        els('main > section').forEach(s => s.classList.add('hidden'));
        
        // Show only the selected page
        const targetSection = byId(pageId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        // Update nav link active states
        els('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === pageId) {
                link.classList.add('active');
            }
        });
        
        // Update navbar theme colors after navigation
        updateNavbarTheme();
        
        // Render page-specific content
        switch (pageId) {
            case 'dashboard':
                drawDashboard();
                break;
            case 'transactions':
                renderTxTable();
                break;
            case 'budgets':
                renderBudgets();
                setupIncomeForm(); // Setup income form when budgets page is loaded
                break;
            case 'reports':
                // Add a longer delay to ensure DOM is fully ready
                setTimeout(() => {
                    console.log('Reports page navigation: DOM should be ready now');
                    renderReports();
                    // Ensure monthly data table is refreshed
                    setTimeout(() => {
                        console.log('Refreshing monthly data table after navigation');
                        renderMonthlyDataTable();
                    }, 100);
                }, 300);
                break;
            case 'settings':
                renderCategoryManager();
                break;
        }
        
        // Update page title
        const pageTitles = {
            'dashboard': 'Dashboard - Yen Budget Manager',
            'transactions': 'Transactions - Yen Budget Manager',
            'budgets': 'Budgets - Yen Budget Manager',
            'reports': 'Reports - Yen Budget Manager',
            'settings': 'Settings - Yen Budget Manager'
        };
        document.title = pageTitles[pageId] || 'Yen Budget Manager';
        
        // Update browser history
        if (window.history && window.history.pushState) {
            window.history.pushState({ page: pageId }, pageTitles[pageId], `#${pageId}`);
        }
        
        // Sync dashboard and reports after navigation to ensure consistency
        setTimeout(() => {
            if (window.syncDashboardAndReports) {
                window.syncDashboardAndReports();
            }
        }, 100);
    }
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page) {
            navigateToPage(event.state.page);
        }
    });
    
    // Handle hash-based navigation
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash && ['dashboard', 'transactions', 'budgets', 'reports', 'settings'].includes(hash)) {
            navigateToPage(hash);
        }
    });
    
    // Replace the old tab click handler with page navigation
    byId('tabs').addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (!navLink) return;
        
        const pageId = navLink.dataset.view;
        if (pageId) {
            navigateToPage(pageId);
        }
    });

    // Old tab system removed - replaced with page navigation above

    // Data helpers
    function addTx(tx) {
        const month = ym(tx.date); // e.g., "2025-08"
        console.log('=== addTx called ===');
        console.log('Transaction to add:', tx);
        console.log('Transaction date:', tx.date);
        console.log('Calculated month:', month);
        console.log('Current state.tx before:', state.tx);
        console.log('Current state.tx[month] before:', state.tx[month]);
        
        if (!state.tx[month]) {
            console.log('Creating new month array for:', month);
            state.tx[month] = [];
        }
        
        state.tx[month].push(tx);
        console.log('State.tx after adding:', state.tx);
        console.log('State.tx[month] after adding:', state.tx[month]);
        console.log('All transactions after adding:', allTx());
        
        save();
        console.log('Transaction saved to localStorage');
        updateReportsRealTime(); // Update reports in real-time
        console.log('=== addTx completed ===');
    }
    // Find a transaction location across month buckets
    function findTxLocation(id) {
        for (const [month, list] of Object.entries(state.tx || {})) {
            const idx = list.findIndex(t => t.id === id);
            if (idx >= 0) return { month, idx, tx: list[idx] };
        }
        return null;
    }

    function updateTx(id, patch) {
        const loc = findTxLocation(id);
        if (!loc) return;
        state.tx[loc.month][loc.idx] = { ...loc.tx, ...patch };
        save();
        updateReportsRealTime(); // Update reports in real-time
    }

    function deleteTx(id) {
        const loc = findTxLocation(id);
        if (!loc) return;
        state.tx[loc.month].splice(loc.idx, 1);
        if (!state.tx[loc.month].length) delete state.tx[loc.month];
        save();
        updateReportsRealTime(); // Update reports in real-time
    }

    function monthTx(yyyymm) {
        return state.tx[yyyymm] || [];
    }
    function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
    function totalsForMonth(yyyymm) {
        const arr = monthTx(yyyymm);
        const income = sum(arr.filter(x => x.type === 'income').map(x => x.amount));
        const expense = sum(arr.filter(x => x.type === 'expense').map(x => x.amount));
        return { income, expense, savings: income - expense };
    }
    function categorySpend(yyyymm) {
        const out = {};
        for (const t of monthTx(yyyymm).filter(x => x.type === 'expense')) {
            out[t.category] = (out[t.category] || 0) + t.amount;
        }
        return out;
    }

    // Recurring engine
    function applyRecurring() {
        console.log('applyRecurring called, current state.tx:', state.tx);
        const todayStr = today();
        // Work on a snapshot to avoid mutating while iterating
        const snapshot = allTx();
        console.log('applyRecurring snapshot:', snapshot);
        for (const t of snapshot) {
            if (!t.recurring || t.recurring === 'none') continue;
            if (!t.next) continue;
            let next = new Date(t.next);
            const orig = findTxLocation(t.id);
            while (ymd(next) <= todayStr) {
                // Post the recurring instance into its correct month bucket
                const post = {
                    id: crypto.randomUUID(),
                    type: t.type,
                    category: t.category,
                    amount: t.amount,
                    date: ymd(next),
                    note: (t.note || '') + ' (recurring)'
                };
                console.log('Adding recurring transaction:', post);
                addTx(post);
                next = addInterval(next, t.recurring);
            }
            if (orig) {
                state.tx[orig.month][orig.idx] = { ...orig.tx, next: ymd(next) };
            }
        }
        console.log('applyRecurring completed, final state.tx:', state.tx);
        save();
    }
    function addInterval(d, kind) {
        const x = new Date(d);
        if (kind === 'weekly') { x.setDate(x.getDate() + 7); }
        if (kind === 'monthly') { x.setMonth(x.getMonth() + 1); }
        if (kind === 'yearly') { x.setFullYear(x.getFullYear() + 1); }
        return x;
    }

    // Forms & UI wiring
    const txForm = byId('txForm');
    function resetTxForm() {
        txForm.type.value = 'expense';
        txForm.category.value = '';
        txForm.amount.value = '';
        txForm.date.value = today();
        txForm.note.value = '';
        txForm.recurring.value = 'none';
        txForm.next.value = '';
    }
    resetTxForm();

    txForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(txForm);
        const tx = {
            id: crypto.randomUUID(),
            type: fd.get('type'),
            category: (fd.get('category') || '').trim() || 'Other',
            amount: Math.round(Number(fd.get('amount') || 0)),
            date: fd.get('date') || today(),
            note: (fd.get('note') || '').trim(),
            recurring: fd.get('recurring') || 'none',
            next: fd.get('next') || null
        };
        if (tx.category && !state.categories.includes(tx.category)) state.categories.push(tx.category);
        addTx(tx); renderAll();
        resetTxForm();
    });

    byId('addQuick').addEventListener('click', () => navigateToPage('transactions'));

    // --- Make transactions deletable: attach delegated handlers to tx tables ---
    // Helper to return flattened list of transactions
    function allTx() {
        const out = [];
        console.log('=== allTx called ===');
        console.log('state object:', state);
        console.log('state.tx:', state.tx);
        console.log('state.tx type:', typeof state.tx);
        console.log('state.tx keys:', Object.keys(state.tx || {}));
        
        if (!state.tx || typeof state.tx !== 'object') {
            console.warn('state.tx is not properly initialized:', state.tx);
            return [];
        }
        
        for (const list of Object.values(state.tx || {})) {
            console.log('Processing month list:', list);
            if (Array.isArray(list)) {
                out.push(...list);
            } else {
                console.warn('Month list is not an array:', list);
            }
        }
        console.log('allTx returning:', out);
        console.log('allTx length:', out.length);
        console.log('=== allTx completed ===');
        return out;
    }

    // Delegated click handler for delete/edit actions in transaction tables
    ['txTable', 'recentTable'].forEach(tableId => {
        const table = byId(tableId);
        if (!table) return;
        table.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button[data-act]');
            if (!btn) return;
            const tr = btn.closest('tr');
            if (!tr) return;

            // Prefer explicit dataset id (set by render logic). Fallback to matching row contents.
            let txId = tr.dataset.id;
            if (!txId) {
                const date = tr.querySelector('[data-k="date"]')?.textContent.trim() || '';
                const amountText = tr.querySelector('[data-k="amount"]')?.textContent.trim() || '';
                const amount = Number(amountText.replace(/[^\d\-]/g, '') || 0);
                const note = tr.querySelector('[data-k="note"]')?.textContent.trim() || '';
                const candidate = allTx().find(t => t.date === date && Number(t.amount) === amount && (t.note || '') === note);
                if (candidate) txId = candidate.id;
            }
            if (!txId) return; // can't resolve transaction

            const act = btn.getAttribute('data-act');
            if (act === 'del') {
                if (!confirm('Delete transaction?')) return;
                // deleteTx should remove transaction from its month bucket and save()
                try {
                    deleteTx(txId);
                } catch (err) {
                    console.error('deleteTx error', err);
                }
                renderAll && typeof renderAll === 'function' ? renderAll() : location.reload();
            } else if (act === 'edit') {
                // Optional: wire edit behavior if your code supports it.
                // If you have a function to load a tx into the form (e.g., loadTxIntoForm), call it here.
                if (typeof loadTxIntoForm === 'function') {
                    loadTxIntoForm(txId);
                } else {
                    console.info('Edit not implemented: transaction id =', txId);
                }
            }
        });
    });

    // Budgets & goals
    const budgetForm = byId('budgetForm');
    budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(budgetForm);
        const cat = (fd.get('category') || '').trim();
        const amt = Math.round(Number(fd.get('amount') || 0));
        const spent = Math.round(Number(fd.get('spent') || 0));
        const month = fd.get('month') || new Date().toISOString().slice(0, 7);
        const notes = fd.get('notes') || '';
        
        if (!cat) return;
        
        // Store budget as object with all fields
        state.budgets[cat] = {
            amount: amt,
            spent: spent,
            month: month,
            notes: notes,
            lastUpdated: new Date().toISOString()
        };
        
        if (!state.categories.includes(cat)) state.categories.push(cat);
        
        // If spent amount is provided, create an expense transaction
        if (spent > 0) {
            const expenseTx = {
                id: crypto.randomUUID(),
                type: 'expense',
                category: cat,
                amount: spent,
                date: today(),
                note: `Budget spent for ${cat}`
            };
            addTx(expenseTx);
            showToast(`Created expense transaction for ${cat}: ¥${fmt.format(spent)}`, 'info');
        }
        
        save(); 
        renderBudgets(); 
        renderAll();
        updateReportsRealTime(); // Update reports in real-time
        
        // Clear form fields after saving
        budgetForm.spent.value = '';
        budgetForm.month.value = '';
        budgetForm.notes.value = '';
    });
    byId('deleteBudget').addEventListener('click', () => {
        const cat = budgetForm.category.value.trim(); 
        if (!cat) return;
        delete state.budgets[cat]; 
        save(); 
        renderBudgets(); 
        renderAll();
        updateReportsRealTime(); // Update reports in real-time
    });

    const goalForm = byId('goalForm');
    goalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(goalForm);
        // Use new input names to avoid conflicts
        const incomeVal = fd.get('goalIncome') ?? '0';
        state.goal.income = Math.round(Number(incomeVal || 0));
        state.goal.rate = Number(fd.get('goalRate') || 0);
        save(); renderBudgets(); drawDashboard();
    });

    // Filters
    byId('clearFilters').addEventListener('click', () => { byId('filterCat').value = ''; byId('filterMonth').value = ''; renderTxTable(); });
    [byId('filterCat'), byId('filterMonth')].forEach(x => x.addEventListener('input', renderTxTable));

    // Import/Export/Wipe
    function download(name, text) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        a.download = name; a.click(); URL.revokeObjectURL(a.href);
    }
    byId('exportBtn').addEventListener('click', () => navigateToPage('settings'));
    byId('exportJson').addEventListener('click', () => download(`yen-budget-${Date.now()}.json`, JSON.stringify(state, null, 2)));
    byId('exportCsv').addEventListener('click', () => {
        const header = ['id', 'type', 'category', 'amount', 'date', 'note'];
        const rows = allTx().map(t => header.map(k => ('' + (t[k] ?? '')).replaceAll('"', '""')));
        const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        download(`yen-transactions-${Date.now()}.csv`, csv);
    });
    byId('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const text = await file.text();
        if (file.name.endsWith('.json')) {
            try { const json = JSON.parse(text); state = json; save(); renderAll(); updateReportsRealTime(); alert('Imported JSON ✔️'); }
            catch (err) { alert('Invalid JSON'); }
        } else {
            const lines = text.trim().split(/\r?\n/);
            const header = lines.shift().split(',').map(s => s.replace(/^"|"$/g, ''));
            const idx = (k) => header.indexOf(k);
            for (const line of lines) {
                const cols = line.split(',').map(s => s.replace(/^"|"$/g, '').replaceAll('""', '"'));
                const t = {
                    id: crypto.randomUUID(),
                    type: cols[idx('type')] || 'expense',
                    category: cols[idx('category')] || 'Other',
                    amount: Math.round(Number(cols[idx('amount')] || 0)),
                    date: cols[idx('date')] || today(),
                    note: cols[idx('note')] || ''
                };
                if (t.category && !state.categories.includes(t.category)) state.categories.push(t.category);
                addTx(t);
                    }
        save(); renderAll(); updateReportsRealTime(); alert('Imported CSV ✔️');
        }
        e.target.value = '';
    });
    byId('wipe').addEventListener('click', () => { if (confirm('Delete ALL data? This cannot be undone.')) { localStorage.removeItem(KEY); location.reload(); } });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Quick add transaction: Ctrl+T
        if (e.ctrlKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            byId('addQuick').click();
        }
        // Toggle theme: Ctrl+L
        if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            byId('toggleTheme').click();
        }
        // Focus category filter: Ctrl+/
        if (e.ctrlKey && (e.key === '/' || e.key === 'Divide')) {
            e.preventDefault();
            byId('filterCat').focus();
        }
    });

    // Rendering helpers - openTab replaced with navigateToPage

    function renderCategories() {
        const dl = byId('catList');
        dl.innerHTML = state.categories.map(c => `<option value="${escapeHtml(c)}">`).join('');
    }

    function renderTxTable() {
        renderCategories();
        const tbody = byId('txTable').querySelector('tbody');
        const cat = byId('filterCat').value.trim();
        const m = byId('filterMonth').value;
        let rows = allTx().slice().sort((a, b) => b.date.localeCompare(a.date));
        if (cat) rows = rows.filter(r => r.category === cat);
        if (m) rows = rows.filter(r => r.date.slice(0, 7) === m);
        fillTxTable(tbody, rows);
    }

    function fillTxTable(tbody, rows) {
        tbody.innerHTML = '';
        for (const t of rows) {
            const tr = rowFromTemplate('rowTx');
            tr.dataset.id = t.id;
            
                    // Add appropriate class for transaction type styling
        if (t.type === 'income') {
            tr.classList.add('income-row');
        } else {
            tr.classList.add('expense-row');
        }
            
            tr.querySelector('[data-k="date"]').textContent = t.date;
            tr.querySelector('[data-k="type"]').innerHTML = t.type === 'expense' ? '<span class="chip danger">Expense</span>' : '<span class="chip ok">Income</span>';
            tr.querySelector('[data-k="category"]').textContent = t.category;
            tr.querySelector('[data-k="note"]').textContent = t.note || '';
            tr.querySelector('[data-k="amount"]').textContent = (t.type === 'expense' ? '-' : '+') + fmt.format(t.amount);
            tr.querySelector('[data-act="edit"]').addEventListener('click', () => editTx(t));
            tr.querySelector('[data-act="del"]').addEventListener('click', () => { if (confirm('Delete this transaction?')) { deleteTx(t.id); renderAll(); } });
            tbody.appendChild(tr);
        }
    }

    function editTx(t) {
        navigateToPage('transactions');
        txForm.type.value = t.type;
        txForm.category.value = t.category;
        txForm.amount.value = t.amount;
        txForm.date.value = t.date;
        txForm.note.value = t.note || '';
        txForm.recurring.value = t.recurring || 'none';
        txForm.next.value = t.next || '';
        const onSubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(txForm);
            const patch = {
                type: fd.get('type'),
                category: (fd.get('category') || '').trim() || 'Other',
                amount: Math.round(Number(fd.get('amount') || 0)),
                date: fd.get('date') || today(),
                note: (fd.get('note') || '').trim(),
                recurring: fd.get('recurring') || 'none',
                next: fd.get('next') || null
            };
            updateTx(t.id, patch);
            txForm.removeEventListener('submit', onSubmit);
            txForm.reset(); resetTxForm(); renderAll();
        };
        txForm.addEventListener('submit', onSubmit, { once: true });
    }

    function renderBudgets() {
        const tableBody = byId('budgetTableBody');
        const summaryDiv = byId('budgetSummary');
        
        if (!tableBody) return;
        
        // Set current month in budget form
        const budgetMonthInput = byId('budgetMonthInput');
        if (budgetMonthInput) {
            budgetMonthInput.value = new Date().toISOString().slice(0, 7);
        }

        // Add real-time budget preview functionality
        setupBudgetPreview();
        
        tableBody.innerHTML = '';
        
        let totalBudget = 0;
        let totalSpent = 0;
        let totalSavings = 0;
        
        Object.entries(state.budgets).forEach(([cat, budgetData]) => {
            // Handle both old format (number) and new format (object)
            const budgetAmount = typeof budgetData === 'object' ? budgetData.amount : budgetData;
            const spentAmount = typeof budgetData === 'object' ? budgetData.spent : 0;
            
            const remaining = budgetAmount - spentAmount;
            const savings = remaining > 0 ? remaining : 0;
            const status = getBudgetStatus(budgetAmount, spentAmount);
            
            totalBudget += budgetAmount;
            totalSpent += spentAmount;
            totalSavings += savings;
            
            const row = document.createElement('tr');
            const budgetMonth = typeof budgetData === 'object' && budgetData.month ? budgetData.month : '';
            const budgetNotes = typeof budgetData === 'object' && budgetData.notes ? budgetData.notes : '';
            const lastUpdated = typeof budgetData === 'object' && budgetData.lastUpdated ? new Date(budgetData.lastUpdated).toLocaleDateString() : '';
            
            row.innerHTML = `
                <td><strong>${escapeHtml(cat)}</strong></td>
                <td class="text-primary">${fmt.format(budgetAmount)}</td>
                <td class="text-danger">${fmt.format(spentAmount)}</td>
                <td class="${remaining >= 0 ? 'text-success' : 'text-danger'}">${fmt.format(remaining)}</td>
                <td class="text-success">${fmt.format(savings)}</td>
                <td>
                    <span class="badge status-badge ${getStatusClass(status.color)}">${status.text}</span>
                </td>
                <td style="color: var(--text-secondary);">${budgetMonth || 'Current'}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm update-spent-btn" data-cat="${escapeHtml(cat)}" title="Edit Budget">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm delete-budget-btn" data-cat="${escapeHtml(cat)}" title="Delete Budget">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add tooltip for additional budget info if available
            if (budgetMonth || budgetNotes || lastUpdated) {
                let tooltipText = '';
                if (budgetMonth) tooltipText += `Month: ${budgetMonth}\n`;
                if (budgetNotes) tooltipText += `Notes: ${budgetNotes}\n`;
                if (lastUpdated) tooltipText += `Last Updated: ${lastUpdated}`;
                
                if (tooltipText) {
                    row.setAttribute('data-bs-toggle', 'tooltip');
                    row.setAttribute('data-bs-placement', 'top');
                    row.setAttribute('title', tooltipText.trim());
                }
            }
            tableBody.appendChild(row);
        });
        
        // Render budget summary
        if (Object.keys(state.budgets).length > 0) {
            const progressPercent = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
            const progressColor = totalSpent > totalBudget ? 'danger' : totalSpent > totalBudget * 0.8 ? 'warning' : 'success';
            
            summaryDiv.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Budget Summary</h5>
                        <div class="row g-3 mb-3">
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="h4 text-primary mb-1">${fmt.format(totalBudget)}</div>
                                    <small style="color: var(--text-secondary);">Total Budget</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="h4 text-danger mb-1">${fmt.format(totalSpent)}</div>
                                    <small style="color: var(--text-secondary);">Total Spent</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="h4 text-success mb-1">${fmt.format(totalSavings)}</div>
                                    <small style="color: var(--text-secondary);">Total Savings</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="h4 text-${progressColor} mb-1">${Math.round(progressPercent)}%</div>
                                    <small style="color: var(--text-secondary);">Usage</small>
                                </div>
                            </div>
                        </div>
                        <div class="progress mb-3" style="height: 10px;">
                            <div class="progress-bar bg-${progressColor}" role="progressbar" 
                                 style="width: ${progressPercent}%" 
                                 aria-valuenow="${progressPercent}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                        </div>
                        <div class="text-center">
                            <small style="color: var(--text-secondary);">
                                ${totalSavings > 0 ? 
                                    `🎉 You've saved ¥${fmt.format(totalSavings)} from your budgets this month!` : 
                                    totalSpent > totalBudget ? 
                                        `⚠️ You're ¥${fmt.format(totalSpent - totalBudget)} over budget` :
                                        `📊 Budget tracking active`
                                }
                            </small>
                        </div>
                    </div>
                </div>
            `;
        } else {
            summaryDiv.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-chart-pie fa-3x mb-3" style="color: var(--text-secondary);"></i>
                    <h5 style="color: var(--text-secondary);">No Budgets Set</h5>
                    <p style="color: var(--text-secondary);">Set your first budget to start tracking your spending and savings.</p>
                </div>
            `;
        }
        
        // Attach event handlers
        attachBudgetEventHandlers();
    }
    
    // Helper function to get budget status
    function getBudgetStatus(budget, spent) {
        if (spent === 0) {
            return { text: 'Not Started', color: 'secondary' };
        } else if (spent >= budget) {
            return { text: 'Over Budget', color: 'danger' };
        } else if (spent >= budget * 0.8) {
            return { text: 'Warning', color: 'warning' };
        } else {
            return { text: 'On Track', color: 'success' };
        }
    }
    
    // Helper function to convert Bootstrap color names to custom CSS classes
    function getStatusClass(bootstrapColor) {
        const colorMap = {
            'secondary': 'secondary',
            'danger': 'over-budget',
            'warning': 'at-budget',
            'success': 'under-budget',
            'info': 'excellent'
        };
        return colorMap[bootstrapColor] || 'secondary';
    }
    
    // Calculate total budget savings
    function calculateBudgetSavings() {
        let totalSavings = 0;
        
        Object.entries(state.budgets).forEach(([cat, budgetData]) => {
            const budgetAmount = typeof budgetData === 'object' ? budgetData.amount : budgetData;
            const spentAmount = typeof budgetData === 'object' ? budgetData.spent : 0;
            const remaining = budgetAmount - spentAmount;
            
            if (remaining > 0) {
                totalSavings += remaining;
            }
        });
        
        return totalSavings;
    }
    
    // Attach budget event handlers
    function attachBudgetEventHandlers() {
        // Delete budget handlers
        els('.delete-budget-btn', byId('budgetTableBody')).forEach(btn => {
            btn.onclick = function() {
                const cat = this.getAttribute('data-cat');
                if (confirm(`Delete budget for "${cat}"?`)) {
                    delete state.budgets[cat];
                    save();
                    renderBudgets();
                    renderAll();
                    updateReportsRealTime(); // Update reports in real-time
                }
            };
        });
        
        // Update spent amount handlers
        els('.update-spent-btn', byId('budgetTableBody')).forEach(btn => {
            btn.onclick = function() {
                const cat = this.getAttribute('data-cat');
                const budgetData = state.budgets[cat];
                const currentAmount = typeof budgetData === 'object' ? budgetData.amount : budgetData;
                const currentSpent = typeof budgetData === 'object' ? budgetData.spent : 0;
                
                // Create a comprehensive budget editing modal with color grading
                const editModal = document.createElement('div');
                editModal.className = 'modal fade';
                editModal.id = 'budgetEditModal';
                editModal.innerHTML = `
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title" style="color: var(--text-inverse);">
                                    <i class="fas fa-edit me-2"></i>
                                    Edit Budget: ${escapeHtml(cat)}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Budget Status Overview -->
                                <div class="budget-status-overview mb-4 p-3 rounded" style="background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%); border: 1px solid var(--border-primary);">
                                    <div class="row g-3">
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <div class="h5 text-primary mb-1">¥${currentAmount.toLocaleString()}</div>
                                                <small class="text-muted">Budget Amount</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <div class="h5 text-danger mb-1">¥${currentSpent.toLocaleString()}</div>
                                                <small class="text-muted">Amount Spent</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <div class="h5 text-${currentAmount - currentSpent >= 0 ? 'success' : 'danger'} mb-1">¥${Math.abs(currentAmount - currentSpent).toLocaleString()}</div>
                                                <small class="text-muted">${currentAmount - currentSpent >= 0 ? 'Remaining' : 'Over Budget'}</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <div class="h5 text-${getBudgetStatusColor(currentAmount, currentSpent)} mb-1">${Math.round((currentSpent / currentAmount) * 100)}%</div>
                                                <small class="text-muted">Usage</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Progress Bar with Color Grading -->
                                    <div class="mt-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <small class="text-muted">Budget Progress</small>
                                            <small class="text-muted">${currentSpent.toLocaleString()} / ${currentAmount.toLocaleString()}</small>
                                        </div>
                                        <div class="progress" style="height: 12px; border-radius: 6px;">
                                            <div class="progress-bar ${getProgressBarClass(currentAmount, currentSpent)}" 
                                                 role="progressbar" 
                                                 style="width: ${Math.min((currentSpent / currentAmount) * 100, 100)}%; border-radius: 6px;"
                                                 aria-valuenow="${Math.min((currentSpent / currentAmount) * 100, 100)}" 
                                                 aria-valuemin="0" 
                                                 aria-valuemax="100">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <form id="budgetEditForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="editBudgetAmount" class="form-label" style="color: var(--text-primary);">
                                                <i class="fas fa-wallet me-2" style="color: var(--accent-primary);"></i>
                                                Budget Amount (¥)
                                            </label>
                                            <input type="number" class="form-control form-control-lg" id="editBudgetAmount" value="${currentAmount}" min="0" step="1" required>
                                            <div class="form-text" style="color: var(--text-secondary);">
                                                <i class="fas fa-info-circle me-1" style="color: var(--accent-info);"></i>
                                                Set your monthly budget limit
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="editBudgetSpent" class="form-label" style="color: var(--text-primary);">
                                                <i class="fas fa-receipt me-2" style="color: var(--accent-danger);"></i>
                                                Amount Spent (¥)
                                            </label>
                                            <input type="number" class="form-control form-control-lg" id="editBudgetSpent" value="${currentSpent}" min="0" step="1" required>
                                            <div class="form-text" style="color: var(--text-secondary);">
                                                <i class="fas fa-info-circle me-1" style="color: var(--accent-info);"></i>
                                                Current spending amount
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="editBudgetMonth" class="form-label" style="color: var(--text-primary);">
                                                <i class="fas fa-calendar me-2" style="color: var(--accent-info);"></i>
                                                Budget Month
                                            </label>
                                            <input type="month" class="form-control" id="editBudgetMonth" value="${new Date().toISOString().slice(0, 7)}">
                                            <div class="form-text" style="color: var(--text-secondary);">
                                                <i class="fas fa-info-circle me-1" style="color: var(--accent-info);"></i>
                                                Month for this budget
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="editBudgetNotes" class="form-label" style="color: var(--text-primary);">
                                                <i class="fas fa-sticky-note me-2" style="color: var(--accent-warning);"></i>
                                                Notes (Optional)
                                            </label>
                                            <textarea class="form-control" id="editBudgetNotes" rows="2" placeholder="Add any notes about this budget..."></textarea>
                                            <div class="form-text" style="color: var(--text-secondary);">
                                                <i class="fas fa-info-circle me-1" style="color: var(--accent-info);"></i>
                                                Additional information
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer bg-light">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" style="color: var(--text-primary);">
                                    <i class="fas fa-times me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-primary btn-lg" id="saveBudgetChanges" style="color: var(--text-inverse);">
                                    <i class="fas fa-save me-2"></i>Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add modal to body
                document.body.appendChild(editModal);
                
                // Show modal
                const modal = new bootstrap.Modal(editModal);
                modal.show();
                
                // Handle save button
                document.getElementById('saveBudgetChanges').onclick = function() {
                    const newAmount = Math.round(Number(document.getElementById('editBudgetAmount').value) || 0);
                    const newSpent = Math.round(Number(document.getElementById('editBudgetSpent').value) || 0);
                    const newMonth = document.getElementById('editBudgetMonth').value;
                    const newNotes = document.getElementById('editBudgetNotes').value;
                    
                    if (newAmount < 0 || newSpent < 0) {
                        showToast('Amounts cannot be negative', 'error');
                        return;
                    }
                    
                    // Calculate the difference in spent amount
                    const spentDifference = newSpent - currentSpent;
                    
                    // Update the budget data with all fields
                    state.budgets[cat] = {
                        amount: newAmount,
                        spent: newSpent,
                        month: newMonth,
                        notes: newNotes,
                        lastUpdated: new Date().toISOString()
                    };
                    
                    // If spent amount increased, create an expense transaction for the difference
                    if (spentDifference > 0) {
                        const expenseTx = {
                            id: crypto.randomUUID(),
                            type: 'expense',
                            category: cat,
                            amount: spentDifference,
                            date: today(),
                            note: `Budget spent update for ${cat}`
                        };
                        addTx(expenseTx);
                        showToast(`Created expense transaction for ${cat}: ¥${fmt.format(spentDifference)}`, 'info');
                    }
                    
                    save();
                    renderBudgets();
                    renderAll();
                    updateReportsRealTime();
                    
                    // Show feedback
                    const remaining = newAmount - newSpent;
                    if (remaining > 0) {
                        showToast(`Updated ${cat} budget. You've saved ¥${fmt.format(remaining)}!`, 'success');
                    } else if (remaining < 0) {
                        showToast(`Updated ${cat} budget. You're ¥${fmt.format(-remaining)} over budget.`, 'warning');
                    } else {
                        showToast(`Updated ${cat} budget. Budget fully used.`, 'info');
                    }
                    
                    // Close modal
                    modal.hide();
                    
                    // Remove modal from DOM
                    setTimeout(() => {
                        document.body.removeChild(editModal);
                    }, 300);
                };
                
                // Clean up modal when hidden
                editModal.addEventListener('hidden.bs.modal', function() {
                    setTimeout(() => {
                        if (document.body.contains(editModal)) {
                            document.body.removeChild(editModal);
                        }
                    }, 300);
                });
            };
        });
    }

    function drawDashboard() {
        const month = ym(new Date());
        byId('monthTag').textContent = monthName(month).split(' ')[1]; // Show only month name
        const { income, expense, savings } = totalsForMonth(month);
        const kpiEl = byId('kpis');
        const remainingDays = daysRemainingInMonth();
        const dailyBurn = expense / (new Date().getDate());
        const budgetTotal = sum(Object.values(state.budgets));
        const targetSave = Math.round((state.goal.income || 0) * (state.goal.rate || 0) / 100);
        const saveRate = income ? Math.round((savings / income) * 100) : 0;
        
        // Update reports in real-time if on reports page
        if (isReportsPage()) {
            updateReportsRealTime();
        }
        


        kpiEl.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon income">
            <i class="fas fa-arrow-trend-up"></i>
          </div>
          <div class="kpi-content">
            <h4 class="kpi-title">Total Income</h4>
            <div class="kpi-value">${fmt.format(income)}</div>
            <div class="kpi-subtitle">This month</div>
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon expense">
            <i class="fas fa-arrow-trend-down"></i>
          </div>
          <div class="kpi-content">
            <h4 class="kpi-title">Total Expenses</h4>
            <div class="kpi-value">${fmt.format(expense)}</div>
            <div class="kpi-subtitle">This month</div>
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon savings">
            <i class="fas fa-piggy-bank"></i>
          </div>
          <div class="kpi-content">
            <h4 class="kpi-title">Net Savings</h4>
            <div class="kpi-value">${fmt.format(savings)}</div>
            <div class="kpi-subtitle">${saveRate}% of income</div>
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon warning">
            <i class="fas fa-fire"></i>
          </div>
          <div class="kpi-content">
            <h4 class="kpi-title">Daily Burn Rate</h4>
            <div class="kpi-value">${fmt.format(Math.round(dailyBurn || 0))}</div>
            <div class="kpi-subtitle">${remainingDays} days left</div>
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon savings">
            <i class="fas fa-coins"></i>
          </div>
          <div class="kpi-content">
            <h4 class="kpi-title">Budget Savings</h4>
            <div class="kpi-value" id="budgetSavingsValue">${fmt.format(calculateBudgetSavings())}</div>
            <div class="kpi-subtitle">From budgets</div>
          </div>
        </div>
      </div>
    `;

        const recTbody = byId('recentTable').querySelector('tbody');
        const recent = allTx().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        fillTxTable(recTbody, recent);

        // Update overview metrics
        updateOverviewMetrics(month);
        
        // Generate insights
        generateInsights(month);
        
        // Update top categories
        updateTopCategories(month);

        // Budget pie
        const spend = categorySpend(month);
        const labels = Object.keys(spend);
        const data = labels.map(k => spend[k]);
        if (window.Chart) pieChart('budgetPie', labels, data);

        const sumEl = byId('budgetSummary');
        sumEl.innerHTML = '';
        const totalSpent = sum(data);
        const totalBudget = sum(Object.values(state.budgets).map(b => typeof b === 'object' ? b.amount : b));
        const totalBudgetSpent = sum(Object.values(state.budgets).map(b => typeof b === 'object' ? b.spent : 0));
        const rem = totalBudget - totalBudgetSpent;
        const progressPercent = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
        const progressColor = rem < 0 ? 'danger' : rem < totalBudget * 0.2 ? 'warning' : 'success';
        
        sumEl.innerHTML = `
            <div class="budget-summary">
                <div class="row g-3">
                    <div class="col-6">
                        <div class="budget-stat">
                            <div class="stat-label">Total Budget</div>
                            <div class="stat-value text-primary">${fmt.format(totalBudget)}</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="budget-stat">
                            <div class="stat-label">Spent</div>
                            <div class="stat-value text-danger">${fmt.format(totalSpent)}</div>
                        </div>
                    </div>
                </div>
                
                ${totalBudget ? `
                <div class="budget-progress mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">Budget Usage</small>
                        <small class="text-muted">${Math.round(progressPercent)}%</small>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-${progressColor}" role="progressbar" 
                             style="width: ${progressPercent}%" 
                             aria-valuenow="${progressPercent}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                </div>
                
                <div class="budget-status mt-3">
                    ${rem < 0 ? 
                        `<div class="alert alert-danger py-2 mb-0">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Over budget by ${fmt.format(-rem)}
                        </div>` : 
                        `<div class="alert alert-${rem < totalBudget * 0.2 ? 'warning' : 'success'} py-2 mb-0">
                            <i class="fas fa-${rem < totalBudget * 0.2 ? 'exclamation-circle' : 'check-circle'} me-2"></i>
                            ${fmt.format(rem)} remaining
                        </div>`
                    }
                </div>
                ` : `
                <div class="alert alert-info py-2 mb-0 mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    No budget set for this month
                </div>
                `}
            </div>
        `;

        if (window.Chart) {
            const months = lastNMonths(6).reverse();
            const inc = months.map(m => totalsForMonth(m).income);
            const exp = months.map(m => totalsForMonth(m).expense);
            lineChart('trendChart', months.map(m => m.replace('-', '/')), inc, exp);
        }
        
        // Update last updated timestamp
        updateLastUpdated();
        
        // Setup overview period selector event handler
        setupOverviewPeriodHandler();
    }
    
    function setupOverviewPeriodHandler() {
        const periodSelect = byId('overviewPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', function() {
                const selectedPeriod = this.value;
                const currentMonth = ym(new Date());
                let targetMonth = currentMonth;
                
                switch (selectedPeriod) {
                    case 'previous':
                        targetMonth = getPreviousMonth(currentMonth);
                        break;
                    case 'quarter':
                        // For quarter, we'll show current month but could expand to show quarterly data
                        targetMonth = currentMonth;
                        break;
                    default:
                        targetMonth = currentMonth;
                }
                
                // Update overview metrics for selected period
                updateOverviewMetrics(targetMonth);
                
                // Add visual feedback
                const card = periodSelect.closest('.financial-overview');
                if (card) {
                    card.style.animation = 'none';
                    card.offsetHeight; // Trigger reflow
                    card.style.animation = 'pulse 0.6s ease-in-out';
                }
            });
        }
    }

    function renderReports() {
        console.log('renderReports called, isReportsPage:', isReportsPage());
        if (!isReportsPage()) {
            console.log('Not on reports page, returning early');
            return;
        }
        
        // Check if reports section is visible
        const reportsSection = byId('reports');
        if (!reportsSection || reportsSection.classList.contains('hidden')) {
            console.log('Reports section is not visible or hidden, returning early');
            return;
        }
        
        console.log('Reports section is visible, rendering reports...');
        
        // Wait a bit more for DOM to be fully ready
        setTimeout(() => {
            try {
                console.log('Starting reports rendering...');
                renderBudgetVsActual();
                renderCategoryBreakdown();
                renderSavingsTrend();
                renderIncomeExpenseTrend();
                renderCategoryPerformance();
                generateFinancialInsights();
                renderHistoricalData();
                renderProjections();
                
                // Setup monthly export functionality
                        renderMonthlyDataTable();
        setupMonthlyDataTableListeners();
                
                console.log('Reports rendering completed');
            } catch (error) {
                console.error('Error rendering reports:', error);
            }
        }, 200);
    }

    // Real-time update function for reports
    function updateReportsRealTime() {
        console.log('updateReportsRealTime called, isReportsPage:', isReportsPage());
        if (isReportsPage()) {
            // Check if reports section is visible
            const reportsSection = byId('reports');
            if (reportsSection && !reportsSection.classList.contains('hidden')) {
                console.log('Reports section is visible, updating reports');
                // Update monthly data table in real-time
                renderMonthlyDataTable();
                // Also call global refresh function
                if (window.refreshMonthlyDataTable) {
                    window.refreshMonthlyDataTable();
                }
                // Add a small delay to ensure DOM is ready for other reports
                setTimeout(() => renderReports(), 100);
            } else {
                console.log('Reports section is not visible or hidden');
            }
        }
    }

    // Helper function to check if reports page is active
    function isReportsPage() {
        const isReports = window.location.hash === '#reports';
        console.log('isReportsPage check:', { hash: window.location.hash, isReports });
        return isReports;
    }

    // Enhanced Reports Functions



    function renderBudgetVsActual() {
        const tbody = byId('budgetVsActualBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.entries(state.budgets).forEach(([category, budget]) => {
            const actualSpent = budget.spent || 0;
            const variance = budget.amount - actualSpent;
            const percentUsed = budget.amount > 0 ? ((actualSpent / budget.amount) * 100).toFixed(1) : 0;
            
            let status = 'under-budget';
            let statusText = 'Under Budget';
            let statusClass = 'status-badge under-budget';
            
            if (percentUsed >= 100) {
                status = 'over-budget';
                statusText = 'Over Budget';
                statusClass = 'status-badge over-budget';
            } else if (percentUsed >= 80) {
                status = 'at-budget';
                statusText = 'At Budget';
                statusClass = 'status-badge at-budget';
            } else if (percentUsed <= 50) {
                status = 'excellent';
                statusText = 'Excellent';
                statusClass = 'status-badge excellent';
            }
            
            const trend = getBudgetTrend(category);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${category}</strong></td>
                <td>¥${budget.amount.toLocaleString()}</td>
                <td>¥${actualSpent.toLocaleString()}</td>
                <td class="${variance >= 0 ? 'text-success' : 'text-danger'}">
                    ${variance >= 0 ? '+' : ''}¥${variance.toLocaleString()}
                </td>
                <td>${percentUsed}%</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${trend}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function getBudgetTrend(category) {
        // This would analyze historical data to show trends
        // For now, return a simple indicator
        const budget = state.budgets[category];
        if (!budget || !budget.spent) return '📊 New';
        
        const usage = (budget.spent / budget.amount) * 100;
        if (usage < 30) return '📈 Low Usage';
        if (usage < 70) return '📊 Normal';
        if (usage < 90) return '⚠️ High Usage';
        return '🚨 Critical';
    }

    // Helper function to get budget status color for display
    function getBudgetStatusColor(budget, spent) {
        if (budget === 0) return 'secondary';
        const percentage = (spent / budget) * 100;
        if (percentage >= 100) return 'danger';
        if (percentage >= 80) return 'warning';
        if (percentage <= 50) return 'success';
        return 'info';
    }

    // Helper function to get progress bar class
    function getProgressBarClass(budget, spent) {
        if (budget === 0) return 'bg-secondary';
        const percentage = (spent / budget) * 100;
        if (percentage >= 100) return 'bg-danger';
        if (percentage >= 80) return 'bg-warning';
        if (percentage <= 50) return 'bg-success';
        return 'bg-info';
    }

    // Setup budget preview functionality
    function setupBudgetPreview() {
        const budgetForm = byId('budgetForm');
        const budgetPreview = byId('budgetPreview');
        const previewAmount = byId('previewAmount');
        const previewSpent = byId('previewSpent');
        const previewProgress = byId('previewProgress');
        const previewPercentage = byId('previewPercentage');

        if (!budgetForm || !budgetPreview) return;

        // Show preview when form has values
        const showPreview = () => {
            const formData = new FormData(budgetForm);
            const amount = Number(formData.get('amount') || 0);
            const spent = Number(formData.get('spent') || 0);

            if (amount > 0) {
                budgetPreview.style.display = 'block';
                previewAmount.textContent = `¥${amount.toLocaleString()}`;
                previewSpent.textContent = `¥${spent.toLocaleString()}`;

                const percentage = Math.min((spent / amount) * 100, 100);
                previewProgress.style.width = `${percentage}%`;
                previewProgress.className = `progress-bar ${getProgressBarClass(amount, spent)}`;
                previewPercentage.textContent = `${Math.round(percentage)}%`;

                // Update progress bar color based on usage
                if (percentage >= 100) {
                    previewProgress.className = 'progress-bar bg-danger';
                } else if (percentage >= 80) {
                    previewProgress.className = 'progress-bar bg-warning';
                } else if (percentage <= 50) {
                    previewProgress.className = 'progress-bar bg-success';
                } else {
                    previewProgress.className = 'progress-bar bg-info';
                }
            } else {
                budgetPreview.style.display = 'none';
            }
        };

        // Add event listeners for real-time updates
        budgetForm.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', showPreview);
            input.addEventListener('change', showPreview);
        });

        // Initial preview
        showPreview();
    }

    function renderCategoryBreakdown() {
        const canvas = byId('categoryPie');
        if (!canvas) return;
        
        const period = byId('categoryBreakdownPeriod')?.value || 'current';
        const data = getCategoryDataForPeriod(period);
        
        if (window.categoryPieChart) {
            window.categoryPieChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.categoryPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: generateColors(data.labels.length),
                    borderWidth: 3,
                    borderColor: getThemeVariable('--bg-card'),
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getThemeVariable('--text-primary'),
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: getThemeVariable('--bg-card'),
                        titleColor: getThemeVariable('--text-primary'),
                        bodyColor: getThemeVariable('--text-primary'),
                        borderColor: getThemeVariable('--border-primary'),
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ¥${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                elements: {
                    arc: {
                        borderWidth: 3
                    }
                }
            }
        });
    }

    function getCategoryDataForPeriod(period) {
        let transactions = allTx();
        const now = new Date();
        
        switch (period) {
            case 'last3':
                const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= threeMonthsAgo);
                break;
            case 'last6':
                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= sixMonthsAgo);
                break;
            case 'year':
                const yearStart = new Date(now.getFullYear(), 0, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= yearStart);
                break;
            default: // current month
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= monthStart);
        }
        
        const categoryTotals = {};
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
            }
        });
        
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8); // Top 8 categories
        
        return {
            labels: sortedCategories.map(([category]) => category),
            values: sortedCategories.map(([, amount]) => amount)
        };
    }

    function renderSavingsTrend() {
        const canvas = byId('savingsBar');
        if (!canvas) return;
        
        const period = parseInt(byId('savingsTrendPeriod')?.value || 6);
        const data = getSavingsDataForPeriod(period);
        
        if (window.savingsBarChart) {
            window.savingsBarChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.savingsBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                label: 'Monthly Savings',
                datasets: [{
                    label: 'Monthly Savings',
                    data: data.values,
                    backgroundColor: data.values.map(value => 
                        value >= 0 ? getThemeVariable('--accent-success') + 'DD' : getThemeVariable('--accent-danger') + 'DD'
                    ),
                    borderColor: data.values.map(value => 
                        value >= 0 ? getThemeVariable('--accent-success') : getThemeVariable('--accent-danger')
                    ),
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getThemeVariable('--border-primary') + '40',
                            borderColor: getThemeVariable('--border-primary') + '60'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: getThemeVariable('--border-primary') + '40',
                            borderColor: getThemeVariable('--border-primary') + '60'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: getThemeVariable('--bg-card'),
                        titleColor: getThemeVariable('--text-primary'),
                        bodyColor: getThemeVariable('--text-primary'),
                        borderColor: getThemeVariable('--border-primary'),
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return 'Savings: ¥' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    function getSavingsDataForPeriod(months) {
        const data = [];
        const labels = [];
        const now = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthTransactions = allTx().filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= monthStart && txDate <= monthEnd;
            });
            
            const income = monthTransactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            const expenses = monthTransactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            const savings = income - expenses;
            
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            data.push(savings);
        }
        
        return { labels, values: data };
    }

    function renderIncomeExpenseTrend() {
        const canvas = byId('incomeExpenseTrend');
        if (!canvas) return;
        
        const period = document.querySelector('[data-period].active')?.dataset.period || '6m';
        const data = getIncomeExpenseDataForPeriod(period);
        
        if (window.incomeExpenseChart) {
            window.incomeExpenseChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.incomeExpenseChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: data.income,
                        borderColor: getThemeVariable('--accent-success'),
                        backgroundColor: getThemeVariable('--accent-success') + '30',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: getThemeVariable('--accent-success'),
                        pointBorderColor: getThemeVariable('--bg-card'),
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Expenses',
                        data: data.expenses,
                        borderColor: getThemeVariable('--accent-danger'),
                        backgroundColor: getThemeVariable('--accent-danger') + '30',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: getThemeVariable('--accent-danger'),
                        pointBorderColor: getThemeVariable('--bg-card'),
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getThemeVariable('--border-primary') + '40',
                            borderColor: getThemeVariable('--border-primary') + '60'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: getThemeVariable('--border-primary') + '40',
                            borderColor: getThemeVariable('--border-primary') + '60'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: getThemeVariable('--text-primary'),
                            usePointStyle: true,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: getThemeVariable('--bg-card'),
                        titleColor: getThemeVariable('--text-primary'),
                        bodyColor: getThemeVariable('--text-primary'),
                        borderColor: getThemeVariable('--border-primary'),
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ¥' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    function getIncomeExpenseDataForPeriod(period) {
        let months = 6;
        switch (period) {
            case '1y': months = 12; break;
            case '2y': months = 24; break;
        }
        
        const data = { labels: [], income: [], expenses: [] };
        const now = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthTransactions = allTx().filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= monthStart && txDate <= monthEnd;
            });
        
            const income = monthTransactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            const expenses = monthTransactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            data.labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            data.income.push(income);
            data.expenses.push(expenses);
        }
        
        return data;
    }

    function renderCategoryPerformance() {
        renderTopSpendingCategories();
        renderTopSavingCategories();
    }

    function renderTopSpendingCategories() {
        const container = byId('topSpendingCategories');
        if (!container) return;
        
        const spendingByCategory = {};
        allTx().forEach(tx => {
            if (tx.type === 'expense') {
                spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + tx.amount;
            }
        });
        
        const topSpending = Object.entries(spendingByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        const totalSpending = topSpending.reduce((sum, [, amount]) => sum + amount, 0);
        
        container.innerHTML = topSpending.map(([category, amount]) => {
            const percentage = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : 0;
            return `
                <div class="category-performance-item spending">
                    <div>
                        <div class="category-name">${category}</div>
                        <div class="category-percentage">${percentage}% of total spending</div>
                    </div>
                    <div class="category-amount">¥${amount.toLocaleString()}</div>
                </div>
            `;
        }).join('');
    }

    function renderTopSavingCategories() {
        const container = byId('topSavingCategories');
        if (!container) return;
        
        const savingsByCategory = {};
        Object.entries(state.budgets).forEach(([category, budget]) => {
            if (budget.amount > 0 && budget.spent > 0) {
                const savings = budget.amount - budget.spent;
                if (savings > 0) {
                    savingsByCategory[category] = savings;
                }
            }
        });
        
        const topSavings = Object.entries(savingsByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        container.innerHTML = topSavings.map(([category, savings]) => {
            return `
                <div class="category-performance-item saving">
                    <div>
                        <div class="category-name">${category}</div>
                        <div class="category-percentage">Budget savings</div>
                    </div>
                    <div class="category-amount">¥${savings.toLocaleString()}</div>
                </div>
            `;
        }).join('');
    }

    function generateFinancialInsights() {
        const container = byId('financialInsights');
        if (!container) return;
        
        const insights = [];
        const totalIncome = allTx().filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = allTx().filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
        const netSavings = totalIncome - totalExpenses;
        
        // Savings rate insight
        if (totalIncome > 0) {
            const savingsRate = (netSavings / totalIncome) * 100;
            if (savingsRate >= 20) {
                insights.push({
                    type: 'positive',
                    title: 'Excellent Savings Rate!',
                    description: `You're saving ${savingsRate.toFixed(1)}% of your income, which is above the recommended 20%.`,
                    action: 'Keep up the great work!'
                });
                            } else if (savingsRate >= 10) {
                    insights.push({
                        type: 'warning',
                        title: 'Good Savings Rate',
                        description: `You're saving ${savingsRate.toFixed(1)}% of your income. Consider increasing to 20% for better financial security.`,
                        action: 'Review your budget to find additional savings opportunities.'
                    });
                } else if (savingsRate >= 0) {
                    insights.push({
                        type: 'warning',
                        title: 'Low Savings Rate',
                        description: `You're saving ${savingsRate.toFixed(1)}% of your income. This might not be enough for emergencies or future goals.`,
                        action: 'Identify non-essential expenses you can reduce.'
                    });
                } else {
                    insights.push({
                        type: 'negative',
                        title: 'Negative Savings',
                        description: `You're spending more than you earn. This is not sustainable long-term.`,
                        action: 'Immediately review your expenses and create a strict budget.'
                    });
                }
        }
        
        // Budget insights
        Object.entries(state.budgets).forEach(([category, budget]) => {
            if (budget.amount > 0 && budget.spent > 0) {
                const usage = (budget.spent / budget.amount) * 100;
                if (usage > 100) {
                    insights.push({
                        type: 'negative',
                        title: `Over Budget: ${category}`,
                        description: `You've exceeded your ${category} budget by ${((usage - 100) * budget.amount / 100).toFixed(0)}%.`,
                        action: 'Review your spending in this category and adjust your budget if necessary.'
                    });
                } else if (usage > 80) {
                    insights.push({
                        type: 'warning',
                        title: `Approaching Budget Limit: ${category}`,
                        description: `You've used ${usage.toFixed(1)}% of your ${category} budget.`,
                        action: 'Monitor your spending closely this month.'
                    });
                }
            }
        });
        
        // Spending pattern insights
        const categorySpending = {};
        allTx().forEach(tx => {
            if (tx.type === 'expense') {
                categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
            }
        });
        
        const topCategory = Object.entries(categorySpending)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topCategory) {
            const [category, amount] = topCategory;
            const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
            
            if (percentage > 30) {
                insights.push({
                    type: 'warning',
                    title: `High Concentration: ${category}`,
                    description: `${category} represents ${percentage}% of your total expenses. Consider diversifying your spending.`,
                    action: 'Look for ways to reduce spending in this category or increase income.'
                });
            }
        }
        
        // Render insights
        container.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
                <div class="insight-action">💡 ${insight.action}</div>
            </div>
        `).join('');
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="insight-item positive">
                    <div class="insight-title">Great Financial Health!</div>
                    <div class="insight-description">Your financial data looks healthy with no immediate concerns.</div>
                    <div class="insight-action">💡 Continue monitoring your finances regularly.</div>
                </div>
            `;
        }
    }

    function renderHistoricalData() {
        const tbody = byId('historicalDataBody');
        if (!tbody) return;
        
        const range = byId('historicalRange')?.value || '3m';
        const dataType = byId('historicalDataType')?.value || 'all';
        
        let transactions = allTx();
        const now = new Date();
        
        // Filter by date range
        switch (range) {
            case '3m':
                const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= threeMonthsAgo);
                break;
            case '6m':
                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= sixMonthsAgo);
                break;
            case '1y':
                const yearStart = new Date(now.getFullYear(), 0, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= yearStart);
                break;
            case '2y':
                const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
                transactions = transactions.filter(tx => new Date(tx.date) >= twoYearsAgo);
                break;
        }
        
        // Filter by data type
        switch (dataType) {
            case 'income':
                transactions = transactions.filter(tx => tx.type === 'income');
                break;
            case 'expenses':
                transactions = transactions.filter(tx => tx.type === 'expense');
                break;
            case 'savings':
                // For savings, we'll show months with positive net
                transactions = getMonthlySavingsData(range);
                break;
        }
        
        // Sort by date
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let runningTotal = 0;
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            if (dataType === 'savings') {
                runningTotal += tx.amount;
            } else {
                runningTotal += tx.type === 'income' ? tx.amount : -tx.amount;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(tx.date).toISOString().slice(0, 10)}</td>
                <td>${tx.type === 'income' ? '💰 Income' : '💸 Expense'}</td>
                <td>${tx.category}</td>
                <td>${tx.note || '-'}</td>
                <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${tx.type === 'income' ? '+' : '-'}¥${tx.amount.toLocaleString()}
                </td>
                <td class="running-total ${runningTotal >= 0 ? 'positive' : 'negative'}">
                    ¥${runningTotal.toLocaleString()}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function getMonthlySavingsData(range) {
        const months = range === '3m' ? 3 : range === '6m' ? 6 : range === '1y' ? 12 : 24;
        const data = [];
        const now = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthTransactions = allTx().filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= monthStart && txDate <= monthEnd;
            });
            
            const income = monthTransactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            const expenses = monthTransactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            const savings = income - expenses;
            
            if (savings !== 0) {
                data.push({
                    date: monthStart.toISOString(),
                    type: savings > 0 ? 'income' : 'expense',
                    category: 'Monthly Net',
                    note: `${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                    amount: Math.abs(savings)
                });
            }
        }
        
        return data;
    }

    function renderProjections() {
        const container = byId('projection');
        if (!container) return;
        
        const totalIncome = allTx().filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = allTx().filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
        const netSavings = totalIncome - totalExpenses;
        
        // Calculate monthly averages
        const months = getMonthsWithData();
        const avgMonthlyIncome = months > 0 ? totalIncome / months : 0;
        const avgMonthlyExpenses = months > 0 ? totalExpenses / months : 0;
        const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;
        
        // Projections
        const projections = [
            { period: '3 months', savings: avgMonthlySavings * 3, income: avgMonthlyIncome * 3, expenses: avgMonthlyExpenses * 3 },
            { period: '6 months', savings: avgMonthlySavings * 6, income: avgMonthlyIncome * 6, expenses: avgMonthlyExpenses * 6 },
            { period: '1 year', savings: avgMonthlySavings * 12, income: avgMonthlyIncome * 12, expenses: avgMonthlyExpenses * 12 }
        ];
        
        container.innerHTML = `
            <div class="row g-3">
                <div class="col-12">
                    <h5>Based on your current financial patterns:</h5>
                </div>
                ${projections.map(proj => `
                    <div class="col-lg-4 col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h6 class="card-title">${proj.period}</h6>
                                <div class="row g-2">
                                    <div class="col-lg-4 col-md-6">
                                        <small class="text-muted">Income</small>
                                        <div class="text-success fw-bold">¥${proj.income.toLocaleString()}</div>
                                    </div>
                                    <div class="col-lg-4 col-md-6">
                                        <small class="text-muted">Expenses</small>
                                        <div class="text-success fw-bold">¥${proj.expenses.toLocaleString()}</div>
                                    </div>
                                </div>
                                <hr>
                                <div class="text-primary fw-bold">
                                    Net: ¥${proj.savings.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function getMonthsWithData() {
        const transactions = allTx();
        if (transactions.length === 0) return [];
        
        // Get unique months from transaction dates
        const monthSet = new Set();
        transactions.forEach(tx => {
            if (tx.date) {
                monthSet.add(ym(tx.date));
            }
        });
        
        // Convert to array and sort
        return Array.from(monthSet).sort();
    }

    // Helper function to get theme variable
    function getThemeVariable(variable) {
        return getComputedStyle(document.documentElement).getPropertyValue(variable);
    }

    // Helper function to generate colors - Enhanced for Dark Mode Visibility
    function generateColors(count) {
        // Enhanced color palette with better contrast for both light and dark modes
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#FF8E8E', '#5ED5CC', '#5AC1D4', '#A6D9B7', '#FFF0A7',
            '#E5B0E5', '#A8E8D8', '#F9E67F', '#C69FD6', '#95D1F9'
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    // Add event listeners for report controls
    function setupReportControls() {
        // Category breakdown period selector
        const categoryPeriodSelect = byId('categoryBreakdownPeriod');
        if (categoryPeriodSelect) {
            categoryPeriodSelect.addEventListener('change', renderCategoryBreakdown);
        }
        
        // Savings trend period selector
        const savingsPeriodSelect = byId('savingsTrendPeriod');
        if (savingsPeriodSelect) {
            savingsPeriodSelect.addEventListener('change', renderSavingsTrend);
        }
        
        // Income vs expense trend period buttons
        const trendButtons = document.querySelectorAll('[data-period]');
        trendButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                trendButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                renderIncomeExpenseTrend();
            });
        });
        
        // Historical data controls
        const historicalRange = byId('historicalRange');
        const historicalDataType = byId('historicalDataType');
        
        if (historicalRange) {
            historicalRange.addEventListener('change', renderHistoricalData);
        }
        if (historicalDataType) {
            historicalDataType.addEventListener('change', renderHistoricalData);
        }
        
        // Set up periodic refresh for reports (every 30 seconds when reports page is active)
        setInterval(() => {
            if (isReportsPage()) {
                renderMonthlyDataTable(); // Update monthly data table
                renderBudgetVsActual(); // Update budget vs actual table
                renderCategoryPerformance(); // Update category performance
                generateFinancialInsights(); // Update insights
            }
        }, 30000); // 30 seconds
    }

    // Charts
    const chartRefs = {};
    function pieChart(id, labels, values) {
        const canvas = byId(id); 
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        chartRefs[id]?.destroy?.();
        chartRefs[id] = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels, 
                datasets: [{ 
                    data: values, 
                    backgroundColor: palette(labels.length),
                    borderColor: getThemeVariable('--bg-card'),
                    borderWidth: 3,
                    hoverBorderWidth: 4
                }] 
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: getThemeVariable('--bg-card'),
                        titleColor: getThemeVariable('--text-primary'),
                        bodyColor: getThemeVariable('--text-primary'),
                        borderColor: getThemeVariable('--border-primary'),
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ¥${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                elements: {
                    arc: {
                        borderWidth: 3
                    }
                }
            }
        });
    }
    function lineChart(id, labels, income, expense) {
        const canvas = byId(id); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        chartRefs[id]?.destroy?.();
        chartRefs[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels, datasets: [
                    { 
                        label: 'Income', 
                        data: income, 
                        borderColor: getThemeVariable('--accent-success'), 
                        backgroundColor: getThemeVariable('--accent-success') + '20',
                        borderWidth: 3,
                        tension: .3,
                        pointBackgroundColor: getThemeVariable('--accent-success'),
                        pointBorderColor: getThemeVariable('--bg-card'),
                        pointBorderWidth: 2,
                        pointRadius: 5
                    },
                    { 
                        label: 'Expense', 
                        data: expense, 
                        borderColor: getThemeVariable('--accent-danger'), 
                        backgroundColor: getThemeVariable('--accent-danger') + '20',
                        borderWidth: 3,
                        tension: .3,
                        pointBackgroundColor: getThemeVariable('--accent-danger'),
                        pointBorderColor: getThemeVariable('--bg-card'),
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }
                ]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    } 
                },
                scales: {
                    y: {
                        grid: {
                            color: getThemeVariable('--border-primary') + '40'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: getThemeVariable('--border-primary') + '40'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                }
            }
        });
    }
    function barChart(id, labels, savings) {
        const canvas = byId(id);
        if (!canvas) return;
        
        // Remove manual height setting to prevent scrolling issues
        // canvas.height = 180; // This was causing the problem
        
        const ctx = canvas.getContext('2d');
        chartRefs[id]?.destroy?.();
        chartRefs[id] = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [{ 
                    label: 'Savings', 
                    data: savings, 
                    backgroundColor: savings.map(v => v >= 0 ? getThemeVariable('--accent-success') : getThemeVariable('--accent-danger')),
                    borderColor: savings.map(v => v >= 0 ? getThemeVariable('--accent-success') : getThemeVariable('--accent-danger')),
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }] 
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        backgroundColor: getThemeVariable('--bg-card'),
                        titleColor: getThemeVariable('--text-primary'),
                        bodyColor: getThemeVariable('--text-primary'),
                        borderColor: getThemeVariable('--border-primary'),
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `Savings: ¥${value.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: getThemeVariable('--border-primary') + '40',
                            borderColor: getThemeVariable('--border-primary') + '60'
                        },
                        ticks: {
                            color: getThemeVariable('--text-primary'),
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        },
                        beginAtZero: true
                    }
                },
                elements: {
                    bar: {
                        backgroundColor: function(context) {
                            const value = context.parsed.y;
                            return value >= 0 ? '#00c853' : '#ff3b30';
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    function palette(n) {
        const base = ['#4f8cff', '#7c5cff', '#00c853', '#ffb020', '#ff3b30', '#00bcd4', '#ef6c00', '#8e24aa', '#43a047', '#3949ab', '#f06292'];
        return Array.from({ length: n }, (_, i) => base[i % base.length]);
    }

    // Helpers
    function daysInMonth(d) { const x = new Date(d.getFullYear(), d.getMonth() + 1, 0); return x.getDate(); }
    function daysRemainingInMonth() { const d = new Date(); return daysInMonth(d) - d.getDate(); }
    function lastNMonths(n) { const out = []; const d = new Date(); for (let i = 0; i < n; i++) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'); out.push(`${y}-${m}`); d.setMonth(d.getMonth() - 1); } return out; }
    function rowFromTemplate(tid) { const tpl = byId(tid); return tpl.content.firstElementChild.cloneNode(true); }
    function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

    // Boot / render
    function renderAll() {
        applyTheme(); 
        updateNavbarTheme(); // Force navbar theme update
        renderCategories(); 
        drawDashboard(); 
        renderTxTable(); 
        renderBudgets();
        setupIncomeForm(); // Setup income form
        setupReportControls(); // Setup report controls
        byId('monthTag').textContent = monthName(ym(new Date()));
        
        // If on reports page, also render reports
        if (isReportsPage()) {
            console.log('renderAll: on reports page, calling renderReports');
            setTimeout(() => {
                console.log('renderAll: calling renderReports after delay');
                renderReports();
            }, 500);
        }
    }

    // On initial load: apply theme from stored state, apply recurring, render
    console.log('=== INITIAL LOAD START ===');
    console.log('Initial state:', state);
    console.log('Initial state.tx:', state.tx);
    
    applyTheme();
    updateNavbarTheme(); // Force initial navbar theme
    renderAll();
    
    console.log('After renderAll, state.tx:', state.tx);
    console.log('After renderAll, allTx():', allTx());
    
    applyRecurring(); // Move this after renderAll to ensure DOM is ready
    
    console.log('After applyRecurring, state.tx:', state.tx);
    console.log('After applyRecurring, allTx():', allTx());
    
    txForm.date.value = today();
    console.log('=== INITIAL LOAD COMPLETE ===');
    
    // Initialize page navigation - start with dashboard or hash-based page
    const initialPage = window.location.hash.slice(1) || 'dashboard';
    if (['dashboard', 'transactions', 'budgets', 'reports', 'settings'].includes(initialPage)) {
        navigateToPage(initialPage);
        
        // Always sync dashboard and reports on initial load
        setTimeout(() => {
            console.log('Initial sync of dashboard and reports...');
            window.syncDashboardAndReports();
        }, 500);
    } else {
        navigateToPage('dashboard');
    }
    
    // Add visibility change listener for real-time updates when user returns to tab
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isReportsPage()) {
            // User returned to the tab and is on reports page, refresh data
            updateReportsRealTime();
        }
    });
    

    setInterval(() => {
        if (isReportsPage()) {
            const reportsSection = byId('reports');
            if (reportsSection && !reportsSection.classList.contains('hidden')) {

            }
        }
    }, 5000); // Check every 5 seconds
    
    // Test: Add a sample income transaction if none exist (for debugging)
    if (allTx().length === 0) {
        console.log('No transactions found, adding sample income for testing');
        console.log('today():', today());
        console.log('nextMonth():', nextMonth());
        console.log('ym(today()):', ym(today()));
        
        const sampleIncome = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            type: 'income',
            category: 'Income',
            amount: 500000,
            note: 'Sample Monthly Income',
            date: today(),
            recurring: 'monthly',
            next: nextMonth()
        };
        console.log('About to add sample income transaction...');
        console.log('Sample income object:', sampleIncome);
        addTx(sampleIncome);
        console.log('Sample income added:', sampleIncome);
        console.log('State after adding sample:', state);
        console.log('All transactions after sample:', allTx());
        
        // Save the state after adding sample transaction
        save();
        

        console.log('Sample transaction month:', ym(sampleIncome.date));
        console.log('State.tx for sample month:', state.tx[ym(sampleIncome.date)]);
        
        // Save the state after adding sample transaction
        save();
        console.log('State saved after adding sample transaction');
        

    }

    // Category manager - EXCLUSIVE to Settings tab
    function renderCategoryManager() {
        // Ensure this function only works when Settings tab is active
        const settingsSection = byId('settings');
        if (!settingsSection || settingsSection.classList.contains('hidden')) {
            console.warn('Category manager can only be accessed from Settings tab');
            return;
        }
        
        const list = byId('categoryList');
        if (!list) {
            console.error('Category list element not found');
            return;
        }
        
        list.innerHTML = '';
        
        // Update category count
        const countEl = byId('categoryCount');
        if (countEl) {
            countEl.textContent = `(${state.categories.length})`;
        }
        
        // Show message if no categories exist
        if (state.categories.length === 0) {
            list.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="fas fa-tags fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No Categories Yet</h5>
                        <p class="text-muted">Add your first category to get started with organizing your transactions.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        state.categories.forEach((cat) => {
            const isUsed = allTx().some(tx => tx.category === cat);
            const usageCount = allTx().filter(tx => tx.category === cat).length;
            const isEssential = cat === 'Other' || cat === 'Income';
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'col-lg-4 col-md-6 col-sm-12';
            categoryDiv.innerHTML = `
                <div class="card category-card ${isEssential ? 'essential-category' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">
                                ${escapeHtml(cat)}
                                ${isEssential ? '<span class="badge bg-primary ms-2">Essential</span>' : ''}
                            </h6>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-sm btn-outline-primary rename-btn" data-cat="${escapeHtml(cat)}" title="Rename Category">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${!isEssential ? `
                                    <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-cat="${escapeHtml(cat)}" title="Delete Category">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : `
                                    <button type="button" class="btn btn-sm btn-outline-secondary" disabled title="Essential Category - Cannot Delete">
                                        <i class="fas fa-lock"></i>
                                    </button>
                                `}
                            </div>
                        </div>
                        <p class="card-text small text-muted mb-0">
                            ${isUsed ? 
                                `<i class="fas fa-check-circle text-success me-1"></i>Used in ${usageCount} transaction${usageCount !== 1 ? 's' : ''}` : 
                                `<i class="fas fa-info-circle text-info me-1"></i>Not used yet`
                            }
                        </p>
                    </div>
                </div>
            `;
            list.appendChild(categoryDiv);
        });
        
        // Attach event handlers
        attachCategoryEventHandlers();
    }
    
    function attachCategoryEventHandlers() {
        // Delete handlers
        els('.delete-btn', byId('categoryList')).forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                const cat = this.getAttribute('data-cat');
                
                // Prevent deletion of essential categories
                if (cat === 'Other' || cat === 'Income') {
                    showCategoryFeedback(`Cannot delete essential category "${cat}"`, 'error');
                    return;
                }
                
                const usageCount = allTx().filter(tx => tx.category === cat).length;
                
                if (usageCount > 0) {
                    const message = `Category "${cat}" is used in ${usageCount} transaction${usageCount !== 1 ? 's' : ''}.\n\n` +
                                  `Deleting this category will move all transactions to "Other" category.\n\n` +
                                  `Are you sure you want to continue?`;
                    
                    if (!confirm(message)) {
                        return;
                    }
                    
                    // Update all transactions using this category to "Other"
                    allTx().forEach(tx => {
                        if (tx.category === cat) {
                            updateTx(tx.id, { category: 'Other' });
                        }
                    });
                    
                    showCategoryFeedback(`Category "${cat}" deleted. ${usageCount} transaction${usageCount !== 1 ? 's' : ''} moved to "Other".`, 'success');
                } else {
                    if (!confirm(`Delete category "${cat}"?`)) {
                        return;
                    }
                    showCategoryFeedback(`Category "${cat}" deleted.`, 'success');
                }
                
                // Remove category from state
                state.categories = state.categories.filter(c => c !== cat);
                
                // Remove any budgets associated with this category
                if (state.budgets[cat] !== undefined) {
                    delete state.budgets[cat];
                }
                
                save();
                renderCategoryManager();
                renderCategories();
                renderAll();
                updateReportsRealTime(); // Update reports in real-time
            };
        });
        
        // Rename handlers
        els('.rename-btn', byId('categoryList')).forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                const oldCat = this.getAttribute('data-cat');
                const newCat = prompt(`Rename category "${oldCat}" to:`, oldCat);
                if (newCat && newCat.trim() && newCat.trim() !== oldCat) {
                    const trimmedNewCat = newCat.trim();
                    
                    if (trimmedNewCat.length < 2) {
                        alert('Category name must be at least 2 characters long.');
                        return;
                    }
                    
                    if (trimmedNewCat.length > 30) {
                        alert('Category name must be 30 characters or less.');
                        return;
                    }
                    
                    if (state.categories.includes(trimmedNewCat)) {
                        alert('A category with that name already exists.');
                        return;
                    }
                    
                    // Update category name in state
                    const catIndex = state.categories.indexOf(oldCat);
                    state.categories[catIndex] = trimmedNewCat;
                    
                    // Update all transactions using this category
                    const updatedTxCount = allTx().filter(tx => tx.category === oldCat).length;
                    allTx().forEach(tx => {
                        if (tx.category === oldCat) {
                            updateTx(tx.id, { category: trimmedNewCat });
                        }
                    });
                    
                    // Update budgets if they exist
                    if (state.budgets[oldCat] !== undefined) {
                        state.budgets[trimmedNewCat] = state.budgets[oldCat];
                        delete state.budgets[oldCat];
                    }
                    
                    save();
                    renderCategoryManager();
                    renderCategories();
                    renderAll();
                    updateReportsRealTime(); // Update reports in real-time
                    
                    showCategoryFeedback(`Category "${oldCat}" renamed to "${trimmedNewCat}". ${updatedTxCount} transaction${updatedTxCount !== 1 ? 's' : ''} updated.`, 'success');
                }
            };
        });
    }

    // Add category - EXCLUSIVE to Settings tab
    byId('addCategoryBtn').addEventListener('click', () => {
        // Ensure this function only works when Settings tab is active
        const settingsSection = byId('settings');
        if (!settingsSection || settingsSection.classList.contains('hidden')) {
            showCategoryFeedback('Category management is only available in the Settings tab', 'error');
            return;
        }
        
        const input = byId('newCategoryInput');
        if (!input) {
            console.error('New category input not found');
            return;
        }
        
        const newCat = input.value.trim();
        
        if (!newCat) {
            showCategoryFeedback('Please enter a category name', 'error');
            input.focus();
            return;
        }
        
        if (newCat.length < 2) {
            showCategoryFeedback('Category name must be at least 2 characters long', 'error');
            input.focus();
            return;
        }
        
        if (newCat.length > 30) {
            showCategoryFeedback('Category name must be 30 characters or less', 'error');
            input.focus();
            return;
        }
        
        if (state.categories.includes(newCat)) {
            showCategoryFeedback('A category with that name already exists', 'error');
            input.focus();
            return;
        }
        
        // Add the new category
        state.categories.push(newCat);
        save();
        
        // Refresh the category manager
        renderCategoryManager();
        
        // Update category dropdowns in other forms
        renderCategories();
        
        // Clear input and focus
        input.value = '';
        input.focus();
        
        // Show success feedback
        showCategoryFeedback(`Category "${newCat}" added successfully!`, 'success');
        
        // Update reports in real-time
        updateReportsRealTime();
        
        // Trigger a subtle animation on the new category card
        setTimeout(() => {
            const newCard = list.querySelector(`[data-cat="${newCat}"]`)?.closest('.category-card');
            if (newCard) {
                newCard.style.animation = 'pulse 0.6s ease-in-out';
                setTimeout(() => {
                    newCard.style.animation = '';
                }, 600);
            }
        }, 100);
    });
    
    function showCategoryFeedback(message, type = 'info') {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `category-feedback ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? 'var(--ok)' : type === 'error' ? 'var(--bad)' : 'var(--brand)'};
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after 3 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    // Allow Enter key to add
    byId('newCategoryInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') byId('addCategoryBtn').click();
    });
    
    // Category search functionality - EXCLUSIVE to Settings tab
    byId('categorySearch').addEventListener('input', (e) => {
        // Ensure this function only works when Settings tab is active
        const settingsSection = byId('settings');
        if (!settingsSection || settingsSection.classList.contains('hidden')) {
            return;
        }
        
        const searchTerm = e.target.value.toLowerCase().trim();
        filterCategories(searchTerm);
    });
    
    function filterCategories(searchTerm) {
        // Ensure this function only works when Settings tab is active
        const settingsSection = byId('settings');
        if (!settingsSection || settingsSection.classList.contains('hidden')) {
            return;
        }
        
        const categoryList = byId('categoryList');
        if (!categoryList) return;
        
        const categoryItems = els('.col-lg-4, .col-md-6, .col-sm-12', categoryList);
        
        if (searchTerm === '') {
            // Show all categories
            categoryItems.forEach(item => {
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            });
            return;
        }
        
        // Filter and animate categories
        categoryItems.forEach(item => {
            const categoryName = item.querySelector('.card-title')?.textContent.toLowerCase();
            if (categoryName && categoryName.includes(searchTerm)) {
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            } else {
                item.style.display = 'none';
                item.style.opacity = '0';
                item.style.transform = 'scale(0.95)';
            }
        });
        
        // Show "no results" message if no categories match
        const visibleItems = categoryItems.filter(item => item.style.display !== 'none');
        if (visibleItems.length === 0) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'col-12';
            noResultsDiv.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No Categories Found</h5>
                    <p class="text-muted">No categories match "${searchTerm}". Try a different search term.</p>
                </div>
            `;
            
            // Remove existing no results message
            const existingNoResults = categoryList.querySelector('.no-results');
            if (existingNoResults) {
                existingNoResults.remove();
            }
            
            noResultsDiv.classList.add('no-results');
            categoryList.appendChild(noResultsDiv);
        } else {
            // Remove no results message if it exists
            const existingNoResults = categoryList.querySelector('.no-results');
            if (existingNoResults) {
                existingNoResults.remove();
            }
        }
    }

    el('.tips').innerHTML = `
  <b>Tips</b><br>
  Keyboard: <b>Ctrl+P</b> quick add, <b>Ctrl+L</b> toggle theme, <b>/</b> focus filter.<br>
  Recurring items auto-post on app load if due.
`;


    
    // Professional Dashboard Functions - Enhanced Color Grading
    function updateOverviewMetrics(month) {
        const { income, expense, savings } = totalsForMonth(month);
        const prevMonth = getPreviousMonth(month);
        const prevData = totalsForMonth(prevMonth);
        
        // Calculate percentage changes
        const incomeChange = prevData.income ? Math.round(((income - prevData.income) / prevData.income) * 100) : 0;
        const expenseChange = prevData.expense ? Math.round(((expense - prevData.expense) / prevData.expense) * 100) : 0;
        const savingsChange = prevData.savings ? Math.round(((savings - prevData.savings) / prevData.savings) * 100) : 0;
        
        // Calculate savings rate as percentage of income
        const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
        
        // Update DOM with percentage values only
        byId('overviewIncome').textContent = `${incomeChange >= 0 ? '+' : ''}${incomeChange}%`;
        byId('overviewExpense').textContent = `${expenseChange >= 0 ? '+' : ''}${expenseChange}%`;
        byId('overviewSavings').textContent = `${savingsRate}%`;
        
        // Update change indicators with enhanced visual feedback
        updateChangeIndicator('overviewIncome', incomeChange, 'positive');
        updateChangeIndicator('overviewExpense', expenseChange, 'negative');
        updateChangeIndicator('overviewSavings', savingsChange, savingsChange >= 0 ? 'positive' : 'negative');
        
        // Add professional color grading effects
        addMetricColorEffects(income, expense, savings);
        
        // Update period display
        updatePeriodDisplay(month);
    }
    
    function updatePeriodDisplay(month) {
        const periodSelect = byId('overviewPeriod');
        if (periodSelect) {
            const currentMonth = ym(new Date());
            const selectedPeriod = periodSelect.value;
            
            let displayText = '';
            switch (selectedPeriod) {
                case 'current':
                    displayText = `Current Month (${month})`;
                    break;
                case 'previous':
                    displayText = `Previous Month (${getPreviousMonth(month)})`;
                    break;
                case 'quarter':
                    displayText = `This Quarter (${getQuarterDisplay(month)})`;
                    break;
            }
            
            // Add subtle animation to show data update
            const metricValues = document.querySelectorAll('.metric-value');
            metricValues.forEach((value, index) => {
                value.style.animation = 'none';
                value.offsetHeight; // Trigger reflow
                value.style.animation = `slideInUp 0.4s ease-out ${index * 0.1}s`;
            });
        }
    }
    
    function getQuarterDisplay(month) {
        const [year, monthNum] = month.split('-').map(Number);
        const quarter = Math.ceil(monthNum / 3);
        const quarterStart = ((quarter - 1) * 3) + 1;
        const quarterEnd = Math.min(quarter * 3, 12);
        
        const startMonth = new Date(year, quarterStart - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        const endMonth = new Date(year, quarterEnd - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        return `${startMonth} - ${endMonth} ${year}`;
    }
    
    function updateChangeIndicator(elementId, change, type) {
        const element = byId(elementId);
        if (element) {
            const changeElement = element.parentNode.querySelector('.metric-change');
            if (changeElement) {
                // Enhanced change indicator with professional styling
                const sign = change >= 0 ? '+' : '';
                const absChange = Math.abs(change);
                
                changeElement.textContent = `${sign}${absChange}%`;
                changeElement.className = `metric-change ${type}`;
                
                // Add professional animation
                changeElement.style.animation = 'none';
                changeElement.offsetHeight; // Trigger reflow
                changeElement.style.animation = 'pulse 0.6s ease-in-out';
                
                // Enhanced color grading based on change magnitude
                if (absChange > 20) {
                    changeElement.style.transform = 'scale(1.1)';
                    changeElement.style.fontWeight = '700';
                } else if (absChange > 10) {
                    changeElement.style.transform = 'scale(1.05)';
                    changeElement.style.fontWeight = '600';
                }
            }
        }
    }

    function addMetricColorEffects(income, expense, savings) {
        // Enhanced color grading for metrics based on values
        const total = income + expense;
        if (total > 0) {
            const incomeRatio = income / total;
            const expenseRatio = expense / total;
            const savingsRatio = savings / total;
            
            // Apply professional color intensity based on ratios
            const incomeEl = byId('overviewIncome');
            const expenseEl = byId('overviewExpense');
            const savingsEl = byId('overviewSavings');
            
            if (incomeEl && incomeRatio > 0.6) {
                incomeEl.style.color = '#059669'; // Enhanced success color
                incomeEl.style.fontWeight = '800';
            }
            
            if (expenseEl && expenseRatio > 0.7) {
                expenseEl.style.color = '#dc2626'; // Enhanced danger color
                expenseEl.style.fontWeight = '800';
            }
            
            if (savingsEl) {
                if (savingsRatio > 0.3) {
                    savingsEl.style.color = '#059669'; // Excellent savings
                    savingsEl.style.fontWeight = '800';
                } else if (savingsRatio < 0) {
                    savingsEl.style.color = '#dc2626'; // Negative savings
                    savingsEl.style.fontWeight = '800';
                }
            }
        }
    }

    function generateInsights(month) {
        const { income, expense, savings } = totalsForMonth(month);
        const spend = categorySpend(month);
        const insights = [];
        
        // Enhanced insight generation with professional color grading
        if (income > 0) {
            const savingsRate = Math.round((savings / income) * 100);
            if (savingsRate >= 30) {
                insights.push({
                    icon: 'success',
                    title: 'Exceptional Savings Rate',
                    description: `Outstanding! You're saving ${savingsRate}% of your income. This is above the recommended 20% threshold.`,
                    priority: 'high',
                    color: 'success'
                });
            } else if (savingsRate >= 20) {
                insights.push({
                    icon: 'success',
                    title: 'Excellent Savings Rate',
                    description: `Great job! You're saving ${savingsRate}% of your income this month. Keep up the good work!`,
                    priority: 'medium',
                    color: 'success'
                });
            } else if (savingsRate >= 10) {
                insights.push({
                    icon: 'info',
                    title: 'Good Savings Rate',
                    description: `You're saving ${savingsRate}% of your income. Consider increasing to 20% for better financial security.`,
                    priority: 'medium',
                    color: 'info'
                });
            } else if (savingsRate < 0) {
                insights.push({
                    icon: 'danger',
                    title: 'Negative Savings Alert',
                    description: `Your expenses exceed income by ${Math.abs(savingsRate)}%. Immediate action required to review spending.`,
                    priority: 'critical',
                    color: 'danger'
                });
            }
        }
        
        // Enhanced category spending insights
        const topCategory = Object.entries(spend).sort(([,a], [,b]) => b - a)[0];
        if (topCategory && topCategory[1] > income * 0.4) {
            insights.push({
                icon: 'warning',
                title: 'High Category Concentration',
                description: `${topCategory[0]} accounts for ${Math.round((topCategory[1] / income) * 100)}% of your income. Consider diversification.`,
                priority: 'high',
                color: 'warning'
            });
        }
        
        // Enhanced budget insights with professional color grading
        const totalBudget = sum(Object.values(state.budgets).map(b => typeof b === 'object' ? b.amount : b));
        if (totalBudget > 0) {
            const budgetUsage = Math.round((expense / totalBudget) * 100);
            if (budgetUsage > 120) {
                insights.push({
                    icon: 'danger',
                    title: 'Critical Budget Overrun',
                    description: `You're ${budgetUsage - 100}% over your monthly budget. Immediate spending review required.`,
                    priority: 'critical',
                    color: 'danger'
                });
            } else if (budgetUsage > 100) {
                insights.push({
                    icon: 'warning',
                    title: 'Budget Exceeded',
                    description: `You're ${budgetUsage - 100}% over your monthly budget. Consider adjusting spending patterns.`,
                    priority: 'high',
                    color: 'warning'
                });
            } else if (budgetUsage < 50) {
                insights.push({
                    icon: 'info',
                    title: 'Under Budget',
                    description: `You're only using ${budgetUsage}% of your budget. Great discipline or consider reallocating funds.`,
                    priority: 'low',
                    color: 'info'
                });
            }
        }
        
        // Enhanced trend insights
        const prevMonth = getPreviousMonth(month);
        const prevData = totalsForMonth(prevMonth);
        if (prevData.income > 0) {
            const expenseTrend = ((expense - prevData.expense) / prevData.expense) * 100;
            if (expenseTrend > 20) {
                insights.push({
                    icon: 'warning',
                    title: 'Expense Spike Detected',
                    description: `Your expenses increased by ${Math.round(expenseTrend)}% compared to last month.`,
                    priority: 'medium',
                    color: 'warning'
                });
            } else if (expenseTrend < -15) {
                insights.push({
                    icon: 'success',
                    title: 'Expense Reduction',
                    description: `Great progress! Your expenses decreased by ${Math.round(Math.abs(expenseTrend))}% from last month.`,
                    priority: 'low',
                    color: 'success'
                });
            }
        }
        
        // Render enhanced insights with professional color grading
        renderEnhancedInsights(insights);
    }
    
    function renderEnhancedInsights(insights) {
        const container = byId('insightsList');
        if (!container) return;
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="insight-item" style="border-left: 4px solid #10b981;">
                    <div class="insight-icon success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="insight-content">
                        <div class="insight-title">Financial Health Excellent</div>
                        <div class="insight-description">Your finances are in outstanding shape this month. Keep maintaining this level of financial discipline.</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Sort insights by priority for better visual hierarchy
        const priorityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
        insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-item" style="border-left: 4px solid ${getPriorityColor(insight.priority)};">
                <div class="insight-icon ${insight.icon}">
                    <i class="fas fa-${getInsightIcon(insight.icon)}"></i>
                </div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-description">${insight.description}</div>
                    <div class="insight-priority" style="
                        display: inline-block;
                        margin-top: 0.5rem;
                        padding: 0.25rem 0.75rem;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        background: ${getPriorityBackground(insight.priority)};
                        color: ${getPriorityTextColor(insight.priority)};
                    ">${insight.priority}</div>
                </div>
            </div>
        `).join('');
        
        // Add professional animations
        addInsightAnimations(container);
    }
    
    function getPriorityColor(priority) {
        const colors = {
            'critical': 'var(--accent-danger)',
            'high': 'var(--accent-warning)',
            'medium': 'var(--accent-info)',
            'low': 'var(--accent-success)'
        };
        return colors[priority] || 'var(--text-muted)';
    }

    function getPriorityBackground(priority) {
        const backgrounds = {
            'critical': 'var(--bg-tertiary)',
            'high': 'var(--bg-secondary)',
            'medium': 'var(--bg-tertiary)',
            'low': 'var(--bg-secondary)'
        };
        return backgrounds[priority] || 'var(--bg-tertiary)';
    }

    function getPriorityTextColor(priority) {
        const textColors = {
            'critical': 'var(--accent-danger)',
            'high': 'var(--accent-warning)',
            'medium': 'var(--accent-info)',
            'low': 'var(--accent-success)'
        };
        return textColors[priority] || 'var(--text-secondary)';
    }

    function addInsightAnimations(container) {
        const insightItems = container.querySelectorAll('.insight-item');
        insightItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }

    function updateTopCategories(month) {
        const spend = categorySpend(month);
        const sortedCategories = Object.entries(spend)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        const container = byId('topCategories');
        if (!container) return;
        
        container.innerHTML = sortedCategories.map(([category, amount], index) => {
            const percentage = getCategoryPercentage(amount, month);
            const color = getCategoryColor(index);
            const intensity = getCategoryIntensity(amount, month);
            
            return `
                <div class="category-item" style="
                    border-left: 4px solid ${color};
                    background: ${getCategoryBackground(intensity)};
                ">
                    <div class="category-info">
                        <div class="category-color" style="
                            background: ${color};
                            box-shadow: 0 2px 8px ${color}40;
                        "></div>
                        <div class="category-name">${category}</div>
                    </div>
                    <div class="category-amount" style="
                        color: ${getCategoryTextColor(intensity)};
                        font-weight: ${intensity > 0.3 ? '700' : '600'};
                    ">${fmt.format(amount)}</div>
                    <div class="category-percentage" style="
                        font-size: 0.75rem;
                        color: #64748b;
                        font-weight: 500;
                    ">${percentage}%</div>
                </div>
            `;
        }).join('');
        
        // Add professional animations
        addCategoryAnimations(container);
    }

    function getCategoryPercentage(amount, month) {
        const { income } = totalsForMonth(month);
        if (income === 0) return 0;
        return Math.round((amount / income) * 100);
    }

    function getCategoryIntensity(amount, month) {
        const { income } = totalsForMonth(month);
        if (income === 0) return 0;
        return amount / income;
    }

    function getCategoryBackground(intensity) {
        if (intensity > 0.4) {
            return 'var(--bg-tertiary)';
        } else if (intensity > 0.25) {
            return 'var(--bg-secondary)';
        } else {
            return 'var(--bg-tertiary)';
        }
    }

    function getCategoryTextColor(intensity) {
        if (intensity > 0.4) {
            return 'var(--accent-danger)';
        } else if (intensity > 0.25) {
            return 'var(--accent-warning)';
        } else {
            return 'var(--text-secondary)';
        }
    }

    function addCategoryAnimations(container) {
        const categoryItems = container.querySelectorAll('.category-item');
        categoryItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 100);
        });
    }

    function updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        const dateString = now.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        const lastUpdatedEl = byId('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `${dateString} at ${timeString}`;
            
            // Add professional timestamp styling
            lastUpdatedEl.style.color = '#64748b';
            lastUpdatedEl.style.fontSize = '0.875rem';
            lastUpdatedEl.style.fontWeight = '500';
            lastUpdatedEl.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace';
        }
    }
    
    // Enhanced chart period controls with professional color grading
    document.addEventListener('click', (e) => {
        if (e.target.matches('.chart-controls .btn')) {
            // Remove active class from all buttons
            e.target.parentNode.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Add professional click feedback
            e.target.style.transform = 'scale(0.95)';
            setTimeout(() => {
                e.target.style.transform = 'scale(1)';
            }, 150);
            
            // Handle period change
            const period = e.target.dataset.period;
            updateTrendChart(period);
        }
    });
    
    function updateTrendChart(period) {
        if (!window.Chart) return;
        
        let months;
        switch (period) {
            case '6m':
                months = lastNMonths(6).reverse();
                break;
            case '1y':
                months = lastNMonths(12).reverse();
                break;
            case '2y':
                months = lastNMonths(24).reverse();
                break;
            default:
                months = lastNMonths(6).reverse();
        }
        
        const inc = months.map(m => totalsForMonth(m).income);
        const exp = months.map(m => totalsForMonth(m).expense);
        
        // Enhanced chart with professional color grading
        lineChartEnhanced('trendChart', months.map(m => m.replace('-', '/')), inc, exp);
    }

    function lineChartEnhanced(id, labels, income, expense) {
        const canvas = byId(id);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (window.chartRefs && window.chartRefs[id]) {
            window.chartRefs[id].destroy();
        }
        
        // Professional color scheme
        const incomeGradient = ctx.createLinearGradient(0, 0, 0, 400);
        incomeGradient.addColorStop(0, 'rgba(67, 233, 123, 0.8)');
        incomeGradient.addColorStop(1, 'rgba(67, 233, 123, 0.1)');
        
        const expenseGradient = ctx.createLinearGradient(0, 0, 0, 400);
        expenseGradient.addColorStop(0, 'rgba(255, 154, 158, 0.8)');
        expenseGradient.addColorStop(1, 'rgba(255, 154, 158, 0.1)');
        
        window.chartRefs = window.chartRefs || {};
        window.chartRefs[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: income,
                        borderColor: '#43e97b',
                        backgroundColor: incomeGradient,
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#43e97b',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Expenses',
                        data: expense,
                        borderColor: '#ff9a9e',
                        backgroundColor: expenseGradient,
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#ff9a9e',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: getThemeVariable('--bg-card'),
                        titleColor: getThemeVariable('--text-color'),
                        bodyColor: getThemeVariable('--text-color'),
                        borderColor: getThemeVariable('--border-color'),
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: getThemeVariable('--border-color') + '20',
                            borderColor: getThemeVariable('--border-color') + '40',
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: getThemeVariable('--border-color') + '20',
                            borderColor: getThemeVariable('--border-color') + '40',
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: getThemeVariable('--bg-card'),
                        hoverBorderColor: getThemeVariable('--text-color')
                    }
                }
            }
        });
    }

    // Migrate old "income" field to new "budget" field and update UI labels
    (function migrateIncomeToBudget() {
        // ensure state and state.goal exist
        if (typeof state !== 'undefined' && state && state.goal) {
            // migrate stored data
            if (state.goal.income !== undefined && state.goal.budget === undefined) {
                state.goal.budget = state.goal.income;
                delete state.goal.income;
                save(); // persist migration
            }
        }

        // Replace visible "Income" text labels with "Budget" (case-sensitive and case-insensitive)
        const labelSelectors = 'label, span, h3, h4, .label, .field-label, .help-text';
        Array.from(document.querySelectorAll(labelSelectors)).forEach(el => {
            if (el.innerHTML && /Income/i.test(el.innerHTML)) {
                el.innerHTML = el.innerHTML.replace(/\bIncome\b/g, 'Budget').replace(/\bincome\b/g, 'budget');
            }
        });

        // If there is an input bound to income (id or name contains "income"), rename its id/name for clarity
        const incomeEls = Array.from(document.querySelectorAll('input[id*="income"], input[name*="income"], #income, .income'));
        incomeEls.forEach(el => {
            // keep element working but update attributes so future code can target "budget"
            if (el.id && el.id.toLowerCase().includes('income')) el.id = el.id.replace(/income/i, 'budget');
            if (el.name && el.name.toLowerCase().includes('income')) el.name = el.name.replace(/income/i, 'budget');
            el.classList.remove('income');
            el.classList.add('budget');
        });
    })();

    // Safe migration: canonicalize saving goal to goal.income (do not mutate visible labels)
    (function unifyGoalIncome() {
        try {
            if (typeof state !== 'undefined' && state && state.goal) {
                // If older data used goal.budget, move it to goal.income (preserve user-entered income if present)
                if (state.goal.budget !== undefined) {
                    if (state.goal.income === undefined || state.goal.income === null) {
                        state.goal.income = Number(state.goal.budget) || 0;
                    }
                    delete state.goal.budget;
                    save();
                }
            }
        } catch (e) {
            console.error('Goal migration error', e);
        }
    })();

    function getInsightIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'times-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    function getCategoryColor(index) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        return colors[index % colors.length];
    }

    function getPreviousMonth(month) {
        const [year, monthNum] = month.split('-').map(Number);
        if (monthNum === 1) {
            return `${year - 1}-12`;
        }
        return `${year}-${String(monthNum - 1).padStart(2, '0')}`;
    }

    // Income form handler - automatically create income transaction
    function setupIncomeForm() {
        const incomeForm = byId('incomeForm');
        console.log('Looking for income form:', incomeForm);
        
        if (!incomeForm) {
            console.warn('Income form not found, will retry later');
            return false;
        }
        
        console.log('Setting up income form event listener');
        console.log('Form element details:', {
            id: incomeForm.id,
            tagName: incomeForm.tagName,
            className: incomeForm.className,
            action: incomeForm.action
        });
        
        incomeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Income form submitted!');
            console.log('Event details:', e);
            console.log('Form element:', e.target);
            
            // Use FormData to properly access form values
            const formData = new FormData(incomeForm);
            console.log('FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value} (type: ${typeof value})`);
            }
            
            const incomeAmountStr = formData.get('monthlyIncome');
            const incomeSource = formData.get('incomeSource').trim();
            
            console.log('Raw form values:', { incomeAmountStr, incomeSource });
            
            // Better validation logic
            if (!incomeAmountStr || incomeAmountStr.trim() === '') {
                alert('Please enter an income amount');
                return;
            }
            
            const incomeAmount = parseFloat(incomeAmountStr);
            console.log('Parsed income amount:', incomeAmount);
            
            if (isNaN(incomeAmount) || incomeAmount <= 0) {
                alert('Please enter a valid income amount (must be greater than 0)');
                return;
            }
            
            // Create income transaction
            const incomeTx = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                type: 'income',
                category: 'Income',
                amount: incomeAmount,
                note: incomeSource || 'Monthly Income',
                date: today(),
                recurring: 'monthly',
                next: nextMonth()
            };
            
            console.log('Creating income transaction:', incomeTx);
            console.log('Current state.tx before adding:', state.tx);
            
            // Add to transactions
            addTx(incomeTx);
            
            console.log('Current state.tx after adding:', state.tx);
            console.log('All transactions after adding:', allTx());
            
            // Clear form
            incomeForm.reset();
            
            // Show success message
            showToast(`Income of ¥${incomeAmount.toLocaleString()} added successfully!`, 'success');
            
            // Update dashboard and other views
            renderAll();
            updateReportsRealTime(); // Update reports in real-time
            

        });
        
        console.log('Income form event listener added successfully');
        return true;
    }
    
    // Helper function to get next month date
    function nextMonth() {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date.toISOString().split('T')[0];
    }
    
    // Toast notification system
    function showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    // Debug function - can be called from console
    window.debugBudgetManager = function() {
        console.log('=== DEBUG: Current State ===');
        console.log('State object:', state);
        console.log('State.tx:', state.tx);
        console.log('All transactions:', allTx());
        console.log('Income transactions:', allTx().filter(tx => tx.type === 'income'));
        console.log('Expense transactions:', allTx().filter(tx => tx.type === 'expense'));
        console.log('Current hash:', window.location.hash);
        console.log('Is reports page:', isReportsPage());
        console.log('Reports section:', byId('reports'));

        

        
        return 'Debug complete - check console for details';
    };
    

    
    // Function to sync dashboard and reports data
    window.syncDashboardAndReports = function() {
        console.log('=== Syncing Dashboard and Reports ===');
        
        // Get current month data
        const month = ym(new Date());
        const { income, expense, savings } = totalsForMonth(month);
        const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
        
        console.log('Current month data:', { month, income, expense, savings, savingsRate });
        
        // Update dashboard
        drawDashboard();
        
        // Update reports if on reports page
        if (isReportsPage()) {
            updateReportsRealTime();

        }
        
        return 'Dashboard and reports synced';
    };

            // Monthly Data Table Functions
        function renderMonthlyDataTable() {
            console.log('renderMonthlyDataTable called');
            const tbody = byId('monthlyDataTableBody');
            if (!tbody) {
                console.log('monthlyDataTableBody not found');
                return;
            }

            // Get all months with data
            const months = getMonthsWithData();
            console.log('Months with data:', months);
            console.log('Months type:', typeof months);
            console.log('Months length:', months.length);
            
            // Clear existing rows
            tbody.innerHTML = '';

            if (months.length === 0) {
                console.log('No months found, showing empty message');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="fas fa-info-circle me-2"></i>
                            No monthly data available yet. Start adding transactions to see your monthly summary.
                        </td>
                    </tr>
                `;
                return;
            }

            // Sort months in descending order (most recent first)
            months.sort().reverse();

            // Create rows for each month
            months.forEach(month => {
                console.log(`Processing month: ${month}`);
                const { income, expense, savings } = totalsForMonth(month);
                console.log(`Month ${month} totals:`, { income, expense, savings });
                const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
                const transactions = allTx().filter(tx => tx.date.startsWith(month));
                console.log(`Month ${month} transactions:`, transactions.length);
                const budgetStatus = getBudgetStatus(month);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${monthName(month)}</td>
                    <td class="income-amount">¥${income.toLocaleString()}</td>
                    <td class="expense-amount">¥${expense.toLocaleString()}</td>
                    <td class="savings-amount">¥${savings.toLocaleString()}</td>
                    <td class="savings-rate ${savings >= 0 ? 'positive' : 'negative'}">${savingsRate}%</td>
                    <td>${transactions.length}</td>
                    <td><span class="budget-status ${budgetStatus.class}">${budgetStatus.text}</span></td>
                `;
                tbody.appendChild(row);
            });
        }

        function getBudgetStatus(month) {
            const { income, expense, savings } = totalsForMonth(month);
            const savingsRate = income > 0 ? (savings / income) * 100 : 0;
            
            if (savingsRate >= 30) return { class: 'excellent', text: 'Excellent' };
            if (savingsRate >= 20) return { class: 'good', text: 'Good' };
            if (savingsRate >= 10) return { class: 'warning', text: 'Fair' };
            if (savingsRate >= 0) return { class: 'neutral', text: 'Break Even' };
            return { class: 'danger', text: 'Over Spending' };
        }

        function saveAsExcel() {
            const months = getMonthsWithData();
            if (months.length === 0) {
                showToast('No data available to export', 'warning');
                return;
            }

            // Create Excel-like CSV content
            let csvContent = 'Month,Income,Expenses,Savings,Savings Rate (%),Transactions,Budget Status\n';
            
            // Sort months in descending order
            months.sort().reverse();
            
            months.forEach(month => {
                const { income, expense, savings } = totalsForMonth(month);
                const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
                const transactions = allTx().filter(tx => tx.date.startsWith(month));
                const budgetStatus = getBudgetStatus(month);

                csvContent += `${monthName(month)},${income},${expense},${savings},${savingsRate},${transactions.length},${budgetStatus.text}\n`;
            });

            // Add summary row
            const totalIncome = months.reduce((sum, month) => sum + totalsForMonth(month).income, 0);
            const totalExpenses = months.reduce((sum, month) => sum + totalsForMonth(month).expense, 0);
            const totalSavings = months.reduce((sum, month) => sum + totalsForMonth(month).savings, 0);
            const overallSavingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;
            const totalTransactions = months.reduce((sum, month) => sum + allTx().filter(tx => tx.date.startsWith(month)).length, 0);

            csvContent += `\nTOTAL,${totalIncome},${totalExpenses},${totalSavings},${overallSavingsRate},${totalTransactions},Overall\n`;

            const filename = `yen-budget-monthly-data-${new Date().toISOString().slice(0, 10)}.csv`;
            download(filename, csvContent);
            showToast('Monthly data saved as Excel-compatible CSV file', 'success');
        }

        // Add event listeners for Monthly Data Table
        function setupMonthlyDataTableListeners() {
            const saveAsExcelBtn = byId('saveAsExcel');
            if (saveAsExcelBtn) {
                saveAsExcelBtn.addEventListener('click', saveAsExcel);
            }
            
            const refreshBtn = byId('refreshMonthlyData');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    console.log('Manual refresh of monthly data table');
                    renderMonthlyDataTable();
                    showToast('Monthly data refreshed', 'success');
                });
            }
        }
        
        // Global function to refresh monthly data table
        window.refreshMonthlyDataTable = function() {
            console.log('Global refresh of monthly data table called');
            if (isReportsPage()) {
                renderMonthlyDataTable();
            }
        };
    
    // Ensure crypto.randomUUID is available
    if (!crypto.randomUUID) {
        crypto.randomUUID = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        console.log('Added fallback for crypto.randomUUID');
    }
})();
