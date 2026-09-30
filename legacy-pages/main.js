/**
 * CAOZ OFFICIAL STREAMER PORTAL - MAIN SCRIPT
 * Manejo dinámico de partículas rojas, contadores animados, reproductor y chat en vivo
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticleBackground();
  initTypewriter();
  initNavbarAndScroll();
  renderDynamicContent();
  initStreamPlayerAndChat();
  initAnimatedCounters();
  initContactForm();
});

/* ===================================================================
   1. CANVAS DE PARTÍCULAS CYBERPUNK ROJAS
   =================================================================== */
function initParticleBackground() {
  const canvas = document.getElementById('particlesCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor(window.innerWidth / 16), 80);

  const colors = [
    'rgba(255, 23, 68, 0.75)',   // Neon Crimson Red
    'rgba(255, 61, 0, 0.65)',    // Fiery Scarlet
    'rgba(255, 120, 120, 0.55)', // Light Cyber Red
    'rgba(255, 0, 56, 0.7)'      // Deep Neon Red
  ];

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = Math.random() * 2.2 + 1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.vx = (Math.random() - 0.5) * 0.75;
      this.vy = (Math.random() - 0.5) * 0.75;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 115) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 23, 68, ${0.18 * (1 - dist / 115)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(render);
  }

  render();
}

/* ===================================================================
   2. EFECTO TYPEWRITER EN HERO
   =================================================================== */
function initTypewriter() {
  const target = document.getElementById('typewriterText');
  if (!target) return;

  const phrases = [
    "Streamer y creador gaming con más de 1M de suscriptores en YouTube.",
    "Código de creador en la tienda: CAOZ. ¡Úsalo y apoya el contenido!",
    "Gaming, entretenimiento y transmisiones en vivo al nivel más alto."
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 50;

  function typeLoop() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      target.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 22;
    } else {
      target.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 55;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      typeSpeed = 2400;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typeSpeed = 400;
    }

    setTimeout(typeLoop, typeSpeed);
  }

  typeLoop();
}

/* ===================================================================
   3. NAVEGACIÓN, BARRA DE PROGRESO Y BOTÓN SCROLL
   =================================================================== */
function initNavbarAndScroll() {
  const navbar = document.getElementById('navbar');
  const scrollProgress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const currentYearSpan = document.getElementById('currentYear');

  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;

    if (scrollProgress) {
      scrollProgress.style.width = `${progress}%`;
    }

    if (scrollTop > 80) {
      navbar.classList.add('scrolled');
      if (backToTop) backToTop.classList.add('visible');
    } else {
      navbar.classList.remove('scrolled');
      if (backToTop) backToTop.classList.remove('visible');
    }
  });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }
}

/* ===================================================================
   4. RENDERIZADO DINÁMICO DE CONTENIDO DESDE CONFIG.JS
   =================================================================== */
