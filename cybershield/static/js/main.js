/* ═══════════════════════════════════════════════
   CyberShield – main.js v4 (Ultra Interactive)
   ═══════════════════════════════════════════════ */
'use strict';

/* ── Toast ──────────────────────────────────────────────── */
function showToast(msg, type='info', ms=3200) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const icons = { success:'bi-check-circle-fill', error:'bi-exclamation-circle-fill', info:'bi-info-circle-fill' };
  const t = document.createElement('div');
  t.className = `toast-item toast-${type}`;
  t.innerHTML = `<i class="bi ${icons[type]||icons.info}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 280); }, ms);
}

/* ── Ripple on buttons ──────────────────────────────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.5;
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;position:absolute;border-radius:50%;background:rgba(255,255,255,.22);animation:rippleAnim .55s ease-out forwards;pointer-events:none;`;
  btn.style.overflow='hidden'; btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
});

/* ── 3-D card tilt on mouse move ────────────────────────── */
(function() {
  const CARDS = '.tool-card,.stat-card,.login-card-solo,.glass-card';
  document.querySelectorAll(CARDS).forEach(card => {
    let raf;
    card.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;  // -1 to 1
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) scale(1.02) translateY(-4px)`;
        card.style.boxShadow = `${-x * 12}px ${y * 12}px 40px rgba(0,0,0,.5), 0 0 40px rgba(79,116,255,.18)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
})();

/* ── Magnetic buttons ───────────────────────────────────── */
(function() {
  document.querySelectorAll('.btn-primary,.btn-success,.nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) * 0.28;
      const dy = (e.clientY - r.top  - r.height / 2) * 0.28;
      btn.style.transform = `translate(${dx}px,${dy}px) translateY(-2px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
})();

/* ── Navbar scroll ──────────────────────────────────────── */
(function() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const cb = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', cb, { passive: true }); cb();
})();

/* ── Mobile nav: close on link click ───────────────────── */
document.querySelectorAll('.navbar-collapse .nav-link').forEach(l => {
  l.addEventListener('click', () => {
    const col = document.getElementById('navbarNav');
    if (col?.classList.contains('show')) bootstrap.Collapse.getInstance(col)?.hide();
  });
});

/* ── Password visibility toggle ─────────────────────────── */
document.querySelectorAll('.toggle-pwd').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.querySelector(btn.dataset.for);
    if (!inp) return;
    const hidden = inp.type === 'password';
    inp.type = hidden ? 'text' : 'password';
    const i = btn.querySelector('i');
    if (i) i.className = hidden ? 'bi bi-eye-slash' : 'bi bi-eye';
  });
});

/* ── Live password strength (password_checker page) ─────── */
(function() {
  const inp   = document.getElementById('pwd-analyze');
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!inp || !fill) return;

  const chips = {};
  ['length8','length12','upper','lower','digit','special'].forEach(k => {
    chips[k] = document.getElementById(`chip-${k}`);
  });

  function analyze(v) {
    const c = {
      length8:  v.length >= 8,
      length12: v.length >= 12,
      upper:    /[A-Z]/.test(v),
      lower:    /[a-z]/.test(v),
      digit:    /[0-9]/.test(v),
      special:  /[^A-Za-z0-9]/.test(v),
    };
    const score = Object.values(c).filter(Boolean).length;
    const pct   = Math.round(score / 6 * 100);

    fill.style.width = pct + '%';
    fill.classList.remove('danger','warning','success');
    if (score <= 2) fill.classList.add('danger');
    else if (score <= 4) fill.classList.add('warning');
    else fill.classList.add('success');

    if (label) {
      const lbls = ['','Very Weak','Weak','Fair','Good','Strong','Very Strong'];
      const cls  = ['','lbl-weak','lbl-weak','lbl-fair','lbl-good','lbl-strong','lbl-strong'];
      label.textContent = lbls[score] || 'Very Weak';
      label.className   = `strength-lbl ${cls[score]}`;
    }

    Object.keys(c).forEach(k => {
      if (!chips[k]) return;
      chips[k].classList.toggle('pass', c[k]);
      chips[k].classList.toggle('fail', !c[k]);
      const ic = chips[k].querySelector('i');
      if (ic) ic.className = c[k] ? 'bi bi-check-circle-fill' : 'bi bi-x-circle';
    });
  }

  inp.addEventListener('input', () => analyze(inp.value));
  if (inp.value) analyze(inp.value);
})();

/* ── Register: live password match ──────────────────────── */
(function() {
  const p1 = document.getElementById('reg-password');
  const p2 = document.getElementById('reg-confirm');
  const h  = document.getElementById('match-hint');
  if (!p1 || !p2 || !h) return;
  function check() {
    if (!p2.value) { h.textContent=''; return; }
    const ok = p1.value === p2.value;
    h.className = `match-hint ${ok?'match-ok':'match-bad'}`;
    h.innerHTML = ok
      ? '<i class="bi bi-check-circle-fill"></i> Passwords match'
      : '<i class="bi bi-x-circle"></i> Passwords do not match';
  }
  p1.addEventListener('input', check);
  p2.addEventListener('input', check);
})();

/* ── File drag-and-drop ──────────────────────────────────── */
(function() {
  const zone = document.getElementById('drop-zone');
  const inp  = document.getElementById('file-input');
  const bar  = document.getElementById('file-chosen');
  const nm   = document.getElementById('chosen-name');
  if (!zone || !inp) return;

  function setFile(files) {
    if (!files?.length) return;
    if (bar && nm) { nm.textContent = files[0].name; bar.classList.add('active'); }
    showToast(`📄 File ready: ${files[0].name}`, 'info', 2200);
  }

  zone.addEventListener('click', e => { if (e.target !== inp) inp.click(); });
  inp.addEventListener('change', () => setFile(inp.files));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const dt = new DataTransfer();
    [...e.dataTransfer.files].forEach(f => dt.items.add(f));
    inp.files = dt.files;
    setFile(dt.files);
  });
})();

/* ── Hash copy-to-clipboard ──────────────────────────────── */
(function() {
  const box = document.getElementById('hash-box');
  if (!box) return;
  box.addEventListener('click', async () => {
    const txt = box.dataset.hash || [...box.querySelectorAll('.hash-seg')].map(s=>s.textContent).join('');
    try {
      await navigator.clipboard.writeText(txt.trim());
      showToast('✅ SHA256 hash copied to clipboard!', 'success', 2400);
      const h = box.querySelector('.copy-hint');
      if (h) { h.textContent='✓ Copied!'; setTimeout(()=>h.textContent='Click to copy',2000); }
    } catch { showToast('Could not copy — please select manually.','error'); }
  });
})();

/* ── URL "copy" link ─────────────────────────────────────── */
(function() {
  const urlBox = document.getElementById('url-copy-box');
  if (!urlBox) return;
  urlBox.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlBox.dataset.url || urlBox.textContent.trim());
      showToast('URL copied!','info', 1800);
    } catch {}
  });
})();

/* ── Animated number counters ───────────────────────────── */
(function() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseInt(el.dataset.count, 10);
      if (isNaN(end)) return;
      const dur  = 900;
      const step = 16;
      const inc  = end / (dur / step);
      let cur = 0;
      const t = setInterval(() => {
        cur = Math.min(cur + inc, end);
        el.textContent = Math.floor(cur);
        if (cur >= end) { clearInterval(t); el.textContent = end; }
      }, step);
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });
  els.forEach(el => obs.observe(el));
})();

/* ── Fade-up entrance ────────────────────────────────────── */
(function() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (!e.isIntersecting) return;
      // stagger by el index
      const idx = [...els].indexOf(e.target);
      setTimeout(() => e.target.classList.add('visible'), idx * 55);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
})();

/* ── Form submit loading ─────────────────────────────────── */
document.querySelectorAll('form[data-loading]').forEach(form => {
  form.addEventListener('submit', () => {
    const btn = form.querySelector('[data-submit-btn]');
    const ldr = form.querySelector('.scan-loading');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="loader-ring"></span> Processing…';
    }
    if (ldr) ldr.classList.add('active');
  });
});

/* ── Cyber Mesh & Cursor Glow (Global Interactive Background) ── */
(function() {
  const meshCanvas = document.getElementById('cyber-mesh');
  const glow = document.getElementById('cursor-glow');
  if (!meshCanvas) return;
  const ctx = meshCanvas.getContext('2d');
  let W, H, mouse = { x: -1000, y: -1000 };

  function resize() {
    W = meshCanvas.width  = window.innerWidth;
    H = meshCanvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (glow) {
      glow.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
    }
  }, { passive: true });

  const NODE_COUNT = Math.min(100, (W * H) / 10000); // Dense but performance-friendly
  const LINK_DIST = 140;
  const CURSOR_DIST = 180;

  class Node {
    constructor() {
      this.reset(true);
    }
    reset(init) {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.r = Math.random() * 2 + 1;
      this.color = Math.random() > 0.5 ? '79, 116, 255' : '14, 246, 204';
    }
    update() {
      // Gentle drift
      this.x += this.vx;
      this.y += this.vy;

      // Mouse interaction: slight attraction to links, repulsion from core
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CURSOR_DIST) {
        const force = (CURSOR_DIST - dist) / CURSOR_DIST;
        this.vx -= (dx / dist) * force * 0.02;
        this.vy -= (dy / dist) * force * 0.02;
      }

      // Screen wrap
      if (this.x < 0) this.x = W; if (this.x > W) this.x = 0;
      if (this.y < 0) this.y = H; if (this.y > H) this.y = 0;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, 0.4)`;
      ctx.fill();
    }
  }

  const nodes = Array.from({ length: NODE_COUNT }, () => new Node());

  function drawConnections() {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.2;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(79, 116, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(n => {
      n.update();
      n.draw();
    });
    drawConnections();
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ── Typewriter on hero headings ─────────────────────────── */
(function() {
  const el = document.getElementById('hero-typed');
  if (!el) return;
  const words = el.dataset.words?.split('|') || [];
  if (!words.length) return;
  let wi = 0, ci = 0, deleting = false;
  function tick() {
    const word = words[wi];
    if (!deleting) {
      el.textContent = word.substring(0, ci + 1);
      ci++;
      if (ci === word.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = word.substring(0, ci - 1);
      ci--;
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(tick, deleting ? 55 : 85);
  }
  tick();
})();
