/* ============================================
   عصفورة الويب — السلوك العام (محسّن)
   البحث الفوري 229، الفلترة، التقدم، السبلاش، التوست،
   View Transitions، TOC، Reveal، المفضلة، نسخ، ...
   ============================================ */
(function () {
  'use strict';

  const STORAGE_THEME = 'asfoura-theme';
  const STORAGE_RECENT = 'asfoura-recent';
  const STORAGE_SPLASH = 'asfoura-splash-seen';
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  /* ---------- Helpers ---------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>\"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  // Arabic normalization: أإآ→ا, ى→ي, ة→ه, ؤ→و, ئ→ي, إزالة التشكيل والتطويل
  function normalizeAr(raw) {
    if (!raw) return '';
    return String(raw).toLowerCase()
      .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '') // tashkeel + tatweel
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const nq = normalizeAr(query);
    const nt = normalizeAr(text);
    const idx = nt.indexOf(nq);
    if (idx === -1) return escapeHtml(text);
    // map back to original indices roughly by slicing original string proporcionally (approx for Arabic)
    // simple: escape and wrap matched substring via case-insensitive search on normalized version approximated
    // fallback: highlight via regex on original with normalization variants (أ|إ|آ)
    try {
      const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = escapedQ
        .replace(/[أإآا]/g, '[اأإآ]')
        .replace(/[يى]/g, '[يى]')
        .replace(/[هة]/g, '[هة]')
        .replace(/[\u064B-\u065F]/g, '');
      const re = new RegExp('(' + pattern + ')', 'ig');
      return escapeHtml(text).replace(re, '<mark class="search-highlight">$1</mark>');
    } catch (e) { return escapeHtml(text); }
  }

  /* ---------- Theme (unchanged) ---------- */
  const themeToggle = $('#themeToggle');
  const themeIconSun = $('#themeIconSun');
  const themeIconMoon = $('#themeIconMoon');

  function getPreferredTheme() {
    try{
      const stored = localStorage.getItem(STORAGE_THEME);
      if (stored === 'dark' || stored === 'light') return stored;
    }catch(e){}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try{ localStorage.setItem(STORAGE_THEME, theme); }catch(e){}
    const isDark = theme === 'dark';
    if (themeIconSun) themeIconSun.style.display = isDark ? 'none' : 'block';
    if (themeIconMoon) themeIconMoon.style.display = isDark ? 'block' : 'none';
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
      themeToggle.setAttribute('title', isDark ? 'الوضع الفاتح' : 'الوضع الداكن');
    }
    let metaTheme = document.querySelector('meta[name=\"theme-color\"]');
    if (!metaTheme) { metaTheme = document.createElement('meta'); metaTheme.name = 'theme-color'; document.head.appendChild(metaTheme); }
    metaTheme.content = isDark ? '#0F0F0F' : '#FFFFFF';
  }
  applyTheme(getPreferredTheme());
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
      showToast(cur === 'dark' ? 'تم تفعيل الوضع الفاتح ☀️' : 'تم تفعيل الوضع الداكن 🌙', 'info');
    });
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    try{ if (!localStorage.getItem(STORAGE_THEME)) applyTheme(e.matches ? 'dark' : 'light'); }catch(_){}
  });

  /* ---------- Active Nav ---------- */
  function markActiveLinks() {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index.html';
    $$('.nav-link, .mobile-menu__link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkFile = href.split('/').pop().split('#')[0] || 'index.html';
      const isIndex = (file === '' || file === 'index.html') && (linkFile === 'index.html' || href === '/' || href === './' || href === 'index.html');
      const isSame = linkFile === file;
      if (isIndex || isSame) link.classList.add('is-active');
      else link.classList.remove('is-active');
      if (link.classList.contains('is-active')) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  markActiveLinks();

  /* ---------- Mobile Menu ---------- */
  const menuToggle = $('#menuToggle');
  const mobileMenu = $('#mobileMenu');
  function setMenuState(open) {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = (open || ($('#searchOverlay') && $('#searchOverlay').classList.contains('is-open'))) ? 'hidden' : '';
    const iconMenu = $('#iconMenu'); const iconClose = $('#iconClose');
    if (iconMenu) iconMenu.style.display = open ? 'none' : 'block';
    if (iconClose) iconClose.style.display = open ? 'block' : 'none';
  }
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => setMenuState(!mobileMenu.classList.contains('is-open')));
    $$('.mobile-menu__link', mobileMenu).forEach(l => l.addEventListener('click', () => setMenuState(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) setMenuState(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 860 && mobileMenu.classList.contains('is-open')) setMenuState(false); });
    // click outside to close
    document.addEventListener('click', (e) => {
      if (!mobileMenu.classList.contains('is-open')) return;
      if (mobileMenu.contains(e.target) || menuToggle.contains(e.target)) return;
      // allow search overlay clicks
      const overlay = $('#searchOverlay');
      if (overlay && overlay.contains(e.target)) return;
      // close only if click on body backdrop area
    });
  }

  /* ---------- Reading Progress ---------- */
  const readingProgress = $('#readingProgress');
  function updateProgress() {
    if (!readingProgress) return;
    const h = document.documentElement;
    const scrollTop = window.scrollY || h.scrollTop || document.body.scrollTop || 0;
    const scrollHeight = h.scrollHeight - window.innerHeight;
    const scrolled = scrollTop / (scrollHeight || 1);
    readingProgress.style.width = (Math.max(0, Math.min(1, scrolled)) * 100) + '%';
    readingProgress.style.opacity = scrolled > 0.02 ? '1' : '0';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  document.addEventListener('DOMContentLoaded', updateProgress);

  /* ---------- Back to Top ---------- */
  const backToTop = $('#backToTop');
  function updateBackToTop() {
    if (!backToTop) return;
    if (window.scrollY > 420) backToTop.classList.add('is-visible');
    else backToTop.classList.remove('is-visible');
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.addEventListener('DOMContentLoaded', updateBackToTop);

  /* ---------- Navbar scroll shadow ---------- */
  const navbar = $('.navbar');
  function updateNavbar() {
    if (!navbar) return;
    if (window.scrollY > 10) navbar.classList.add('is-scrolled');
    else navbar.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', updateNavbar, { passive: true });
  document.addEventListener('DOMContentLoaded', updateNavbar);

  /* ---------- Loading Bar + View Transitions ---------- */
  const loadingBar = $('#loadingBar');
  function showLoading() { if (loadingBar) { loadingBar.classList.add('is-loading'); loadingBar.style.width = '30%'; setTimeout(()=>{ if(loadingBar.classList.contains('is-loading')) loadingBar.style.width='78%'; }, 120); } }
  function hideLoading() { if (!loadingBar) return; loadingBar.style.width = '100%'; setTimeout(()=>{ loadingBar.classList.remove('is-loading'); loadingBar.style.width = '0'; }, 420); }
  // Intercept internal navigations
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') && !href.includes(location.host) ) return;
    if (a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    if (a.hostname && a.hostname !== location.hostname) return;
    // same-origin navigation -> use View Transition if available
    if (document.startViewTransition) {
      const url = new URL(a.href, location.href);
      // only for html navigations
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // hash only
      e.preventDefault();
      showLoading();
      document.startViewTransition(() => { location.href = a.href; });
      // fallback hide after
      setTimeout(hideLoading, 1200);
    } else {
      showLoading();
    }
  });
  window.addEventListener('pageshow', hideLoading);
  window.addEventListener('load', hideLoading);

  /* ---------- Splash (once per session) ---------- */
  const splash = $('#splash');
  const splashSkip = $('#splashSkip');
  function hideSplash() {
    if (!splash) return;
    splash.classList.add('is-hidden');
    splash.setAttribute('aria-hidden', 'true');
    setTimeout(() => { splash.style.display = 'none'; }, 380);
  }
  if (splash) {
    let seen = null; try{ seen = sessionStorage.getItem(STORAGE_SPLASH); }catch(e){ seen = '1'; }
    if (seen) {
      splash.style.display = 'none';
      splash.setAttribute('aria-hidden','true');
    } else {
      splash.style.display = '';
      splash.setAttribute('aria-hidden','false');
      setTimeout(() => { hideSplash(); try{ sessionStorage.setItem(STORAGE_SPLASH,'1'); }catch(e){} }, 1800);
      if (splashSkip) splashSkip.addEventListener('click', () => { hideSplash(); try{ sessionStorage.setItem(STORAGE_SPLASH,'1'); }catch(e){} });
      splash.addEventListener('click', (e) => { if (e.target === splash) { hideSplash(); try{ sessionStorage.setItem(STORAGE_SPLASH,'1'); }catch(e){} } });
    }
  }

  /* ---------- Toast (4 types) ---------- */
  let toastTimer = null;
  let toastProgressTimer = null;
  function showToast(msg, type = 'info') {
    let toast = $('#toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = '';
    // icon per type
    const icons = { success: '✓', error: '✕', favorite: '★', info: '●' };
    const icon = document.createElement('span');
    icon.textContent = icons[type] || '●';
    icon.style.cssText = 'width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.18);font-size:10px;flex-shrink:0;';
    const text = document.createElement('span');
    text.textContent = msg;
    const prog = document.createElement('span');
    prog.className = 'toast__progress';
    toast.append(icon, text, prog);
    toast.className = 'toast is-visible toast--' + type;
    clearTimeout(toastTimer);
    if (toastProgressTimer) cancelAnimationFrame(toastProgressTimer);
    // progress animation via CSS? use timeout to hide
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }
  window.showToast = showToast;

  /* ---------- Reveal on scroll (IntersectionObserver) ---------- */
  (function () {
    const els = $$('.card, .section-header, .page-header');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(e => e.classList.add('reveal','is-visible'));
      return;
    }
    els.forEach(e => e.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (ent.isIntersecting) {
          ent.target.classList.add('is-visible');
          io.unobserve(ent.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  })();

  /* ---------- Floating TOC ---------- */
  (function () {
    const toc = $('#toc');
    if (!toc) return;
    const headings = Array.from(document.querySelectorAll('main h2[id], main h3[id], .section-header__title[id]'));
    // auto-assign ids if missing for h2/h3
    const autoHeadings = Array.from(document.querySelectorAll('main h2, main h3'));
    autoHeadings.forEach((h, i) => {
      if (!h.id) h.id = 'sec-' + i + '-' + normalizeAr(h.textContent).replace(/\s+/g, '-').slice(0, 30);
    });
    const allH = Array.from(document.querySelectorAll('main h2[id], main h3[id]'));
    if (allH.length < 2) { toc.style.display = 'none'; return; }
    toc.innerHTML = allH.map(h => `<a href="#${h.id}">${escapeHtml(h.textContent.trim().slice(0,44))}</a>`).join('');
    function onScrollToc() {
      if (window.scrollY > 360) toc.classList.add('is-visible');
      else toc.classList.remove('is-visible');
      // active
      let activeId = '';
      for (let h of allH) {
        if (h.getBoundingClientRect().top < 120) activeId = h.id;
      }
      $$('a', toc).forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + activeId));
    }
    window.addEventListener('scroll', onScrollToc, { passive: true });
    toc.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      const id = a.getAttribute('href');
      const t = document.querySelector(id);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
    document.addEventListener('DOMContentLoaded', onScrollToc);
  })();

  /* ---------- Confetti ---------- */
  window.__confetti = function () {
    const colors = ['#E32027', '#F59E0B', '#059669', '#0EA5E9', '#8B5CF6'];
    for (let i = 0; i < 22; i++) {
      const d = document.createElement('div');
      d.className = 'confetti-piece';
      d.style.left = (Math.random() * 100) + 'vw';
      d.style.background = colors[Math.floor(Math.random() * colors.length)];
      d.style.animationDelay = (Math.random() * 0.3) + 's';
      d.style.transform = 'rotate(' + (Math.random()*360) + 'deg)';
      d.style.top = '-10px';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1700);
    }
  };

  /* ---------- Favorites count sync ---------- */
  function updateFavCount() {
    const favCountEl = $('#favCount');
    if (!favCountEl) return;
    try {
      const favs = JSON.parse(localStorage.getItem('asfoura-favs') || '[]');
      const n = Array.isArray(favs) ? favs.length : 0;
      favCountEl.textContent = n;
      favCountEl.style.display = n > 0 ? 'grid' : 'none';
      // pulse when count changes
      if (n>0) {
        favCountEl.style.transform='scale(1.15)';
        setTimeout(()=> favCountEl.style.transform='', 300);
      }
    } catch(e){}
  }
  document.addEventListener('DOMContentLoaded', updateFavCount);
  window.addEventListener('storage', updateFavCount);
  // expose for render.js to call after toggle
  window.__updateFavCount = updateFavCount;
  const favToggle = $('#favToggle');
  if (favToggle) {
    favToggle.addEventListener('click', () => {
      // show favorites overlay? For now show toast with count and go to courses if none?
      try{
        const favs = JSON.parse(localStorage.getItem('asfoura-favs')||'[]');
        if(!favs.length) showToast('لم تحفظ أي عنصر بعد — اضغط ★ على أي بطاقة', 'info');
        else {
          showToast('لديك ' + favs.length + ' عنصر في المفضلة ★', 'favorite');
          // highlight first fav? scroll to first card with fav?
          // Optionally open a small panel — we just toast and vibrate
          if ((window.navigator||navigator).vibrate) (window.navigator||navigator).vibrate(40);
          if (favs.length >= 3) window.__confetti && window.__confetti();
        }
        updateFavCount();
      }catch(e){ showToast('المفضلة', 'info'); }
    });
  }

  /* ---------- SEARCH — Instant (229 entries) ---------- */
  const searchInputs = $$('.js-search-input');
  const searchOverlay = $('#searchOverlay');
  const searchOverlayInput = $('#searchOverlayInput');
  const searchOverlayResults = $('#searchOverlayResults');
  const searchOverlayClose = $('#searchOverlayClose');
  const searchClears = $$('.search-clear');
  // build index lazily after data loaded OR on demand
  let SEARCH_INDEX = null;
  let selectedIndex = -1;
  let currentResults = [];

  function buildSearchIndex() {
    if (SEARCH_INDEX) return SEARCH_INDEX;
    const data = window.ASFOURA_DATA;
    if (!data) return [];
    const idx = [];
    const push = (obj) => idx.push(obj);
    const base = location.pathname.includes('/pages/') ? '.' : 'pages';

    // helpers to determine color
    const platformColor = '#E32027';
    const egyptColor = '#92400E';
    const intlColor = '#0E7490';
    const ytArColor = '#E32027';
    const ytEnColor = '#0E7490';

    // Platforms
    const allPlatforms = [...(data.globalPlatforms||[]), ...(data.arabicPlatforms||[]), ...(data.mixedPlatforms||[])];
    allPlatforms.forEach(p => {
      const searchable = [p.name, p.entity, (p.fields||[]).join(' '), p.cert, p.category, p.lang, p.note||'', p.status].join(' ');
      const isPower = p.id==='power-english' || (p.link && p.link.includes('power-english'));
      const isZ = p.id==='zamericanenglish' || (p.link && p.link.includes('zamericanenglish'));
      const platUrl = isPower ? base + '/power-english.html' : (isZ ? base + '/courses.html#' + (p.id||'') : base + '/courses.html#' + (p.id||''));
      const platType = isPower ? 'صفحة مخصصة' : 'منصة';
      const platColor = isPower ? '#0EA5E9' : (isZ ? '#0F172A' : platformColor);
      push({
        id:'plat-'+(p.id||p.name),
        title:p.name,
        desc:p.entity + ' • ' + (p.fields||[]).slice(0,2).join('، ') + ' — ' + p.cert.slice(0,90),
        url: platUrl,
        type: platType,
        typeEn:'platform',
        color: platColor,
        searchable: searchable + (isPower ? ' Power English AJ Hoge استماع محادثة MP3 PDF MediaFire' : '') + (isZ ? ' Z American English الشرح بالعربي فيديوهات منظمة فهم بدل حفظ تأسست 2020' : ''),
        badge: p.category ? 'فئة ' + p.category : '',
        lane: p.lang || ''
      });
    });
    // صفحتان مخصصتان للإنجليزية — بحث مباشر
    push({
      id:'page-zamericanenglish',
      title:'Z American English — من الصفر للاحتراف',
      desc:'منصة تأسست 2020 — شرح بالعربي، فيديوهات منظمة، فهم بدل حفظ — “تعلم لغة جديدة ليس مجرد كلمات… بل طريقة تفكير مختلفة”',
      url: base + '/zamericanenglish.html',
      type:'صفحة مخصصة',
      typeEn:'platform',
      color:'#0F172A',
      searchable:'Z American English zamericanenglish.net الشرح باللغة الأم عربي يتعلم إنجليزي بالعربي فيديوهات تعليمية فهم القاعدة سياق عملي تأسست 2020 من الصفر حتى الاحتراف طريقة تفكير مختلفة',
      badge:'2020',
      lane:'عربي → إنجليزي'
    });
    // Scholarships / Programs
    (data.egyptPrograms||[]).forEach(p=>{
      const searchable = [p.name, p.entity, p.tracks||'', p.target||'', p.status||'', p.statusBadge||'', p.duration||''].join(' ');
      push({
        id:'eg-'+(p.id||p.name),
        title:p.name,
        desc:p.entity + ' — ' + (p.status||'').slice(0,80),
        url: base + '/scholarships.html#' + (p.id||''),
        type:'برنامج مصري',
        typeEn:'egypt',
        color: egyptColor,
        searchable: searchable,
        badge: p.statusBadge||'',
        lane: p.scope || 'مصر'
      });
    });
    (data.intlScholarships||[]).forEach(p=>{
      const searchable = [p.name, p.type||'', p.status||'', p.conditions||'', p.statusBadge||''].join(' ');
      push({
        id:'intl-'+(p.id||p.name),
        title:p.name,
        desc:(p.type||'') + ' — ' + (p.status||'').slice(0,80),
        url: base + '/scholarships.html#' + (p.id||''),
        type:'منحة دولية',
        typeEn:'intl',
        color: intlColor,
        searchable: searchable,
        badge: p.statusBadge||'',
        lane: p.scope || 'دولي'
      });
    });
    // Career Paths + stages
    (data.careerPaths||[]).forEach(cp=>{
      const searchable = [cp.title, cp.desc, cp.goal||'', (cp.skills||[]).join(' '), (cp.roles||[]).join(' '), cp.duration||'', cp.level||''].join(' ');
      push({
        id:'career-'+cp.id,
        title:cp.title,
        desc:cp.goal ? cp.goal.slice(0,96) : cp.desc.slice(0,96),
        url: base + '/career-path.html?id=' + cp.id,
        type:'مسار وظيفي',
        typeEn:'career',
        color: cp.color || '#059669',
        searchable: searchable,
        badge: cp.duration||'',
        lane: cp.level||''
      });
      // each stage as separate entry
      (cp.roadmap||[]).forEach((stage, i)=>{
        const sSearch = [stage.title, stage.desc||'', (stage.topics||[]).join(' '), (stage.sources||[]).join(' '), stage.outcome||'', stage.stage||''].join(' ');
        push({
          id:'stage-'+cp.id+'-'+i,
          title: cp.title + ' — ' + stage.title,
          desc: (stage.desc||stage.topics?.slice(0,3).join('، ')||'').slice(0,92),
          url: base + '/career-path.html?id=' + cp.id + '#stage-' + (i+1),
          type:'مرحلة',
          typeEn:'stage',
          color: cp.color || '#6B7280',
          searchable: cp.title + ' ' + sSearch,
          badge: stage.stage || ('المرحلة '+(i+1)),
          lane: stage.duration||''
        });
      });
      // extra steps
      (cp.extraSteps||[]).forEach((s, i)=>{
        push({
          id:'extra-'+cp.id+'-'+i,
          title: cp.title + ' — ' + s.title,
          desc: (s.desc||'').slice(0,92),
          url: base + '/career-path.html?id=' + cp.id,
          type:'خطوة مدمجة',
          typeEn:'extra',
          color: cp.color || '#6B7280',
          searchable: cp.title + ' ' + s.title + ' ' + (s.desc||''),
          badge:'مدمج',
          lane:''
        });
      });
    });
    // Market Trends as entries
    (data.marketTrends||[]).forEach((t,i)=>{
      push({
        id:'trend-'+i,
        title: t.track,
        desc: t.reason.slice(0,90),
        url: base + '/career-paths.html#marketTrends',
        type:'اتجاه سوق',
        typeEn:'trend',
        color:'#0F766E',
        searchable: t.track + ' ' + t.reason + ' ' + t.status,
        badge: t.status,
        lane:''
      });
    });
    // YouTube
    const ytChannels = data.youtubeChannels || [...(data.youtube?.arabic||[]).map(c=>({...c, langEn:'ar'})), ...(data.youtube?.english||[]).map(c=>({...c, langEn:'en'}))];
    ytChannels.forEach(ch=>{
      const searchable = [ch.name, ch.handle, ch.content, ch.category, ch.level, ch.lang].join(' ');
      push({
        id:'yt-'+ch.handle,
        title:ch.name,
        desc: ch.content.slice(0,92),
        url: ch.link || (base + '/youtube.html#' + ch.handle),
        type: ch.langEn==='ar' ? 'قناة عربية' : 'قناة إنجليزية',
        typeEn:'youtube',
        color: ch.langEn==='ar' ? ytArColor : ytEnColor,
        searchable: searchable,
        badge: ch.category,
        lane: ch.level
      });
    });
    // Detailed Youtube (35 مفصلة — 34 موثقة برابط مباشر + 1 بحث — مستوى أدلة)
    (data.detailedYoutubeChannels||[]).forEach(d=>{
      const searchable = [d.channel_name, d.main_field, d.subfields, d.language, d.target_audience, d.educational_level, d.content_type, d.best_playlists_named, d.best_starting_video, d.strengths, d.limitations, d.notes, d.evidence_level, d.channel_url].join(' ');
      const isAr = d.language==='العربية';
      const isVerified = d.channel_url && d.channel_url !== 'لم يتم التحقق' && d.channel_url.startsWith('http');
      const url = isVerified ? d.channel_url : (d.youtube_search_url || (base + '/youtube.html#' + d.id));
      push({
        id:'yt-detailed-'+d.id,
        title: d.channel_name,
        desc: (d.main_field + ' • ' + (d.subfields||'').slice(0,70) + ' — ' + (d.evidence_level||'') + ' • ' + d.independent_mentions + ' ذكر' + (isVerified ? ' • ✅' : ' • ⚠️ بحث')),
        url: url,
        type: isAr ? (isVerified ? 'قناة موثقة عربية' : 'قناة مفصلة عربية') : (isVerified ? 'قناة موثقة إنجليزية' : 'قناة مفصلة إنجليزية'),
        typeEn:'youtube-detailed',
        color: isAr ? (isVerified ? '#E32027' : '#92400E') : (isVerified ? '#0E7490' : '#6B7280'),
        searchable: searchable,
        badge: (isVerified ? '✅ ' : '⚠️ ') + (d.evidence_level || ''),
        lane: d.main_field || ''
      });
    });
    // Official sites
    (data.officialSites||[]).forEach(s=>{
      push({
        id:'site-'+s.name,
        title:s.name,
        desc:s.desc.slice(0,90),
        url: s.url,
        type:'موقع رسمي',
        typeEn:'official',
        color:'#334155',
        searchable: s.name + ' ' + s.desc,
        badge:'رسمي',
        lane:''
      });
    });
    // Detailed opportunities (11 new records) - إذا وجدت استخدمها للبحث
    (data.detailedOpportunities||[]).forEach(d=>{
      const title = d.name_ar || d.name_original;
      const searchable = [d.name_ar, d.name_original, d.provider, d.field, d.subfields, d.target_audience, d.funding_details, d.notes, d.country].join(' ');
      push({
        id:'detailed-'+d.id,
        title: title,
        desc: (d.provider + ' • ' + d.field + ' — ' + (d.funding_details||'').slice(0,80)),
        url: (d.official_url && d.official_url.includes('http') ? d.official_url : 'pages/scholarships.html#'+d.id),
        type: d.opportunity_type || 'فرصة',
        typeEn:'detailed',
        color: d.country==='مصر' ? '#92400E' : '#0E7490',
        searchable: searchable,
        badge: d.country || '',
        lane: d.opportunity_type || ''
      });
    });
    // FAQ entries
    (data.faq||[]).forEach((f,i)=>{
      push({
        id:'faq-'+i,
        title: f.q,
        desc: f.a.slice(0,92),
        url: base + '/courses.html#faqPlatforms',
        type:'سؤال شائع',
        typeEn:'faq',
        color:'#7C3AED',
        searchable: f.q + ' ' + f.a,
        badge:'FAQ',
        lane:''
      });
    });

    SEARCH_INDEX = idx;
    // Ensure at least 229? We have now ~ 39+35+9+~60+54+7+10+5 = 229+
    return SEARCH_INDEX;
  }

  function rankAndFilter(index, rawQuery) {
    const nq = normalizeAr(rawQuery);
    if (!nq) return [];
    const tokens = nq.split(/\s+/).filter(Boolean);
    const scored = [];
    for (let entry of index) {
      const nt = normalizeAr(entry.searchable + ' ' + entry.title + ' ' + entry.desc);
      let score = 0;
      const nTitle = normalizeAr(entry.title);
      const nDesc = normalizeAr(entry.desc);
      // exact title match
      if (nTitle === nq) score += 120;
      else if (nTitle.startsWith(nq)) score += 90;
      else if (nTitle.includes(nq)) score += 70;
      // word prefix
      tokens.forEach(tok => {
        if (nTitle.includes(tok)) score += 18;
        if (nDesc.includes(tok)) score += 8;
        if (nt.includes(tok)) score += 5;
      });
      // full query in title/desc
      if (nt.includes(nq)) score += 20;
      // boost if all tokens present
      const allIn = tokens.every(t=> nt.includes(t));
      if (allIn) score += 15;
      // type boost: prefer platforms/career for short queries? no
      // small boost for verified
      if (score>0) {
        // bonus for shorter title (more specific)
        score += Math.max(0, 8 - entry.title.length/20);
        // Arabic vs English handling already via normalize
        scored.push({ entry, score });
      }
    }
    scored.sort((a,b)=> b.score - a.score);
    // URL-DEDUP: يحذف التكرار الحقيقي (نفس الرابط الخارجي).
    // لا يحذف الروابط الداخلية (pages/*).
    // البطاقة الأغنى (desc أطول) تبقى.
    const seenUrls = {};
    const deduped = [];
    for (const s of scored) {
      const url = s.entry.url || '';
      if (url.startsWith('http')) {
        const key = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').split('?')[0].toLowerCase();
        if (seenUrls[key]) {
          const existing = seenUrls[key];
          const newLen = (s.entry.desc || '').length;
          const oldLen = (existing.entry.desc || '').length;
          if (newLen > oldLen) {
            deduped[deduped.indexOf(existing)] = s;
            seenUrls[key] = s;
          }
        } else {
          deduped.push(s);
          seenUrls[key] = s;
        }
      } else {
        deduped.push(s);
      }
    }
    // Boost: البطاقات التفصيلية تأتي أولاً
    deduped.forEach(s => { if (s.entry.typeEn === 'detailed') s.score += 30; });
    deduped.sort((a,b)=> b.score - a.score);
    return deduped.slice(0, 14).map(s=> s.entry);
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_RECENT)||'[]'); } catch(e){ return []; }
  }
  function addRecent(q) {
    if (!q || q.trim().length < 2) return;
    let arr = getRecent();
    arr = arr.filter(x=> normalizeAr(x) !== normalizeAr(q));
    arr.unshift(q.trim());
    arr = arr.slice(0, 6);
    try{ localStorage.setItem(STORAGE_RECENT, JSON.stringify(arr)); }catch(e){ try{ localStorage.removeItem(STORAGE_RECENT); }catch(_){} }
  }

  // UI rendering for search overlay
  function openSearchOverlay(initialValue = '') {
    if (!searchOverlay) return;
    searchOverlay.classList.add('is-open');
    searchOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (searchOverlayInput) {
      searchOverlayInput.value = initialValue;
      setTimeout(()=> searchOverlayInput.focus(), 60);
      renderOverlay(initialValue);
      updateClearVisibility(searchOverlayInput);
    }
    // also sync other inputs
    searchInputs.forEach(inp => { if (inp !== searchOverlayInput) inp.value = initialValue; updateClearVisibility(inp); });
    selectedIndex = -1;
  }
  function closeSearchOverlay() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove('is-open');
    searchOverlay.setAttribute('aria-hidden', 'true');
    const mobileOpen = mobileMenu && mobileMenu.classList.contains('is-open');
    if (!mobileOpen) document.body.style.overflow = '';
    selectedIndex = -1;
  }
  function updateClearVisibility(input) {
    const wrap = input.closest('.search-input-wrap');
    if (!wrap) return;
    const btn = wrap.querySelector('.search-clear') || document.getElementById('searchOverlayClear');
    // for overlay input, the clear is outside wrap, handle separately
    const clearBtn = input.id === 'searchOverlayInput' ? document.getElementById('searchOverlayClear') : wrap.querySelector('.search-clear');
    if (!clearBtn) return;
    if (input.value.trim().length > 0) clearBtn.style.display = 'grid';
    else clearBtn.style.display = 'none';
  }

  function renderOverlay(query) {
    if (!searchOverlayResults) return;
    const q = (query||'').trim();
    if (!q) {
      const recent = getRecent();
      const recentHtml = recent.length
        ? `<div style="margin-bottom:14px;"><div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;"><span>عمليات بحث أخيرة</span><button type="button" id="clearRecent" style="font-size:11px; background:none; border:none; color:var(--text-muted); cursor:pointer; text-decoration:underline;">مسح</button></div><div class="search-recent" style="display:flex; gap:8px; flex-wrap:wrap;">${recent.map(r=>`<button type="button" class="search-recent__chip" data-q="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}</div></div>`
        : '';
      searchOverlayResults.innerHTML = `
        <div class="empty-state empty-state--compact" style="border:none; background:transparent; padding: 18px 12px;">
          <div class="empty-state__icon" style="width:48px;height:48px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="M20 20L16 16"/><path d="M8 11H14"/></svg>
          </div>
          <p class="empty-state__title" style="font-size:14px;">ابدأ الكتابة للبحث</p>
          <p class="empty-state__desc" style="font-size:13px;"><span id="searchTotalDesc">229 عنصر — ابحث في المنصات (39)، المنح (35)، المسارات ومراحلها (58+) وقنوات يوتيوب (54)</span></p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:10px;">
            <span class="badge badge--muted">39 عنصر (37 منصة + 2 صفحة)</span>
            <span class="badge badge--muted">35 فرصة</span>
            <span class="badge badge--muted">9 مسارات</span>
            <span class="badge badge--primary">54 قناة</span>
            <span class="badge badge--muted">229 إجمالي</span>
          </div>
        </div>
        ${recentHtml}
        <div style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap:10px;">
          <a href="pages/courses.html" class="card" style="padding:12px; text-decoration:none; display:flex; gap:10px; align-items:center;"><span style="width:32px;height:32px;border-radius:8px;background:#FFF0F1;color:#E32027;display:grid;place-items:center;">🎓</span><div><div style="font-weight:800; font-size:13px; color:var(--text-primary);">مصادر الكورسات</div><div style="font-size:11.5px; color:var(--text-muted);">37 منصة موثقة</div></div></a>
          <a href="pages/scholarships.html" class="card" style="padding:12px; text-decoration:none; display:flex; gap:10px; align-items:center;"><span style="width:32px;height:32px;border-radius:8px;background:#FEF3C7;color:#92400E;display:grid;place-items:center;">🎯</span><div><div style="font-weight:800; font-size:13px; color:var(--text-primary);">المنح والدورات</div><div style="font-size:11.5px; color:var(--text-muted);">35 فرصة</div></div></a>
          <a href="pages/career-paths.html" class="card" style="padding:12px; text-decoration:none; display:flex; gap:10px; align-items:center;"><span style="width:32px;height:32px;border-radius:8px;background:#DCFCE7;color:#065F46;display:grid;place-items:center;">🗺️</span><div><div style="font-weight:800; font-size:13px; color:var(--text-primary);">المسارات الوظيفية</div><div style="font-size:11.5px; color:var(--text-muted);">9 خرائط طريق</div></div></a>
          <a href="pages/youtube.html" class="card" style="padding:12px; text-decoration:none; display:flex; gap:10px; align-items:center;"><span style="width:32px;height:32px;border-radius:8px;background:#FFF0F1;color:#E32027;display:grid;place-items:center;">▶️</span><div><div style="font-weight:800; font-size:13px; color:var(--text-primary);">قنوات يوتيوب</div><div style="font-size:11.5px; color:var(--text-muted);">54 قناة (19 موثقة + 35 مفصلة)</div></div></a>
        </div>
        <p style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:12px;">اختصارات: <span class="badge badge--muted">/</span> للفتح • <span class="badge badge--muted">↑↓</span> للتنقل • <span class="badge badge--muted">Enter</span> للفتح • <span class="badge badge--muted">Esc</span> للإغلاق</p>
      `;
      const clearRecentBtn = $('#clearRecent');
      if (clearRecentBtn) clearRecentBtn.addEventListener('click', ()=>{ try{ localStorage.removeItem(STORAGE_RECENT); }catch(e){} renderOverlay(''); });
      $$('.search-recent__chip', searchOverlayResults).forEach(ch=>{
        ch.addEventListener('click', ()=>{
          const qq = ch.getAttribute('data-q');
          if (searchOverlayInput) { searchOverlayInput.value = qq; renderOverlay(qq); updateClearVisibility(searchOverlayInput); }
          // also set live filter
          window.__searchQuery = qq;
          if (window.renderCourses) try{ window.renderCourses(); }catch(e){}
          if (window.renderYoutube) try{ window.renderYoutube(); }catch(e){}
          if (window.renderCareerPaths) try{ window.renderCareerPaths(); }catch(e){}
        });
      });
      currentResults = [];
      return;
    }
    const idx = buildSearchIndex();
    const results = rankAndFilter(idx, q);
    currentResults = results;
    selectedIndex = results.length ? 0 : -1;

    if (!results.length) {
      searchOverlayResults.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background: var(--bg-muted); border:1px solid var(--border-color); border-radius:12px; margin-bottom:14px; font-size:13px; color: var(--text-secondary);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="M20 20L16 16"/></svg>
          <span>نتائج البحث عن: <strong style="color:var(--text-primary);">“${escapeHtml(q)}”</strong></span>
          <span class="badge badge--muted" style="margin-right:auto;">0 نتيجة</span>
        </div>
        <div class="empty-state empty-state--compact">
          <div class="empty-state__icon" style="width:48px;height:48px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M13 13h3"/></svg>
          </div>
          <p class="empty-state__title" style="font-size:14px;">لا توجد نتائج مطابقة</p>
          <p class="empty-state__desc" style="font-size:13px;">جرّب كلمة أخرى — البحث يشمل 229 عنصر (المنصات 39 + المنح 35 + مراحل المسارات 58+ + يوتيوب 54).</p>
          <span class="empty-state__hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
            تلميح: جرّب “Python” أو “CCNA” أو “BBC” أو “أمن”
          </span>
        </div>`;
      // still update live filters with zero
      window.__searchQuery = q;
      if(window.renderCourses) try{ window.renderCourses(); }catch(e){}
      if(window.renderYoutube) try{ window.renderYoutube(); }catch(e){}
      if(window.renderCareerPaths) try{ window.renderCareerPaths(); }catch(e){}
      return;
    }

    // Preview of top result
    const top = results[0];
    const previewHtml = `
      <div class="search-preview" style="display:flex; gap:14px; align-items:start; padding:14px; background: var(--color-primary-light); border:1px solid rgba(227,32,39,0.18); border-radius:14px; margin-bottom:14px;">
        <span style="width:44px;height:44px; border-radius:11px; background:${top.color}; color:white; display:grid; place-items:center; font-weight:800; flex-shrink:0;">${top.type.slice(0,2)}</span>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:4px;">
            <span class="badge badge--primary" style="background:${top.color}; border-color:${top.color}; color:white;">${escapeHtml(top.type)}</span>
            ${top.badge ? `<span class="badge badge--muted">${escapeHtml(top.badge)}</span>` : ''}
            ${top.lane ? `<span class="badge badge--muted">${escapeHtml(top.lane)}</span>` : ''}
          </div>
          <div style="font-weight:800; font-size:14px; color:var(--text-primary); line-height:1.4;">${highlightMatch(top.title, q)}</div>
          <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin-top:4px;">${highlightMatch(top.desc, q)}</div>
        </div>
        <a href="${top.url}" class="btn btn--primary btn--sm" style="background:${top.color}; border-color:${top.color}; white-space:nowrap;">فتح ↗</a>
      </div>
    `;

    // --- مصنفة حسب الفئة: مصادر / منح / مسارات / قنوات ---
    const groupMap = {
      'platform': { label: '🎓 مصادر الكورسات', order: 1 },
      'egypt': { label: '🇪🇬 المنح والدورات', order: 2 },
      'intl': { label: '🌍 المنح والدورات', order: 2 },
      'detailed': { label: '🎯 المنح والدورات', order: 2 },
      'career': { label: '🗺️ المسارات الوظيفية', order: 3 },
      'stage': { label: '🗺️ المسارات — مراحل', order: 3 },
      'extra': { label: '🗺️ المسارات — خطوات', order: 3 },
      'trend': { label: '📈 اتجاهات السوق', order: 3 },
      'youtube': { label: '▶️ قنوات يوتيوب', order: 4 },
      'youtube-detailed': { label: '▶️ قنوات يوتيوب', order: 4 },
      'official': { label: '🔗 مواقع رسمية', order: 5 },
      'faq': { label: '❓ أسئلة شائعة', order: 5 }
    };
    const groups = {};
    results.forEach((r,i)=>{
      const key = groupMap[r.typeEn] ? r.typeEn : 'other';
      // normalize to 4 main groups
      let mainKey = 'other';
      if(['platform'].includes(r.typeEn)) mainKey='sources';
      else if(['egypt','intl','detailed'].includes(r.typeEn)) mainKey='opportunities';
      else if(['career','stage','extra','trend'].includes(r.typeEn)) mainKey='career';
      else if(['youtube','youtube-detailed'].includes(r.typeEn)) mainKey='youtube';
      else mainKey='other';
      if(!groups[mainKey]) groups[mainKey] = [];
      groups[mainKey].push({r,i});
    });
    const groupLabels = {
      'sources': '🎓 مصادر الكورسات',
      'opportunities': '🎯 المنح والدورات',
      'career': '🗺️ المسارات الوظيفية',
      'youtube': '▶️ قنوات يوتيوب',
      'other': '📎 أخرى'
    };
    const groupOrder = ['sources','opportunities','career','youtube','other'];
    let listHtml = '';
    groupOrder.forEach(gk=>{
      const items = groups[gk];
      if(!items || !items.length) return;
      listHtml += `<div style="margin:14px 0 6px; display:flex; align-items:center; gap:8px;"><span style="font-size:12px; font-weight:800; color:var(--text-primary);">${groupLabels[gk]}</span><span class="badge badge--muted" style="font-size:10.5px;">${items.length}</span><span style="flex:1; height:1px; background:var(--border-color);"></span></div>`;
      listHtml += items.map(({r,i})=>`
      <a href="${r.url}" class="search-result ${i===selectedIndex?'is-active':''}" data-idx="${i}" style="display:flex; gap:12px; align-items:center; padding:10px 12px; border-radius:12px; text-decoration:none; border:1px solid ${i===selectedIndex?'var(--border-strong)':'transparent'}; background:${i===selectedIndex?'var(--bg-muted)':'var(--bg-surface)'}; margin-bottom:8px;">
        <span style="width:36px;height:36px; border-radius:10px; background:${r.color}18; color:${r.color}; border:1px solid ${r.color}30; display:grid; place-items:center; font-size:13px; font-weight:800; flex-shrink:0;">${escapeHtml(r.type.slice(0,2))}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:13.5px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${highlightMatch(r.title, q)}</div>
          <div style="font-size:11.5px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${highlightMatch(r.desc, q)}</div>
        </div>
        <span class="badge badge--muted" style="font-size:11px; flex-shrink:0;">${escapeHtml(r.type)}</span>
        <span style="color:var(--text-muted); flex-shrink:0;">↗</span>
      </a>
    `).join('');
    });

    searchOverlayResults.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background: var(--bg-muted); border:1px solid var(--border-color); border-radius:12px; margin-bottom:14px; font-size:13px; color: var(--text-secondary);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="M20 20L16 16"/></svg>
        <span>نتائج البحث عن: <strong style="color:var(--text-primary);">“${escapeHtml(q)}”</strong></span>
        <span class="badge badge--primary" style="margin-right:auto;">${results.length} نتيجة</span>
        <span style="font-size:11px; color:var(--text-muted);">${buildSearchIndex().length} إجمالي • ↑↓ Enter</span>
      </div>
      ${previewHtml}
      <div class="search-results-list">${listHtml}</div>
      <p style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:8px;">مصنفة: مصادر / منح / مسارات / قنوات — البحث يفلتر البطاقات داخل كل صفحة أيضًا — <span class="badge badge--muted">Ctrl+Enter</span> لفتح في تبويب جديد</p>
    `;

    // live filter sync for current page grids
    window.__searchQuery = q;
    if(window.renderCourses) try{ window.renderCourses(); }catch(e){}
    if(window.renderYoutube) try{ window.renderYoutube(); }catch(e){}
    if(window.renderCareerPaths) try{ window.renderCareerPaths(); }catch(e){}
    if(window.renderScholarships) try{ window.renderScholarships(); }catch(e){}
    // If scholarships page has 3D filters, also trigger its rendering (already via renderScholarships)
  }

  // Bind inputs
  // Show clear button logic
  function bindSearchInput(input) {
    if (!input) return;
    // initial clear visibility
    updateClearVisibility(input);
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      updateClearVisibility(input);
      // sync all inputs
      searchInputs.forEach(inp => { if (inp !== input) { inp.value = val; updateClearVisibility(inp); } });
      if (searchOverlayInput && searchOverlayInput !== input) { searchOverlayInput.value = val; updateClearVisibility(searchOverlayInput); }
      if (searchOverlay && searchOverlay.classList.contains('is-open')) {
        renderOverlay(val);
      } else {
        // live filter grids without opening overlay
        window.__searchQuery = val;
        if(window.renderCourses) try{ window.renderCourses(); }catch(e){}
        if(window.renderYoutube) try{ window.renderYoutube(); }catch(e){}
        if(window.renderCareerPaths) try{ window.renderCareerPaths(); }catch(e){}
        if(window.renderScholarships) try{ window.renderScholarships(); }catch(e){}
        // if user types in navbar and there is no overlay, we still want overlay to open automatically after 1 char?
        // Keep subtle: open overlay only on focus/click, not on typing alone (to avoid intrusive). But we still filter.
      }
    });
    input.addEventListener('focus', () => {
      // open overlay with current value
      openSearchOverlay(input.value);
    });
    input.addEventListener('click', () => {
      if (!searchOverlay.classList.contains('is-open')) openSearchOverlay(input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (searchOverlay.classList.contains('is-open')) { e.preventDefault(); closeSearchOverlay(); }
        else { input.value=''; updateClearVisibility(input); window.__searchQuery=''; if(window.renderCourses)window.renderCourses(); }
      }
      if (e.key === 'Enter' && searchOverlay.classList.contains('is-open')) {
        e.preventDefault();
        if (currentResults.length && selectedIndex >=0) {
          const entry = currentResults[selectedIndex];
          if (!entry) return;
          addRecent(input.value || searchOverlayInput.value);
          if (e.ctrlKey || e.metaKey) window.open(entry.url, '_blank');
          else location.href = entry.url;
        }
      }
    });
  }
  searchInputs.forEach(bindSearchInput);
  if (searchOverlayInput) {
    // also bind
    updateClearVisibility(searchOverlayInput);
    searchOverlayInput.addEventListener('input', (e)=>{
      const val = e.target.value;
      updateClearVisibility(searchOverlayInput);
      searchInputs.forEach(inp=>{ inp.value = val; updateClearVisibility(inp); });
      renderOverlay(val);
    });
    searchOverlayInput.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') { e.preventDefault(); closeSearchOverlay(); }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length) {
          selectedIndex = Math.min(currentResults.length -1, selectedIndex +1);
          renderOverlay(searchOverlayInput.value);
          // scroll active into view
          const active = searchOverlayResults.querySelector('.search-result.is-active');
          if (active) active.scrollIntoView({ block:'nearest' });
        }
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length) {
          selectedIndex = Math.max(0, selectedIndex -1);
          renderOverlay(searchOverlayInput.value);
          const active = searchOverlayResults.querySelector('.search-result.is-active');
          if (active) active.scrollIntoView({ block:'nearest' });
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentResults.length && selectedIndex >=0) {
          const entry = currentResults[selectedIndex];
          addRecent(searchOverlayInput.value);
          if (e.ctrlKey || e.metaKey) window.open(entry.url, '_blank');
          else location.href = entry.url;
        } else if (searchOverlayInput.value.trim()) {
          addRecent(searchOverlayInput.value);
          showToast('جرّب اختيار نتيجة من القائمة أو اضغط Esc للفلترة الحية داخل الصفحة', 'info');
        }
      }
    });
  }
  // clear buttons
  $$('.search-clear').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const wrap = btn.closest('.search-input-wrap');
      let input = null;
      if (wrap) input = wrap.querySelector('.js-search-input');
      if (btn.id === 'searchOverlayClear') input = searchOverlayInput;
      if (!input) input = document.querySelector('.js-search-input');
      if (!input) return;
      input.value = '';
      updateClearVisibility(input);
      searchInputs.forEach(inp=>{ inp.value=''; updateClearVisibility(inp); });
      if (searchOverlayInput) { searchOverlayInput.value=''; updateClearVisibility(searchOverlayInput); }
      window.__searchQuery = '';
      if(window.renderCourses) try{ window.renderCourses(); }catch(e){}
      if(window.renderYoutube) try{ window.renderYoutube(); }catch(e){}
      if(window.renderCareerPaths) try{ window.renderCareerPaths(); }catch(e){}
      if(window.renderScholarships) try{ window.renderScholarships(); }catch(e){}
      renderOverlay('');
      input.focus();
      showToast('تم مسح البحث', 'info');
    });
  });
  if (searchOverlayClose) searchOverlayClose.addEventListener('click', closeSearchOverlay);
  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e)=>{ if (e.target === searchOverlay) closeSearchOverlay(); });
  }
  // click on search result in overlay (delegation)
  if (searchOverlayResults) {
    searchOverlayResults.addEventListener('click', (e)=>{
      const chip = e.target.closest('.search-recent__chip');
      if (chip) return; // handled earlier
      const res = e.target.closest('.search-result');
      if (res) {
        const idx = parseInt(res.getAttribute('data-idx'),10);
        if (!isNaN(idx) && currentResults[idx]) {
          addRecent(searchOverlayInput.value);
        }
      }
      const link = e.target.closest('a');
      if (link && link.classList.contains('search-result')) {
        // let navigation happen, but add recent
        addRecent(searchOverlayInput ? searchOverlayInput.value : '');
      }
    });
  }

  // Global shortcuts: / or Ctrl+K
  document.addEventListener('keydown', (e)=>{
    const isInput = e.target.matches('input, textarea, [contenteditable], select');
    if (!isInput && e.key === '/') {
      e.preventDefault();
      openSearchOverlay('');
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchOverlay(searchOverlayInput ? searchOverlayInput.value : '');
    }
    if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('is-open')) {
      closeSearchOverlay();
    }
  });

  /* ---------- Filter Pills (single-select fallback for pages without multi) ---------- */
  $$('.filter-pill:not(.filter-pill--disabled):not([data-group])').forEach(pill => {
    pill.addEventListener('click', () => {
      const group = pill.closest('.filters-bar');
      if (!group) return;
      // if this page has multi-groups, let render.js handle — but for simple pages keep behavior
      if (pill.hasAttribute('data-group')) return;
      $$('.filter-pill', group).forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
    });
  });

  // Expose helpers
  window.__normalizeAr = normalizeAr;
  window.__buildSearchIndex = buildSearchIndex;
  window.openSearchOverlay = openSearchOverlay;
  window.closeSearchOverlay = closeSearchOverlay;

  /* ---------- Smooth scroll for anchor links ---------- */
  $$('a[href^=\"#\"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', id);
        }
      }
    });
  });

  // Handle data-coming-soon and data-toast and data-share (replaces inline onclick)
  document.addEventListener('click', (e)=>{
    const coming = e.target.closest('[data-coming-soon]');
    if(coming){
      e.preventDefault();
      showToast('قريبًا', 'info');
      return;
    }
    const toastBtn = e.target.closest('[data-toast]');
    if(toastBtn){
      e.preventDefault();
      const msg = toastBtn.getAttribute('data-toast') || 'تم';
      showToast(msg, 'info');
      return;
    }
    const shareBtn = e.target.closest('[data-share]');
    if(shareBtn){
      e.preventDefault();
      const nav = window.navigator || navigator;
      if(nav && nav.share){
        nav.share({title: document.title, url: location.href}).catch(()=>{});
      } else if(nav && nav.clipboard && nav.clipboard.writeText){
        nav.clipboard.writeText(location.href).then(()=> showToast('تم نسخ الرابط', 'success')).catch(()=> showToast('تعذر النسخ', 'error'));
      } else {
        // fallback
        const ta=document.createElement('textarea'); ta.value=location.href; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); showToast('تم نسخ الرابط', 'success');}catch(e){ showToast('تعذر النسخ','error'); } ta.remove();
      }
      return;
    }
    const clearBtn = e.target.closest('[data-clear-filters]');
    if(clearBtn){
      e.preventDefault();
      document.getElementById('clearOppFilters')?.click();
      return;
    }
    const clearPlat = e.target.closest('[data-clear-plat-filters]');
    if(clearPlat){
      e.preventDefault();
      document.getElementById('clearPlatFilters')?.click();
      return;
    }
    const showAll = e.target.closest('[data-show-all-career]');
    if(showAll){
      e.preventDefault();
      document.querySelector('[data-filter="all"]')?.click();
      return;
    }
  });

  document.documentElement.classList.add('js-loaded');
})();