function renderDynamicContent() {
  if (typeof CREATOR_CONFIG === 'undefined') return;

  // Iconos oficiales (Kick con su logo original)
  const platformIcons = {
    tiktok: `<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>`,
    youtube: `<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    kick: `<img src="assets/kick_logo.png" alt="Kick" style="width:20px; height:20px; object-fit:contain;" />`,
    twitch: `<svg viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`,
    discord: `<svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.04.034.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`
  };

  // 1. Métricas Grid
  const metricsGrid = document.getElementById('metricsGrid');
  if (metricsGrid && CREATOR_CONFIG.stats) {
    let totalCombinedCount = 0;
    metricsGrid.innerHTML = CREATOR_CONFIG.stats.map(s => {
      totalCombinedCount += s.count;
      return `
        <div class="metric-card" style="--platform-color: ${s.color};">
          <div class="metric-header">
            <div class="metric-platform-badge">
              <div class="metric-icon-wrap" style="color: ${s.color};">
                ${platformIcons[s.platform] || ''}
              </div>
              <span>${s.name}</span>
            </div>
            <span style="font-size:0.7rem; font-weight:700; color:${s.color}; font-family:var(--font-display);">OFICIAL</span>
          </div>
          <div class="metric-number-display counter-num" data-target="${s.count}">${formatNumber(s.count)}</div>
          <div class="metric-label">${s.label}</div>
          <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="metric-link">
            <span>${s.handle}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      `;
    }).join('');

    const totalReachElem = document.getElementById('totalReachNumber');
    if (totalReachElem) {
      totalReachElem.setAttribute('data-target', totalCombinedCount);
    }
  }

  // 2. Paneles de Colaboraciones: ÚNICAMENTE Red Bull, Logitech y Kick (con logo original)
  const brandsGrid = document.getElementById('brandsGrid');
  if (brandsGrid && CREATOR_CONFIG.brands) {
    brandsGrid.innerHTML = CREATOR_CONFIG.brands.map(b => {
      let logoContent = `<div class="brand-title">${b.name}</div>`;
      if (b.logoType === 'image' && b.logoImg) {
        logoContent = `
          <div class="brand-logo-img-wrap" style="display:flex; justify-content:center; align-items:center; margin-bottom:12px; height:55px;">
            <img src="${b.logoImg}" alt="${b.name}" style="height:48px; max-width:180px; width:auto; object-fit:contain; filter:drop-shadow(0 0 12px ${b.accent ? b.accent + '80' : 'rgba(255,255,255,0.4)'});" />
          </div>
          <div class="brand-title" style="color:${b.accent || '#fff'};">${b.name}</div>
        `;
      } else if (b.logoType === 'svg' && b.svgPath) {
        logoContent = `
          <div class="brand-logo-svg-wrap" style="display:flex; justify-content:center; align-items:center; margin-bottom:12px; height:55px; color:${b.accent || '#00b8fc'}; filter:drop-shadow(0 0 12px ${b.accent ? b.accent + '80' : 'rgba(0,184,252,0.6)'});">
            <svg viewBox="${b.svgViewBox || '0 0 110 30'}" style="height:42px; width:auto; max-width:160px; display:block;" aria-label="${b.name}">
              ${b.svgPath}
            </svg>
          </div>
          <div class="brand-title" style="color:${b.accent || 'var(--neon-cyan)'};">${b.name}</div>
        `;
      }
      return `
        <div class="brand-card" style="border-color:${b.accent ? b.accent + '40' : 'var(--border-subtle)'};">
          ${logoContent}
          <div class="brand-role" style="color:${b.accent || 'var(--neon-red)'}; font-size:0.9rem; font-weight:600;">${b.role}</div>
        </div>
      `;
    }).join('');
  }

  // 3. Links Hub (Linktree)
  const linksCardsGrid = document.getElementById('linksCardsGrid');
  if (linksCardsGrid && CREATOR_CONFIG.stats) {
    linksCardsGrid.innerHTML = CREATOR_CONFIG.stats.map(s => `
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="link-hub-card" style="--platform-color: ${s.color};">
        <div class="lhc-icon">
          ${platformIcons[s.platform] || ''}
        </div>
        <div class="lhc-info">
          <span class="lhc-name">${s.name}</span>
          <span class="lhc-handle">${s.handle}</span>
        </div>
        <svg class="lhc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
    `).join('');
  }
}

/* ===================================================================
   5. REPRODUCTOR DE STREAM & CHAT EN VIVO MULTIPLATAFORMA
   =================================================================== */
function initStreamPlayerAndChat() {
  const btnKick = document.getElementById('btnStreamKick');
  const btnTwitch = document.getElementById('btnStreamTwitch');
  const btnYoutube = document.getElementById('btnStreamYoutube');
  const videoPlayer = document.getElementById('liveVideoPlayer');
  const chatFrame = document.getElementById('liveChatFrame');
  const streamExternalLink = document.getElementById('streamExternalLink');
  const streamChannelTitle = document.getElementById('streamChannelTitle');
  const streamPlatformLabel = document.getElementById('streamPlatformLabel');
  const chatPlatformTitle = document.getElementById('chatPlatformTitle');
  const btnToggleTheater = document.getElementById('btnToggleTheater');
  const streamArena = document.getElementById('streamArena');

  if (!videoPlayer || !chatFrame) return;

  const currentHost = window.location.hostname || 'localhost';

  function setPlatform(platform) {
    [btnKick, btnTwitch, btnYoutube].forEach(btn => btn?.classList.remove('active'));

    if (platform === 'kick') {
      btnKick?.classList.add('active');
      const kickConfig = CREATOR_CONFIG.streams.kick;
      videoPlayer.src = kickConfig.playerUrl;
      chatFrame.src = kickConfig.chatUrl;
      if (streamExternalLink) streamExternalLink.href = kickConfig.channelUrl;
      if (streamChannelTitle) streamChannelTitle.textContent = `${CREATOR_CONFIG.name} // Directo en Kick`;
      if (streamPlatformLabel) streamPlatformLabel.textContent = `Plataforma activa: Kick (kick.com/${kickConfig.username})`;
      if (chatPlatformTitle) chatPlatformTitle.textContent = `Chat en Vivo — Kick`;
    } 
    else if (platform === 'twitch') {
      btnTwitch?.classList.add('active');
      const twitchConfig = CREATOR_CONFIG.streams.twitch;
      videoPlayer.src = `https://player.twitch.tv/?channel=${twitchConfig.username}&parent=${currentHost}&parent=localhost&parent=127.0.0.1&autoplay=false`;
      chatFrame.src = `https://www.twitch.tv/embed/${twitchConfig.username}/chat?parent=${currentHost}&parent=localhost&parent=127.0.0.1&darkpopout`;
      if (streamExternalLink) streamExternalLink.href = twitchConfig.channelUrl;
      if (streamChannelTitle) streamChannelTitle.textContent = `${CREATOR_CONFIG.name} // Directo en Twitch (caozssj)`;
      if (streamPlatformLabel) streamPlatformLabel.textContent = `Plataforma activa: Twitch (${twitchConfig.username})`;
      if (chatPlatformTitle) chatPlatformTitle.textContent = `Chat en Vivo — Twitch`;
    }
    else if (platform === 'youtube') {
      btnYoutube?.classList.add('active');
      const ytConfig = CREATOR_CONFIG.streams.youtube;
      videoPlayer.src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${ytConfig.username}`;
      chatFrame.src = `https://www.youtube.com/live_chat?channel=${ytConfig.username}`;
      if (streamExternalLink) streamExternalLink.href = ytConfig.channelUrl;
      if (streamChannelTitle) streamChannelTitle.textContent = `${CREATOR_CONFIG.name} // Canal YouTube (@${ytConfig.username})`;
      if (streamPlatformLabel) streamPlatformLabel.textContent = `Plataforma activa: YouTube (@${ytConfig.username})`;
      if (chatPlatformTitle) chatPlatformTitle.textContent = `Chat en Vivo — YouTube`;
    }
  }

  btnKick?.addEventListener('click', () => setPlatform('kick'));
  btnTwitch?.addEventListener('click', () => setPlatform('twitch'));
  btnYoutube?.addEventListener('click', () => setPlatform('youtube'));

  if (btnToggleTheater && streamArena) {
    btnToggleTheater.addEventListener('click', () => {
      streamArena.classList.toggle('theater-mode');
      const isTheater = streamArena.classList.contains('theater-mode');
      btnToggleTheater.querySelector('span').textContent = isTheater ? 'Vista Estándar' : 'Modo Teatro';
    });
  }
}

