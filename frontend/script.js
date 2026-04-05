'use strict';

const API = '/api';
let token = localStorage.getItem('factguard_token') || null;
let userName = localStorage.getItem('factguard_user') || '';

// ─── Utility ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setLoading(btnId, spinnerId, labelId, loading) {
    $(btnId).disabled = loading;
    if ($(spinnerId)) $(spinnerId).style.display = loading ? 'block' : 'none';
    if ($(labelId)) $(labelId).style.display = loading ? 'none' : 'inline';
}

function showToast(msg, type = 'info') {
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
const themeToggleBtn = $('theme-toggle');
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.replace('theme-dark', 'theme-light');
}
themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('theme-dark')) {
        document.body.classList.replace('theme-dark', 'theme-light');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.replace('theme-light', 'theme-dark');
        localStorage.setItem('theme', 'dark');
    }
});

// ─── Auth Tab Switcher ────────────────────────────────────────────────────────
function switchTab(tab) {
    ['login-form', 'register-form', 'forgot-form', 'reset-form'].forEach(id => {
        $(id).style.display = 'none';
    });
    $('tab-login').classList.remove('active');
    $('tab-reg').classList.remove('active');

    if (tab === 'login') {
        $('login-form').style.display = 'flex';
        $('tab-login').classList.add('active');
    } else if (tab === 'register') {
        $('register-form').style.display = 'flex';
        $('tab-reg').classList.add('active');
    } else if (tab === 'forgot-password') {
        $('forgot-form').style.display = 'flex';
    } else if (tab === 'reset-password') {
        $('reset-form').style.display = 'flex';
    }
}

// ─── Landing Page View Switcher ───────────────────────────────────────────────
function showAuthPage() {
    if ($('landing-section')) $('landing-section').style.display = 'none';
    if ($('global-unauth-nav')) $('global-unauth-nav').style.display = 'flex';
    $('auth-section').style.display = 'flex';
    switchTab('login');
}

function showLandingPage() {
    if ($('landing-section')) $('landing-section').style.display = 'block';
    if ($('global-unauth-nav')) $('global-unauth-nav').style.display = 'flex';
    $('auth-section').style.display = 'none';
}

// ─── App View Switcher (Dashboard) ────────────────────────────────────────────
function switchView(viewId) {
    ['view-home', 'view-verify', 'view-history', 'view-about', 'view-support'].forEach(id => {
        $(id).style.display = 'none';
        $(id).classList.remove('active');
    });
    ['link-home', 'link-verify', 'link-history', 'link-about', 'link-support'].forEach(id => {
        $(id).classList.remove('active');
    });

    $(`view-${viewId}`).style.display = 'block';
    // Add short timeout for animation
    setTimeout(() => $(`view-${viewId}`).classList.add('active'), 10);
    $(`link-${viewId}`).classList.add('active');

    if (viewId === 'home') loadStats();
    if (viewId === 'history') loadHistory();
}

// ─── App State Initialization ─────────────────────────────────────────────────
function initApp() {
    if (token) {
        if ($('landing-section')) $('landing-section').style.display = 'none';
        if ($('global-unauth-nav')) $('global-unauth-nav').style.display = 'none';
        $('auth-section').style.display = 'none';
        $('app-container').style.display = 'flex';
        $('nav-username').textContent = userName;
        $('nav-avatar').textContent = userName.charAt(0).toUpperCase();
        switchView('home');
    } else {
        $('app-container').style.display = 'none';
        showLandingPage();
    }
}
initApp();

// ─── Auth API Calls ───────────────────────────────────────────────────────────

// Register
$('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('reg-name').value.trim();
    const username = $('reg-username').value.trim();
    const email = $('reg-email').value.trim();
    const password = $('reg-password').value;

    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    try {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Account created! Please log in.', 'success');
        $('register-form').reset();
        switchTab('login');
    } catch (err) { showToast(err.message, 'error'); }
});

// Login
$('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const identifier = $('login-identifier').value.trim();
    const password = $('password').value;
    const btn = $('login-btn');
    btn.textContent = 'Signing in...';

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        token = data.token;
        userName = data.user.name || data.user.username;
        localStorage.setItem('factguard_token', token);
        localStorage.setItem('factguard_user', userName);

        showToast(`Welcome, ${userName}!`, 'success');
        $('login-form').reset();
        initApp();
    } catch(err) { showToast(err.message, 'error'); }
    finally { btn.innerHTML = '<span>Sign In</span>'; }
});

