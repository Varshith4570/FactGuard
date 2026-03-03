'use strict';

const API = '/api';
let token = null;
let userName = '';

// ─── Utility ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setLoading(btnId, spinnerId, labelId, loading) {
    $(btnId).disabled = loading;
    $(spinnerId).style.display = loading ? 'block' : 'none';
    $(labelId).style.display = loading ? 'none' : 'inline';
}

function showToast(msg, type = 'info') {
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 3000);
}

function showErr(id, msg) { showToast(msg, 'error'); }
function clearErr(id) { /* No-op, managed by toasts now */ }

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
        showToast('Account created successfully! Please log in.', 'success');
        $('register-form').reset();
        setTimeout(() => switchTab('login'), 1500);
    } catch {
        showErr('reg-err', 'Network error — is the server running?');
    }
});

// Password Strength Meter Logic
$('reg-password').addEventListener('input', (e) => {
    const val = e.target.value;
    const bar = $('strength-bar');
    const txt = $('strength-text');

    if (!val) {
        bar.style.width = '0%';
        txt.textContent = '';
        return;
    }

    let strength = 0;
    if (val.length >= 6) strength += 1;
    if (val.length >= 10) strength += 1;
    if (/[A-Z]/.test(val)) strength += 1;
    if (/[0-9]/.test(val)) strength += 1;
    if (/[^A-Za-z0-9]/.test(val)) strength += 1;

    let pct = '0%';
    let color = '';
    let label = '';

    if (strength <= 1) { pct = '25%'; color = '#ef4444'; label = 'Weak'; }
    else if (strength <= 3) { pct = '60%'; color = '#f59e0b'; label = 'Good'; }
    else { pct = '100%'; color = '#22c55e'; label = 'Strong'; }

    // Required minimum length coloring override
    if (val.length < 6) {
        color = '#ef4444';
        label = 'Too short';
        pct = '15%';
    }

    bar.style.width = pct;
    bar.style.backgroundColor = color;
    txt.textContent = label;
    txt.style.color = color;
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
        showToast(`Welcome back, ${userName}!`, 'success');

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

    // Generate media preview
    const thumbContainer = $('media-thumb');
    thumbContainer.innerHTML = ''; // Clear previous

    if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration / 2); // Seek to 1s or middle
        };
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

    // Revoke any created object URLs to prevent memory leaks
    const video = $('media-thumb').querySelector('video');
    if (video) URL.revokeObjectURL(video.src);
}

// ─── Verify ───────────────────────────────────────────────────────────────────
$('verify-btn').addEventListener('click', async () => {
    clearErr('verify-err');

    const file = fileInput.files[0];

    if (!file) {
        showErr('verify-err', 'Please select a file to verify first.');
        return;
    }

    setLoading('verify-btn', 'verify-spinner', 'verify-label', true);

    try {
        const fd = new FormData();
        fd.append('video', file);

        const res = await fetch(`${API}/verify/file`, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: fd,
        });

        const rawText = await res.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error("Backend returned non-JSON:", rawText);
            const statusErr = res.status === 504 ? "Proxy Timeout (takes too long)" : "Server Error";
            showErr('verify-err', `${statusErr}: Unexpected response from server. Check console.`);
            return;
        }

        if (!res.ok) {
            showErr('verify-err', data.error || 'Verification failed');
            return;
        }

        displayResults(data);
        showToast('Verification complete!', 'success');
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

    // Animate score number counting up
    const scoreVal = $('score-val');
    let startTimestamp = null;
    const duration = 1200; // ms
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing function for smoother stop
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        scoreVal.textContent = Math.floor(easeOutQuart * score);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            scoreVal.textContent = score; // Ensure exact final value
        }
    };
    window.requestAnimationFrame(step);
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

        if (!data || data.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👻</div>
                    <p>You haven't verified any content yet.<br>Upload a video above to get started!</p>
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
            el.style.cursor = 'pointer';
            el.title = 'Click to view full details';
            el.innerHTML = `
        <div>
          <div>${r.input || 'Uploaded file'}</div>
          <div class="hist-name">${date}</div>
        </div>
        <span class="hist-score" style="background:${color}22;color:${color};">${score}%</span>
      `;

            // Add click listener to view past report
            el.addEventListener('click', () => {
                displayResults({
                    id: r._id,
                    transcript: r.transcript,
                    score: r.verificationScore,
                    details: r.details || []
                });

                // Hide file preview if viewing history
                $('file-preview').style.display = 'none';
                $('drop-zone').style.display = 'block';

                // Scroll up to see it
                $('dashboard').scrollIntoView({ behavior: 'smooth' });
                showToast(`Viewing past report for: ${r.input || 'File'}`, 'info');
            });

            list.appendChild(el);
        });
    } catch { /* silently fail */ }
}