/* ===================================================================
   6. CONTADORES NUMÉRICOS ANIMADOS (COUNT-UP)
   =================================================================== */

// Formatea un número como K o M según su magnitud
function formatNumber(n) {
  if (n >= 1000000) {
    const val = n / 1000000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, '')) + 'M';
  } else if (n >= 1000) {
    const val = n / 1000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.?0+$/, '')) + 'K';
  }
  return n.toString();
}

function initAnimatedCounters() {
  const counterElements = document.querySelectorAll('.counter-num, #totalReachNumber');

  function animateValue(elem, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress === 1 ? end : end * (1 - Math.pow(2, -10 * progress)));
      elem.textContent = formatNumber(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        elem.textContent = formatNumber(end);
      }
    };
    window.requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const targetNumber = parseInt(entry.target.getAttribute('data-target'), 10);
        if (!isNaN(targetNumber)) {
          animateValue(entry.target, 0, targetNumber, 2000);
        }
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  counterElements.forEach(el => observer.observe(el));
}

/* ===================================================================
   7. FORMULARIO DE CONTACTO & ALERTA TOAST
   =================================================================== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const toast = document.getElementById('toastAlert');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Enviando mensaje...</span>`;
    submitBtn.disabled = true;

    setTimeout(() => {
      form.reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;

      if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 5000);
      }
    }, 1000);
  });
}