// Logout
$('nav-logout').addEventListener('click', () => {
    token = null;
    userName = '';
    localStorage.removeItem('factguard_token');
    localStorage.removeItem('factguard_user');
    initApp();
});

// Forgot Password - Request OTP
let pendingEmail = '';
$('forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('forgot-email').value.trim();
    const btn = $('forgot-btn');
    btn.textContent = 'Sending...';

    try {
        const res = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        pendingEmail = email;
        showToast(data.message || 'OTP sent to your email', 'success');
        switchTab('reset-password');
    } catch(err) { showToast(err.message, 'error'); }
    finally { btn.innerHTML = '<span>Send OTP</span>'; }
});

// Reset Password
$('reset-form').addEventListener('submit', async e => {
    e.preventDefault();
    const otp = $('reset-otp').value.trim();
    const newPassword = $('reset-new-password').value;
    const btn = $('reset-btn');
    btn.textContent = 'Resetting...';

    try {
        const res = await fetch(`${API}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingEmail, otp, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        showToast('Password reset! Please log in.', 'success');
        $('reset-form').reset();
        switchTab('login');
    } catch(err) { showToast(err.message, 'error'); }
    finally { btn.innerHTML = '<span>Reset Password</span>'; }
});


// ─── Dashboard Stats & Charts ────────────────────────────────────────────────
let accuracyChartInstance = null;

async function loadStats() {
    if(!token) return;
    try {
        const res = await fetch(`${API}/verify/stats`, { headers: { 'x-auth-token': token } });
        const data = await res.json();
        if (!res.ok) return;

        $('stat-total').textContent = data.totalVerifications;
        $('stat-avg').textContent = `${data.avgScore}%`;

        // Render Chart.js Pie Chart
        const ctx = document.getElementById('accuracyChart').getContext('2d');
        if(accuracyChartInstance) accuracyChartInstance.destroy();

        const { high, mid, low } = data.distribution;
        
        // Only render if there's data to show
        if (high === 0 && mid === 0 && low === 0) {
            $('stat-total').textContent = '0';
            return;
        }

        accuracyChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High Accuracy (>70%)', 'Mixed (40-70%)', 'Low Accuracy (<40%)'],
                datasets: [{
                    data: [high, mid, low],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: 'var(--text)' } }
                },
                cutout: '70%'
            }
        });

    } catch (e) { console.error('Failed to load stats', e); }
}


// ─── Drag & Drop / Upload ────────────────────────────────────────────────────
const dropZone = $('drop-zone');
const fileInput = $('video-file');
if(dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });
}

function setFile(file) {
    $('file-name').textContent = file.name;
    $('file-preview').style.display = 'flex';
    dropZone.style.display = 'none';

    const thumbContainer = $('media-thumb');
    thumbContainer.innerHTML = ''; 

    if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = url; video.muted = true;
        video.style.width = '100%'; video.style.height = '100%'; video.style.objectFit = 'cover';
        video.onloadeddata = () => video.currentTime = Math.min(1, video.duration / 2);
        thumbContainer.appendChild(video);
    } else if (file.type.startsWith('audio/')) {
        thumbContainer.innerHTML = '<span class="audio-icon">🎵</span>';
    } else {
        thumbContainer.innerHTML = '<span class="audio-icon">📄</span>';
    }
}

function clearFile() {
    fileInput.value = '';
    $('file-preview').style.display = 'none';
    dropZone.style.display = 'block';
    const video = $('media-thumb').querySelector('video');
    if (video) URL.revokeObjectURL(video.src);
}

// ─── Verify API Call ─────────────────────────────────────────────────────────
$('verify-btn').addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return showToast('Please select a file to verify.', 'error');

    setLoading('verify-btn', 'verify-spinner', 'verify-label', true);

    const statusTexts = [
        "Extracting audio...",
        "Converting speech to text...",
        "Normalizing transcript...",
        "Identifying factual claims...",
        "Running claim analysis...",
        "Cross-referencing SerpAPI...",
        "Calculating truth cores...",
        "Finalizing report..."
    ];
    let statusIdx = 0;
    const verifyStatusEl = $('verify-status-text');
    if(verifyStatusEl) {
        verifyStatusEl.style.display = 'block';
        verifyStatusEl.textContent = statusTexts[0];
    }
    const statusInterval = setInterval(() => {
        statusIdx = (statusIdx + 1) % statusTexts.length;
        if(verifyStatusEl) verifyStatusEl.textContent = statusTexts[statusIdx];
    }, 2000);

    try {
        const fd = new FormData();
        fd.append('video', file);

        const res = await fetch(`${API}/verify/file`, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: fd,
        });

        clearInterval(statusInterval);
        if(verifyStatusEl) verifyStatusEl.style.display = 'none';

        const rawText = await res.text();
        let data;
        try { data = JSON.parse(rawText); } 
        catch (e) { throw new Error(res.status === 504 ? "Timeout: File too large" : "Server Error"); }

        if (!res.ok) throw new Error(data.error || 'Verification failed');

        displayResults(data);
        showToast('Verification complete!', 'success');
        
        // Refresh stats silently in background
        loadStats(); 
    } catch (err) {
        clearInterval(statusInterval);
        if(verifyStatusEl) verifyStatusEl.style.display = 'none';
        showToast(err.message, 'error');
    } finally {
        setLoading('verify-btn', 'verify-spinner', 'verify-label', false);
    }
});

// ─── Display Results & History ───────────────────────────────────────────────
function displayResults({ transcript, score, details }) {
    $('results-card').style.display = 'block';

    const ring = $('ring-fill');
    const offset = 314 - (score / 100) * 314;
    ring.style.strokeDashoffset = offset;

    let color, label;
    if (score >= 70) { color = '#22c55e'; label = '✅ Likely Accurate'; }
    else if (score >= 40) { color = '#f59e0b'; label = '⚠️ Mixed Accuracy'; }
    else { color = '#ef4444'; label = '❌ Likely Inaccurate'; }
    ring.style.stroke = color;

    // Animation
    const scoreVal = $('score-val');
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / 1000, 1);
        scoreVal.textContent = Math.floor((1 - Math.pow(1 - progress, 4)) * score);
        if (progress < 1) window.requestAnimationFrame(step);
        else scoreVal.textContent = score;
    };
    window.requestAnimationFrame(step);

    const lbl = $('score-label');
    lbl.textContent = label;
    lbl.style.background = color + '22';
    lbl.style.color = color;

    $('transcript-text').textContent = transcript || 'No transcript available';

    const list = $('claims-list');
    list.innerHTML = details.length ? '<h4 style="margin-bottom:10px;">🔎 Claim Analysis</h4>' : '';
    details.forEach(({ claim, score: cs, snippets }) => {
        const pct = cs * 10;
        const cls = cs >= 7 ? 'high' : cs >= 4 ? 'mid' : 'low';
        const barColor = cs >= 7 ? '#22c55e' : cs >= 4 ? '#f59e0b' : '#ef4444';
        
        const el = document.createElement('div');
        el.className = `claim-item ${cls}`;
        el.innerHTML = `
          <p class="claim-text"><strong>${claim}</strong></p>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="claim-score-bar" style="flex:1;">
              <div class="claim-score-fill" style="width:${pct}%;background:${barColor};"></div>
            </div>
            <span style="font-size:.8rem;color:var(--text2);">${cs}/10</span>
          </div>
          ${snippets ? `<details class="detail-block" style="margin-top:10px;"><summary>Search context</summary><p class="mono-text">${snippets}</p></details>` : ''}
        `;
        list.appendChild(el);
    });
}

async function loadHistory() {
    if(!token) return;
    try {
        const res = await fetch(`${API}/verify/history`, { headers: { 'x-auth-token': token } });
        const data = await res.json();
        if (!res.ok) return;

        const list = $('history-list');
        list.innerHTML = '';

        if (!data || data.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👻</div>
                    <p>You haven't verified any content yet.<br>Go to New Verification to start!</p>
                </div>
            `;
            return;
        }

        data.forEach(r => {
            const score = r.verificationScore || 0;
            const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
            const date = new Date(r.createdAt).toLocaleDateString();
            
            const el = document.createElement('div');
            el.className = 'hist-item';
            el.innerHTML = `
              <div>
                <div style="font-weight:600;">${r.input || 'Uploaded file'}</div>
                <div class="hist-name">${date}</div>
              </div>
              <span class="hist-score" style="background:${color}22;color:${color};">${score}%</span>
            `;
            
            el.addEventListener('click', () => {
                switchView('verify');
                displayResults({ transcript: r.transcript, score, details: r.details || [] });
                $('file-preview').style.display = 'none';
                $('drop-zone').style.display = 'block';
                window.scrollTo({top: 0, behavior: 'smooth'});
            });
            list.appendChild(el);
        });
    } catch (e) {
        console.error(e);
    }
}
