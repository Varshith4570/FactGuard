'use strict';

const API = 'http://localhost:5000/api';
let token = null;
let userName = '';

// ─── Utility ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setLoading(btnId, spinnerId, labelId, loading) {
    $(btnId).disabled = loading;
    $(spinnerId).style.display = loading ? 'block' : 'none';
    $(labelId).style.display = loading ? 'none' : 'inline';
}

function showErr(id, msg) { $(id).textContent = msg; }
function clearErr(id) { $(id).textContent = ''; }

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
function switchTab(tab) {
    const isLogin = tab === 'login';
    $('login-form').style.display = isLogin ? 'flex' : 'none';
    $('register-form').style.display = isLogin ? 'none' : 'flex';
    $('tab-login').classList.toggle('active', isLogin);
    $('tab-reg').classList.toggle('active', !isLogin);
}

// ─── Register ─────────────────────────────────────────────────────────────────
$('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    clearErr('reg-err');
    $('reg-ok').textContent = '';

    const name = $('reg-name').value.trim();
    const email = $('reg-email').value.trim();
    const password = $('reg-password').value;

    if (password.length < 6) { showErr('reg-err', 'Password must be at least 6 characters'); return; }

    try {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) { showErr('reg-err', data.error || 'Registration failed'); return; }
        $('reg-ok').textContent = '✅ Account created! Please sign in.';
        $('register-form').reset();
        setTimeout(() => switchTab('login'), 1500);
    } catch {
        showErr('reg-err', 'Network error — is the server running?');
    }
});

// ─── Login ────────────────────────────────────────────────────────────────────
$('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    clearErr('login-err');

    const email = $('email').value.trim();
    const password = $('password').value;

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) { showErr('login-err', data.error || 'Login failed'); return; }

        token = data.token;
        userName = data.user.name;

        $('auth-section').style.display = 'none';
        $('dashboard').style.display = 'block';
        $('nav-user').style.display = 'flex';
        $('nav-username').textContent = `👋 ${userName}`;

        loadHistory();
    } catch {
        showErr('login-err', 'Network error — is the server running?');
    }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
$('nav-logout').addEventListener('click', () => {
    token = null;
    $('dashboard').style.display = 'none';
    $('auth-section').style.display = 'flex';
    $('nav-user').style.display = 'none';
    $('results-card').style.display = 'none';
    $('history-card').style.display = 'none';
    $('login-form').reset();
});

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
const dropZone = $('drop-zone');
const fileInput = $('video-file');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
    $('file-name').textContent = file.name;
    $('file-preview').style.display = 'flex';
    dropZone.style.display = 'none';
    clearErr('verify-err');
}

function clearFile() {
    fileInput.value = '';
    $('file-preview').style.display = 'none';
    dropZone.style.display = 'block';
}

// ─── Verify ───────────────────────────────────────────────────────────────────
$('verify-btn').addEventListener('click', async () => {
    clearErr('verify-err');

    if (!fileInput.files[0]) {
        showErr('verify-err', 'Please select a file first.');
        return;
    }

    setLoading('verify-btn', 'verify-spinner', 'verify-label', true);

    try {
        const fd = new FormData();
        fd.append('video', fileInput.files[0]);

        const res = await fetch(`${API}/verify/file`, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: fd,
        });
        const data = await res.json();

        if (!res.ok) {
            showErr('verify-err', data.error || 'Verification failed');
            return;
        }

        displayResults(data);
        loadHistory();
    } catch (err) {
        showErr('verify-err', 'Network error: ' + err.message);
    } finally {
        setLoading('verify-btn', 'verify-spinner', 'verify-label', false);
    }
});

// ─── Display Results ──────────────────────────────────────────────────────────
function displayResults({ transcript, score, details }) {
    const card = $('results-card');
    card.style.display = 'block';

    // Animate score ring
    const circumference = 314; // 2 * π * 50
    const offset = circumference - (score / 100) * circumference;
    const ring = $('ring-fill');
    ring.style.strokeDashoffset = offset;

    // Color based on score
    let color, label, cls;
    if (score >= 70) { color = '#22c55e'; label = '✅ Likely Accurate'; }
    else if (score >= 40) { color = '#f59e0b'; label = '⚠️ Mixed Accuracy'; }
    else { color = '#ef4444'; label = '❌ Likely Inaccurate'; }
    ring.style.stroke = color;

    $('score-val').textContent = score;
    const lbl = $('score-label');
    lbl.textContent = label;
    lbl.style.background = color + '22';
    lbl.style.color = color;

    // Transcript
    $('transcript-text').textContent = transcript || 'No transcript available';

    // Claims
    const list = $('claims-list');
    list.innerHTML = details.length ? '<h4 style="margin-bottom:8px;font-size:.9rem;">🔎 Claim Analysis</h4>' : '';
    details.forEach(({ claim, score: cs, snippets }) => {
        const pct = cs * 10;
        const cls = cs >= 7 ? 'high' : cs >= 4 ? 'mid' : 'low';
        const barColor = cs >= 7 ? '#22c55e' : cs >= 4 ? '#f59e0b' : '#ef4444';
        const el = document.createElement('div');
        el.className = `claim-item ${cls}`;
        el.innerHTML = `
      <p class="claim-text"><strong>${claim}</strong></p>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div class="claim-score-bar" style="flex:1;">
          <div class="claim-score-fill" style="width:${pct}%;background:${barColor};"></div>
        </div>
        <span style="font-size:.8rem;color:var(--text2);white-space:nowrap;">${cs}/10</span>
      </div>
      ${snippets ? `<details class="detail-block" style="margin-top:0;"><summary style="font-size:.78rem;">Search context</summary><p class="mono-text">${snippets}</p></details>` : ''}
    `;
        list.appendChild(el);
    });
}

// ─── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
    try {
        const res = await fetch(`${API}/verify/history`, { headers: { 'x-auth-token': token } });
        const data = await res.json();
        if (!res.ok || !data.length) return;

        const card = $('history-card');
        card.style.display = 'block';
        const list = $('history-list');
        list.innerHTML = '';

        data.forEach(r => {
            const score = r.verificationScore || 0;
            const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
            const date = new Date(r.createdAt).toLocaleDateString();
            const el = document.createElement('div');
            el.className = 'hist-item';
            el.innerHTML = `
        <div>
          <div>${r.input || 'Uploaded file'}</div>
          <div class="hist-name">${date}</div>
        </div>
        <span class="hist-score" style="background:${color}22;color:${color};">${score}%</span>
      `;
            list.appendChild(el);
        });
    } catch { /* silently fail */ }
}
