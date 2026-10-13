/* ============================================
   عصفورة الويب — عرض البيانات + الفلترة + التفاعل
   3D Filtering, Favorites, Plan90, FAQ, Helper, etc.
   ============================================ */
(function(){
  const data = window.ASFOURA_DATA;
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

  function escapeHtml(str){ return String(str).replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }
  function normalize(q){ if(window.__normalizeAr) return window.__normalizeAr(q); return String(q).toLowerCase().replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').trim(); }
  function isPlaceholder(v){ const s=String(v||'').trim(); return !s || s==='لم يتم التحقق' || s==='غير محدد' || s==='غير متحقق' || s==='غير متوفر' || s.toLowerCase()==='n/a'; }
  function cleanPlaceholder(v){ let s=String(v||'').trim(); const prefixes=['غير محدد (','غير متحقق (','لم يتم التحقق (','غير متوفر (','غير محدد ','غير متحقق ','لم يتم التحقق ','غير متوفر ']; for(const pre of prefixes){ if(s.startsWith(pre)){ let inner=s.slice(pre.length); if(pre.endsWith('(') && inner.endsWith(')')) inner=inner.slice(0,-1); const cleaned=inner.trim(); return cleaned.length>2 ? cleaned : s; } } return s; }
  // Hash mapping for scholarships (Arabic <-> English) to match spec #scope=egypt&status=open
  const SCOPE_AR_TO_EN = {'مصر':'egypt','دولي':'intl'};
  const SCOPE_EN_TO_AR = {'egypt':'مصر','intl':'دولي','مصر':'مصر','دولي':'دولي'};
  const STATUS_AR_TO_EN = {'مفتوح الآن':'open','قادم':'coming','سنوي/دوري':'annual','مغلق':'closed','غير معلوم':'unknown'};
  const STATUS_EN_TO_AR = {'open':'مفتوح الآن','coming':'قادم','annual':'سنوي/دوري','closed':'مغلق','unknown':'غير معلوم','مفتوح الآن':'مفتوح الآن','قادم':'قادم','سنوي/دوري':'سنوي/دوري','مغلق':'مغلق','غير معلوم':'غير معلوم'};
  const LEVEL_AR_TO_EN = {'طلاب وبكالوريوس':'students','دراسات عليا':'graduate','تدريب مهني':'professional'};
  const LEVEL_EN_TO_AR = {'students':'طلاب وبكالوريوس','graduate':'دراسات عليا','professional':'تدريب مهني','طلاب وبكالوريوس':'طلاب وبكالوريوس','دراسات عليا':'دراسات عليا','تدريب مهني':'تدريب مهني'};
  function mapScopeToEn(ar){ return SCOPE_AR_TO_EN[ar]||ar; }
  function mapScopeToAr(en){ return SCOPE_EN_TO_AR[en]||en; }
  function mapStatusToEn(ar){ return STATUS_AR_TO_EN[ar]||ar; }
  function mapStatusToAr(en){ return STATUS_EN_TO_AR[en]||en; }
  function mapLevelToEn(ar){ return LEVEL_AR_TO_EN[ar]||ar; }
  function mapLevelToAr(en){ return LEVEL_EN_TO_AR[en]||en; }

  /* ---------- Favorites (45 localStorage) ---------- */
  const FAV_KEY = 'asfoura-favs';
  const FAV_MAX = 45;
  function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); }catch(e){ return []; } }
  function setFavs(arr){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(arr.slice(0,FAV_MAX))); }catch(e){ try{ localStorage.removeItem(FAV_KEY); localStorage.setItem(FAV_KEY, JSON.stringify(arr.slice(0,20))); }catch(_){} window.showToast && showToast('امتلأت المفضلة — حاول إزالة بعضها', 'error'); } if(window.__updateFavCount) window.__updateFavCount(); }
  function isFav(id){ return getFavs().includes(id); }
  function toggleFav(id){
    let favs = getFavs();
    const exists = favs.includes(id);
    if(exists) favs = favs.filter(x=>x!==id);
    else {
      if(favs.length >= FAV_MAX){ window.showToast && showToast('وصلت للحد الأقصى للمفضلة (45)', 'error'); return false; }
      favs.unshift(id);
      if(window.__confetti && favs.length % 3 === 0) window.__confetti();
    }
    setFavs(favs);
    if(window.__updateFavCount) window.__updateFavCount();
    window.showToast && showToast(exists ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة ★', exists ? 'info' : 'favorite');
    return !exists;
  }
  window.__isFav = isFav;
  window.__toggleFav = toggleFav;

  /* ---------- Copy link ---------- */
  function copyText(text){
    const nav = (typeof window !== 'undefined' && window.navigator) ? window.navigator : (typeof navigator !== 'undefined' ? navigator : null);
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(text).then(()=>{
        window.showToast && showToast('تم نسخ الرابط ✓', 'success');
        if(window.__confetti) window.__confetti();
      }, ()=> fallbackCopy(text));
    } else fallbackCopy(text);
  }
  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); window.showToast && showToast('تم نسخ الرابط ✓', 'success'); }catch(e){ window.showToast && showToast('تعذّر النسخ', 'error'); }
    ta.remove();
  }
  function shareLink(url, title){
    const nav = (typeof window !== 'undefined' && window.navigator) ? window.navigator : (typeof navigator !== 'undefined' ? navigator : null);
    if (nav && nav.share) {
      nav.share({ title: title||document.title, url: url }).catch(()=> copyText(url));
    } else copyText(url);
  }

  /* ---------- Badge helpers ---------- */
  function badgeCategory(cat){
    if(cat==='A') return `<span class="badge badge--primary">فئة A — مجاني بالكامل</span>`;
    if(cat==='B') return `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">فئة B — شهادة مدفوعة</span>`;
    if(cat==='C') return `<span class="badge badge--accent">فئة C — مجاني بشروط</span>`;
    if(cat==='D') return `<span class="badge badge--muted">فئة D — بلا شهادة</span>`;
    if(cat==='A/B') return `<span class="badge badge--muted">A/B — حسب الدورة</span>`;
    return `<span class="badge badge--muted">${escapeHtml(cat)}</span>`;
  }
  function statusBadge(s){
    if(!s) return '';
    let cls='badge--muted';
    if(s.includes('مفتوح')) cls='badge--primary';
    if(s.includes('قادم')||s.includes('فبراير')) cls='badge--accent';
    if(s.includes('مغلق')||s.includes('انتهى')) cls='badge--muted';
    if(s.includes('سنوي')||s.includes('دوري')) cls='badge--accent';
    return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
  }

  /* ---------- Hash sync helpers ---------- */
  function readHashFilters(keys){
    const hash = location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const out = {};
    keys.forEach(k=>{
      const v = params.get(k);
      if(v) out[k]=v;
    });
    // also support legacy #scope=egypt etc (english values)
    return out;
  }
  function writeHashFilters(obj){
    const params = new URLSearchParams(location.hash.replace(/^#/,''));
    Object.entries(obj).forEach(([k,v])=>{
      if(!v || v==='all') params.delete(k);
      else params.set(k, v);
    });
    const newHash = params.toString();
    const newUrl = location.pathname + location.search + (newHash ? '#'+newHash : '');
    history.replaceState(null,'', newUrl);
  }

  /* ---------- Card action bar (fav + copy + report) ---------- */
  function cardActionsHtml(id, url, title){
    const fav = isFav(id);
    return `
      <div class="card-actions" style="display:flex; gap:6px; align-items:center; margin-top:8px; flex-wrap:wrap;">
        <button type="button" class="btn btn--ghost btn--sm fav-btn ${fav?'is-fav':''}" data-fav="${escapeHtml(id)}" aria-pressed="${fav?'true':'false'}" title="${fav?'إزالة من المفضلة':'إضافة للمفضلة'}" style="display:inline-flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 17.3l-5.4 3.2 1.4-6.1L3 9.9l6.2-.5L12 3.8l2.8 5.6 6.2.5-5 4.5 1.4 6.1z"/></svg>
          ${fav?'في المفضلة':'مفضلة'}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-copy="${escapeHtml(url)}" data-title="${escapeHtml(title)}" title="نسخ الرابط" style="display:inline-flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="9" width="10" height="10" rx="2"/><path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>
          نسخ
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-report="${escapeHtml(id)}" data-report-title="${escapeHtml(title)}" data-report-url="${escapeHtml(url)}" title="الإبلاغ عن مشكلة" style="display:inline-flex; align-items:center; gap:6px; color:var(--text-muted);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 8v5"/><path d="M12 16h.01"/><path d="M10.3 3.3l-7 12A1 1 0 0 0 4.2 17h15.6a1 1 0 0 0 .9-1.7l-7-12a1 1 0 0 0-1.7 0z"/></svg>
          بلاغ
        </button>
      </div>`;
  }
  // delegate fav/copy/report
  document.addEventListener('click', (e)=>{
    const favBtn = e.target.closest('[data-fav]');
    if(favBtn){
      e.preventDefault();
      const id = favBtn.getAttribute('data-fav');
      const nowFav = toggleFav(id);
      favBtn.classList.toggle('is-fav', nowFav);
      favBtn.setAttribute('aria-pressed', nowFav?'true':'false');
      favBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${nowFav?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 17.3l-5.4 3.2 1.4-6.1L3 9.9l6.2-.5L12 3.8l2.8 5.6 6.2.5-5 4.5 1.4 6.1z"/></svg> ${nowFav?'في المفضلة':'مفضلة'}`;
      // re-render counters if on filtered pages?
      return;
    }
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn){
      e.preventDefault();
      const url = copyBtn.getAttribute('data-copy');
      const title = copyBtn.getAttribute('data-title')||'';
      const full = url.startsWith('http') ? url : (location.origin + (url.startsWith('/')? url : '/' + url));
      // if url is hash-only like #id, make full page url + hash
      let finalUrl = full;
      if(url.startsWith('#') || url.startsWith('pages/')) {
        // resolve relative to current location's origin
        try{ finalUrl = new URL(url, location.href).href; }catch(_){ finalUrl = location.href.split('#')[0] + url; }
      }
      copyText(finalUrl);
      return;
    }
    const reportBtn = e.target.closest('[data-report]');
    if(reportBtn){
      e.preventDefault();
      const rid = reportBtn.getAttribute('data-report') || '';
      const rtitle = reportBtn.getAttribute('data-report-title') || reportBtn.getAttribute('data-title') || document.title;
      const rurl = reportBtn.getAttribute('data-report-url') || location.href;
      // رقم الواتساب المطلوب: 01277398832 -> دولي 201277398832
      const waNumber = '201277398832';
      const pageUrl = rurl.startsWith('http') ? rurl : (location.origin + (rurl.startsWith('/')? rurl : '/' + rurl));
      // إذا كان الرابط نسبي مثل pages/... نحوله لرابط كامل
      let fullUrl = pageUrl;
      try{
        if(!rurl.startsWith('http')){
          fullUrl = new URL(rurl, location.href).href;
        } else {
          fullUrl = pageUrl;
        }
      }catch(_){
        fullUrl = location.href;
      }
      // إذا كان الرابط لا يحتوي على hash للعنصر، أضف الـ id كـ hash
      if(rid && !fullUrl.includes('#')){
        // لا نضيف إذا كان fullUrl already has id? بس نضيف للتوضيح
      }
      const text = `مرحبا، أبلغ عن عطل في منصة عصفورة الويب:%0A%0A` +
        `• الصفحة: ${location.href}%0A` +
        `• العنصر: ${rtitle} (ID: ${rid})%0A` +
        `• الرابط: ${fullUrl}%0A` +
        `• نوع العطل: رابط لا يعمل / معلومات غير صحيحة / محتوى غير ظاهر%0A%0A` +
        `يرجى المراجعة، شكرا.`;
      // encode properly (النص أعلاه فيه %0A كفواصل أسطر)
      const encodedTitle = encodeURIComponent(rtitle);
      const encodedUrl = encodeURIComponent(fullUrl);
      const encodedPage = encodeURIComponent(location.href);
      // بناء النص النهائي مع encodeURIComponent لضمان العربية
      const rawText = `مرحبا، أبلغ عن عطل في منصة عصفورة الويب:\n\n• الصفحة: ${location.href}\n• العنصر: ${rtitle} (ID: ${rid})\n• الرابط: ${fullUrl}\n• نوع العطل: رابط لا يعمل / معلومات غير صحيحة / محتوى غير ظاهر\n\nيرجى المراجعة، شكرا.`;
      const waUrl = `https://wa.me/${waNumber}?text=` + encodeURIComponent(rawText);
      window.open(waUrl, '_blank', 'noopener');
      window.showToast && showToast('جاري فتح واتساب للبلاغ ✉️', 'success');
      return;
    }
  });

  /* ---------- FAQ Renderer ---------- */
  function renderFAQ(containerId, faqList){
    const el = document.getElementById(containerId);
    if(!el) return;
    if(!faqList || !faqList.length){
      el.innerHTML = `<p style="font-size:13px; color:var(--text-muted);">لا توجد أسئلة حاليًا.</p>`;
      return;
    }
    el.innerHTML = faqList.map((f,i)=>`
      <div class="faq__item ${i===0?'is-open':''}" data-faq="${i}">
        <button type="button" class="faq__q" aria-expanded="${i===0?'true':'false'}">
          <span>${escapeHtml(f.q)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="faq__icon"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="faq__a" ${i!==0?'hidden':''}><p>${escapeHtml(f.a)}</p></div>
      </div>
    `).join('');
    // toggle
    el.querySelectorAll('.faq__q').forEach(btn=>{
      if(btn.dataset.bound==='1') return;
      btn.dataset.bound='1';
      btn.addEventListener('click', ()=>{
        const item = btn.closest('.faq__item');
        const isOpen = item.classList.contains('is-open');
        item.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        const ans = item.querySelector('.faq__a');
        if(ans) ans.hidden = isOpen;
      });
    });
  }

  /* ---------- Helper Renderer ---------- */
  function renderHelper(containerOptionsId, containerResultId, helperData, onSelect){
    const optEl = document.getElementById(containerOptionsId);
    const resEl = document.getElementById(containerResultId);
    if(!optEl || !helperData || !helperData.length) return;
    optEl.innerHTML = helperData.map((h,i)=>`
      <button type="button" class="helper__opt" data-idx="${i}">
        <div style="font-weight:800; font-size:13.5px;">${escapeHtml(h.q)}</div>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">${escapeHtml(h.desc||'')}</div>
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
          ${h.options ? h.options.slice(0,4).map(o=>`<span class="badge badge--muted" style="font-size:11px;">${escapeHtml(o.label||o)}</span>`).join('') : ''}
        </div>
      </button>
    `).join('');
    // For simpler helper (data.helper has {goal, q, options, desc})
    // Actually helper entries: {goal, q, options:[{label, filter}], desc}
    // We'll treat each helper card as a question with options
    // Simpler: render each helper's options as pills inside result after click
    optEl.querySelectorAll('.helper__opt').forEach(btn=>{
      if(btn.dataset.bound==='1') return;
      btn.dataset.bound='1';
      btn.addEventListener('click', ()=>{
        optEl.querySelectorAll('.helper__opt').forEach(b=>b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        const idx = parseInt(btn.getAttribute('data-idx'),10);
        const h = helperData[idx];
        if(!resEl) return;
        if(h.options){
          resEl.innerHTML = `
            <div style="padding:12px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; margin-top:10px;">
              <div style="font-weight:800; font-size:13px; margin-bottom:8px;">${escapeHtml(h.q)}</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${h.options.map((o,oi)=>`<button type="button" class="helper__choice badge badge--primary" data-choice="${oi}" data-idx="${idx}" style="cursor:pointer; border:none;">${escapeHtml(o.label)}</button>`).join('')}
              </div>
              ${h.desc?`<p style="font-size:12.5px; color:var(--text-secondary); margin-top:10px; line-height:1.6;">${escapeHtml(h.desc)}</p>`:''}
            </div>
          `;
          resEl.querySelectorAll('.helper__choice').forEach(c=>{
            c.addEventListener('click', ()=>{
              const choiceIdx = parseInt(c.getAttribute('data-choice'),10);
              const helperItem = helperData[parseInt(c.getAttribute('data-idx'),10)];
              const choice = helperItem.options[choiceIdx];
              if(onSelect) onSelect(choice, helperItem);
              window.showToast && showToast('تم تطبيق اقتراح: ' + choice.label, 'success');
              if(window.__confetti) window.__confetti();
            });
          });
        } else if(onSelect){
          onSelect(null, h);
        }
      });
    });
  }

  /* ---------- Plan90 ---------- */
  function renderPlan90(){
    const card = $('#plan90Card');
    if(!card || !data.plan90) return;
    const titleEl = $('#plan90Title');
    const tasksEl = $('#plan90Tasks');
    const barEl = $('#plan90Bar');
    const countEl = $('#plan90Count');
    const pctEl = $('#plan90Pct');
    const progText = $('#plan90ProgressText');
    const resetBtn = $('#plan90Reset');
    const STORAGE_PLAN = 'asfoura-plan90';
    function getChecked(){
      try{ return JSON.parse(localStorage.getItem(STORAGE_PLAN)||'[]'); }catch(e){ return []; }
    }
    function setChecked(arr){
      try{ localStorage.setItem(STORAGE_PLAN, JSON.stringify(arr)); }catch(e){ window.showToast && showToast('تعذر حفظ التقدم', 'error'); }
    }
    function render(){
      const checked = getChecked();
      const total = data.plan90.tasks.length;
      const done = checked.length;
      const pct = total ? Math.round(done/total*100) : 0;
      if(titleEl) titleEl.textContent = data.plan90.title + ' — ' + data.plan90.desc;
      if(barEl) barEl.style.width = pct + '%';
      if(countEl) countEl.textContent = done + ' / ' + total;
      if(pctEl) pctEl.textContent = pct + '%';
      if(progText) progText.textContent = pct + '%';
      if(tasksEl){
        tasksEl.innerHTML = data.plan90.tasks.map((t,i)=>{
          const isDone = checked.includes(t.id);
          return `
            <label class="plan90__task ${isDone?'is-done':''}" style="display:flex; gap:10px; align-items:start; padding:10px 12px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; cursor:pointer;">
              <input type="checkbox" value="${escapeHtml(t.id)}" ${isDone?'checked':''} style="margin-top:4px; accent-color:var(--color-primary); width:16px; height:16px;">
              <div style="flex:1;">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <span style="font-weight:800; font-size:13px; ${isDone?'text-decoration:line-through; color:var(--text-muted);':''}">${escapeHtml(t.title)}</span>
                  <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(t.weeks||'')}</span>
                </div>
                <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin-top:4px;">${escapeHtml(t.desc||'')}</div>
              </div>
            </label>
          `;
        }).join('');
        tasksEl.querySelectorAll('input[type=checkbox]').forEach(cb=>{
          cb.addEventListener('change', (e)=>{
            const id = e.target.value;
            let cur = getChecked();
            if(e.target.checked){
              if(!cur.includes(id)) cur.push(id);
              if(cur.length===total && window.__confetti) window.__confetti();
              window.showToast && showToast('أحسنت! تقدمك ' + Math.round(cur.length/total*100) + '%', 'success');
            } else {
              cur = cur.filter(x=>x!==id);
              window.showToast && showToast('تمت الإزالة', 'info');
            }
            setChecked(cur);
            render();
          });
        });
      }
    }
    if(resetBtn){
      resetBtn.addEventListener('click', ()=>{
        if(confirm('هل تريد إعادة ضبط خطة 90 يومًا؟')){
          try{ localStorage.removeItem(STORAGE_PLAN); }catch(e){}
          render();
          window.showToast && showToast('تمت إعادة الضبط', 'info');
        }
      });
    }
    render();
  }

  /* ---------- Details Tables ---------- */
  function renderRefTables(){
    // Platforms table
    const platTable = $('#refTablePlatforms');
    if(platTable){
      const all = [...(data.globalPlatforms||[]), ...(data.arabicPlatforms||[]), ...(data.mixedPlatforms||[])];
      platTable.innerHTML = all.map(p=>`
        <tr>
          <td style="padding:8px; border:1px solid var(--border-color);"><a href="${p.link}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary); font-weight:700;">${escapeHtml(p.name)}</a></td>
          <td style="padding:8px; border:1px solid var(--border-color); text-align:center;">${escapeHtml(p.category)}</td>
          <td style="padding:8px; border:1px solid var(--border-color); font-size:11.5px;">${escapeHtml(p.cert.slice(0,60))}</td>
          <td style="padding:8px; border:1px solid var(--border-color); text-align:center;">${escapeHtml(p.lang)}</td>
        </tr>
      `).join('');
    }
    const oppTable = $('#refTableOpp');
    if(oppTable){
      const allOpp = [...(data.egyptPrograms||[]), ...(data.intlScholarships||[])];
      oppTable.innerHTML = allOpp.map(p=>`
        <tr>
          <td style="padding:8px; border:1px solid var(--border-color); font-weight:700;">${escapeHtml(p.name)}</td>
          <td style="padding:8px; border:1px solid var(--border-color); text-align:center;">${escapeHtml(p.level||p.target||'')}</td>
          <td style="padding:8px; border:1px solid var(--border-color); text-align:center;"><a href="${p.link}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);">رابط ↗</a></td>
        </tr>
      `).join('');
    }
    const careerTable = $('#refTableCareer');
    if(careerTable){
      careerTable.innerHTML = (data.careerPaths||[]).map(p=>`
        <tr>
          <td style="padding:8px; border:1px solid var(--border-color); font-weight:700;"><a href="career-path.html?id=${p.id}" style="color:${p.color}; text-decoration:none;">${escapeHtml(p.title)}</a></td>
          <td style="padding:8px; border:1px solid var(--border-color); text-align:center;">${escapeHtml(p.duration||'')}</td>
          <td style="padding:8px; border:1px solid var(--border-color); font-size:11.5px;">${escapeHtml(p.goal||p.desc||'')}</td>
        </tr>
      `).join('');
    }
  }

  /* ---------- COURSES (Platforms) — 3D Filtering ---------- */
  function renderCourses(){
    const globalGrid = $('#globalGrid');
    const arabicGrid = $('#arabicGrid');
    const certTypesEl = $('#certTypes');
    const categoriesEl = $('#categoriesLegend');
    // If not on courses page, skip filter handling but still may need certification rendering elsewhere? only courses
    if(!globalGrid && !arabicGrid){
      // but still try to render helper/faq on other pages? skip
    }

    if(certTypesEl){
      certTypesEl.innerHTML = data.certificateTypes.map(t=>`
        <div class="card" style="padding:16px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <span style="width:36px;height:36px; border-radius:10px; background:var(--bg-muted); border:1px solid var(--border-color); display:grid; place-items:center; font-size:18px;">${t.icon}</span>
            <h3 style="font-size:15px;">${escapeHtml(t.name)}</h3>
          </div>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; margin-bottom:8px;"><strong>الطريقة:</strong> ${escapeHtml(t.method)}</p>
          <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:11px;">
            <span class="badge badge--muted">المراقبة: ${escapeHtml(t.level)}</span>
            <span class="badge badge--muted">القيمة: ${escapeHtml(t.value)}</span>
          </div>
          <p style="font-size:11.5px; color:var(--text-muted); margin-top:8px;">أمثلة: ${escapeHtml(t.examples)}</p>
        </div>
      `).join('');
    }
    if(categoriesEl){
      categoriesEl.innerHTML = data.categories.map(c=>`
        <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px;">
          <span style="width:28px;height:28px; border-radius:8px; background:var(--color-primary); color:white; display:grid; place-items:center; font-weight:800; font-size:13px;">${escapeHtml(c.id)}</span>
          <div><div style="font-weight:800; font-size:13px;">${escapeHtml(c.label)}</div><div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(c.desc)}</div></div>
        </div>
      `).join('');
    }

    if(!globalGrid && !arabicGrid) return;

    // Multi-dimensional state
    let filters = { lang: 'all', cert: 'all', level: 'all' };
    // Read from hash on load
    const hashFilters = readHashFilters(['lang','cert','level']);
    if(hashFilters.lang) filters.lang = hashFilters.lang;
    if(hashFilters.cert) filters.cert = hashFilters.cert;
    if(hashFilters.level) filters.level = hashFilters.level;

    // Need to map Arabic values? Our buttons use ar/en etc, but hash may store raw arabic or english
    // Normalize lang: 'ar' or 'عربي', 'en' or 'إنجليزي'
    // Convert if stored as Arabic
    // Keep as stored value matches button data-value

    function applyFiltersToUI(){
      $$('.filters-row [data-group="lang"]').forEach(b=>{
        b.classList.toggle('is-active', b.dataset.value === filters.lang);
      });
      $$('.filters-row [data-group="cert"]').forEach(b=>{
        b.classList.toggle('is-active', b.dataset.value === filters.cert);
      });
      $$('.filters-row [data-group="level"]').forEach(b=>{
        b.classList.toggle('is-active', b.dataset.value === filters.level);
      });
      const clearBtn = $('#clearPlatFilters');
      if(clearBtn){
        const hasActive = filters.lang !== 'all' || filters.cert !== 'all' || filters.level !== 'all';
        clearBtn.style.display = hasActive ? 'inline-flex' : 'none';
      }
      writeHashFilters(filters);
    }

    // Attach listeners to new groups — guard against duplicates on re-render
    $$('.filters-row [data-group]').forEach(btn=>{
      if(btn.dataset.bound==='1') return;
      btn.dataset.bound='1';
      btn.addEventListener('click', ()=>{
        const group = btn.dataset.group;
        const val = btn.dataset.value;
        filters[group] = val;
        applyFiltersToUI();
        renderGlobal();
        renderArabic();
        updateCounter();
      });
    });
    const clearBtn = $('#clearPlatFilters');
    if(clearBtn && clearBtn.dataset.bound!=='1'){
      clearBtn.dataset.bound='1';
      clearBtn.addEventListener('click', ()=>{
        filters = { lang:'all', cert:'all', level:'all' };
        applyFiltersToUI();
        renderGlobal(); renderArabic(); updateCounter();
        window.showToast && showToast('تم مسح الفلترة', 'info');
      });
    }

    function platformMatches(p, filters){
      // lang — عربي / إنجليزي / مترجم/متعدد
      if(filters.lang !== 'all'){
        const langStr = (p.lang||'').trim();
        const hasAr = langStr.includes('عربي');
        const hasEn = langStr.includes('إنجليزي') || langStr.toLowerCase().includes('english');
        const hasMixed = langStr.includes('متعدد') || langStr.includes('عربي +') || langStr.includes('/');
        const isMixed = hasMixed || (hasAr && hasEn);
        const isArabicNoLang = !langStr; // منصات القائمة العربية ليس لها lang → عربية خالصة
        const isArPure = isArabicNoLang || (hasAr && !isMixed);
        const isEnPure = hasEn && !isMixed && !hasAr;
        if(filters.lang === 'ar' && !isArPure) return false;
        if(filters.lang === 'en' && !isEnPure) return false;
        if(filters.lang === 'mixed' && !isMixed) return false;
      }
      // cert
      if(filters.cert !== 'all'){
        // p.category is A/B/C/D or A/B
        const cat = p.category||'';
        if(filters.cert === 'A' && !cat.includes('A')) return false;
        if(filters.cert === 'B' && !cat.includes('B')) return false;
        if(filters.cert === 'C' && !cat.includes('C')) return false;
        if(filters.cert === 'D' && !cat.includes('D')) return false;
      }
      // level
      if(filters.level !== 'all'){
        const lvl = (p.beginner===true ? 'beginner' : (p.beginner===false ? 'advanced' : (p.level||'')));
        // p.beginner true => beginner, false => advanced, otherwise string
        const isBeginner = p.beginner === true || String(p.beginner).includes('مبتدئ');
        const isAdvanced = p.beginner === false || String(p.beginner).includes('متقدم') || String(p.beginner).includes('advanced');
        if(filters.level==='beginner' && !isBeginner) return false;
        if(filters.level==='advanced' && !isAdvanced) return false;
      }
      return true;
    }

    function renderGlobal(){
      if(!globalGrid) return;
      let list = data.globalPlatforms||[];
      // For courses page, globalGrid should show filtered global only, arabicGrid shows arabic+mixed
      list = list.filter(p=> platformMatches(p, filters));
      const q = normalize(window.__searchQuery||'');
      if(q){
        list = list.filter(p=> normalize(p.name+' '+(p.entity||'')+' '+(p.fields||[]).join(' ')+' '+(p.cert||'')+' '+(p.category||'')).includes(q));
      }
      if(!list.length){
        globalGrid.innerHTML = `<div class="empty-state empty-state--compact" style="grid-column:1/-1;">
          <div class="empty-state__icon" style="width:48px;height:48px;">🔍</div>
          <p class="empty-state__title">لا توجد منصات مطابقة</p>
          <p class="empty-state__desc">جرّب تغيير الفلترة أو كلمة البحث. الفلترة الحالية: لغة=${filters.lang} • شهادة=${filters.cert} • مستوى=${filters.level}</p>
          <button type="button" class="btn btn--ghost btn--sm" data-clear-plat-filters>مسح الفلترة</button>
        </div>`;
        return;
      }
      globalGrid.innerHTML = list.map(p=>`
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px;" id="${escapeHtml(p.id||'')}">
          <div style="display:flex; align-items:start; justify-content:space-between; gap:10px;">
            <div style="width:42px;height:42px; border-radius:11px; background:var(--bg-muted); border:1px solid var(--border-color); display:grid; place-items:center; color:var(--text-muted); flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:end;">
              ${badgeCategory(p.category)}
            </div>
          </div>
          <h3 style="font-size:15px; line-height:1.3;">${escapeHtml(p.name)}</h3>
          <p style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(p.entity)} • ${escapeHtml(p.lang)} • ${p.beginner===true?'مبتدئ': escapeHtml(String(p.beginner||''))}</p>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.7;">${escapeHtml(p.cert)}</p>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${(p.fields||[]).slice(0,3).map(f=>`<span class="badge badge--muted" style="font-size:11px;">${escapeHtml(f)}</span>`).join('')}
          </div>
          ${p.note?`<p style="font-size:11.5px; color:var(--text-muted); background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 10px; border-radius:8px;">💡 ${escapeHtml(p.note)}</p>`:''}
          <div style="margin-top:auto; display:flex; gap:8px;">
            ${(()=>{ const isInternal = p.id==='power-english' || (p.link && (p.link.startsWith('/') || p.link.includes('power-english'))); const href=escapeHtml(p.link); return isInternal ? `<a href="${href}" class="btn btn--primary btn--sm" style="flex:1; background:#0EA5E9; border-color:#0EA5E9;">فتح الصفحة المخصصة ↗</a>` : `<a href="${href}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1;">فتح المنصة ↗</a>`; })()}
            <span class="badge badge--muted" style="align-self:center;">${p.egypt===true?'متاح من مصر': escapeHtml(String(p.egypt||''))}</span>
          </div>
          ${cardActionsHtml('plat-'+(p.id||p.name), p.link, p.name)}
        </article>
      `).join('');
    }
    function renderArabic(){
      if(!arabicGrid) return;
      let list = [...(data.arabicPlatforms||[]), ...(data.mixedPlatforms||[])];
      // mixed may be included already; keep distinct
      list = list.filter(p=> platformMatches(p, filters));
      const q = normalize(window.__searchQuery||'');
      if(q) list = list.filter(p=> normalize(p.name+' '+(p.entity||'')+' '+(p.fields||[]).join(' ')+' '+(p.cert||'')).includes(q));
      if(!list.length){
        arabicGrid.innerHTML = `<div class="empty-state empty-state--compact" style="grid-column:1/-1;"><p class="empty-state__title">لا توجد منصات عربية مطابقة</p><p class="empty-state__desc">جرّب كلمة أخرى أو غيّر الفلترة.</p></div>`;
        return;
      }
      arabicGrid.innerHTML = list.map(p=>`
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px;" id="${escapeHtml(p.id||'')}">
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <h3 style="font-size:15px;">${escapeHtml(p.name)}</h3>
          </div>
          <p style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(p.entity)}</p>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(p.cert)}</p>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${(p.fields||[]).slice(0,3).map(f=>`<span class="badge badge--muted" style="font-size:11px;">${escapeHtml(f)}</span>`).join('')}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            ${badgeCategory(p.category)}
            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(p.users||'')}</span>
          </div>
          ${p.note?`<p style="font-size:11.5px; color:var(--text-muted); background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 10px; border-radius:8px;">💡 ${escapeHtml(p.note)}</p>`:''}
          <div style="margin-top:auto;">
            <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="width:100%;">فتح المنصة ↗</a>
          </div>
          ${cardActionsHtml('plat-'+(p.id||p.name), p.link, p.name)}
        </article>
      `).join('');
    }
    function updateCounter(){
      const counter = $('#platformCounter');
      if(!counter) return;
      const all = [...(data.globalPlatforms||[]), ...(data.arabicPlatforms||[]), ...(data.mixedPlatforms||[])];
      let filtered = all.filter(p=> platformMatches(p, filters));
      const q = normalize(window.__searchQuery||'');
      if(q) filtered = filtered.filter(p=> normalize(p.name+' '+(p.entity||'')+' '+(p.fields||[]).join(' ')).includes(q));
      counter.textContent = filtered.length + ' من ' + all.length;
      // also update hash sync for pills active counts? add filter-counter
      $$('.filter-counter').forEach(el=> el.remove());
      // show per-pill count
      // For lang group, show counts
      // (optional, not required)
    }

    applyFiltersToUI();
    renderGlobal();
    renderArabic();
    updateCounter();

    // Live search hook (already handled via window.__searchQuery re-render, but we need to listen)
    // We'll patch global search to trigger these renders
    // Already app.js calls renderCourses on search, so we just ensure updateCounter called also
    const origRenderGlobal = renderGlobal;
    const origRenderArabic = renderArabic;

    // FAQ and Helper for platforms page
    renderFAQ('faqPlatforms', data.faq);
    renderRefTables();
    // Helper
    if(data.helper){
      renderHelper('helperOptions','helperResult', data.helper, (choice, helperItem)=>{
        // choice is {label, filter} where filter maybe data-group?
        // Map helper choice to platform filters: we need to interpret choice.filter
        // Our helper data: options have label like "مجاني تمامًا A" etc.
        // We'll map by searching label keywords
        if(choice && choice.label){
          const lbl = choice.label;
          if(lbl.includes('A')) filters.cert = 'A';
          else if(lbl.includes('B')) filters.cert = 'B';
          else if(lbl.includes('C')) filters.cert = 'C';
          else if(lbl.includes('إنجليزي') || lbl.toLowerCase().includes('english')) filters.lang = 'en';
          else if(lbl.includes('عربي')) filters.lang = 'ar';
          else if(lbl.includes('مبتدئ')) filters.level = 'beginner';
          else if(lbl.includes('متقدم')) filters.level = 'advanced';
          applyFiltersToUI();
          renderGlobal(); renderArabic(); updateCounter();
        }
      });
    }

    // Expose for app.js live search
    window.renderCourses = function(){
      renderGlobal();
      renderArabic();
      updateCounter();
    };
  }

  /* ---------- Scholarships — 3D Filtering ---------- */
  function renderScholarships(){
    const egGrid = $('#egyptGrid');
    const intlGrid = $('#intlGrid');
    const officialEl = $('#officialSites');
    // If detailed opportunities exist, use them (new 11 records)
    const hasDetailed = Array.isArray(data.detailedOpportunities) && data.detailedOpportunities.length;
    const egyptDetailed = hasDetailed ? data.detailedOpportunities.filter(d=> d.country==='مصر') : [];
    const intlDetailed  = hasDetailed ? data.detailedOpportunities.filter(d=> d.country!=='مصر') : [];
    // نمط الدمج: نعرض (9 برامج مصر + 4 مفصلة مصر = 13) و (15 دولية + 7 مفصلة دولية = 22) = 35 إجمالي
    const useDetailed = hasDetailed; // للتوافق
    const allDetailed = hasDetailed ? data.detailedOpportunities : null;
    if(!egGrid && !intlGrid) {
      if(!officialEl) return;
    }

    let filters = { scope: 'all', level: 'all' };
    // read hash (scope + level فقط - الحالة أُزيلت حسب طلب المستخدم)
    const hf = readHashFilters(['scope','level']);
    if(hf.scope) filters.scope = mapScopeToAr(decodeURIComponent(hf.scope));
    if(hf.level) filters.level = mapLevelToAr(decodeURIComponent(hf.level));

    function applyToUI(){
      $$('[data-group="scope"]').forEach(b=> b.classList.toggle('is-active', b.dataset.value===filters.scope));
      $$('[data-group="level"]').forEach(b=> b.classList.toggle('is-active', b.dataset.value===filters.level));
      const clearBtn = $('#clearOppFilters');
      if(clearBtn){
        const has = filters.scope!=='all' || filters.level!=='all';
        clearBtn.style.display = has ? 'inline-flex' : 'none';
      }
      writeHashFilters({scope: filters.scope==='all'?'all': mapScopeToEn(filters.scope), level: filters.level==='all'?'all': mapLevelToEn(filters.level)});
    }
    $$('button[data-group="scope"],button[data-group="level"]').forEach(btn=>{
      if(btn.dataset.bound==='1') return;
      btn.dataset.bound='1';
      btn.addEventListener('click', ()=>{
        if(!btn.dataset.value) return;   // حماية دفاعية
        const g = btn.dataset.group;
        const v = btn.dataset.value;
        filters[g]=v;
        applyToUI();
        renderAll();
      });
    });
    const clearBtn = $('#clearOppFilters');
    if(clearBtn && clearBtn.dataset.bound!=='1'){
      clearBtn.dataset.bound='1';
      clearBtn.addEventListener('click', ()=>{
        filters={scope:'all',level:'all'};
        applyToUI(); renderAll();
        window.showToast && showToast('تم مسح الفلترة', 'info');
      });
    }

    function matchesOpp(p, filters, q){
      if(filters.scope!=='all'){
        if(normalize(p.scope||'') !== normalize(filters.scope)) return false;
      }
      if(filters.level!=='all'){
        const lvl = p.level||p.target||'';
        if(normalize(lvl) !== normalize(filters.level)){
          if(!normalize(lvl).includes(normalize(filters.level)) && !normalize(filters.level).includes(normalize(lvl))){
            return false;
          }
        }
      }
      if(q){
        const hay = normalize((p.name||'')+' '+(p.entity||'')+' '+(p.type||'')+' '+(p.tracks||'')+' '+(p.conditions||'') );
        if(!hay.includes(q)) return false;
      }
      return true;
    }

    function matchesDetailed(d, filters, q){
      // scope: مصر vs دولي (country === مصر -> مصر, else دولي)
      if(filters.scope!=='all'){
        const isEgypt = (d.country||'').trim() === 'مصر';
        const wantEgypt = filters.scope === 'مصر';
        if(wantEgypt !== isEgypt) return false;
      }
      if(filters.level!=='all'){
        const lvlText = (d.target_audience||'') + ' ' + (d.required_qualification||'') + ' ' + (d.opportunity_type||'');
        const normLvl = normalize(lvlText);
        const f = normalize(filters.level);
        if(filters.level === 'طلاب وبكالوريوس'){
          if(!normLvl.includes('طالب') && !normLvl.includes('بكالوريوس') && !normLvl.includes('ثانوي')) return false;
        } else if(filters.level === 'دراسات عليا'){
          if(!normLvl.includes('دكتوراه') && !normLvl.includes('ماجستير') && !normLvl.includes('باحث') && !normLvl.includes('هيئه تدريس')) return false;
        } else if(filters.level === 'تدريب مهني'){
          if(!normLvl.includes('تدريب') && !normLvl.includes('مهني') && !normLvl.includes('نانو')) return false;
        } else {
          if(!normLvl.includes(f)) return false;
        }
      }
      if(q){
        const hay = normalize((d.name_ar||'')+' '+(d.name_original||'')+' '+(d.provider||'')+' '+(d.field||'')+' '+(d.subfields||'')+' '+(d.target_audience||'')+' '+(d.funding_details||'')+' '+(d.notes||''));
        if(!hay.includes(q)) return false;
      }
      return true;
    }

    function renderAll(){
      const q = normalize(window.__searchQuery||'');
      if(egGrid){
        // دمج: مصر القديمة (9) + المفصلة مصر (4) = 13
        const oldEgypt = (data.egyptPrograms||[]).filter(p=> matchesOpp(p, filters, q));
        const newEgypt = egyptDetailed.filter(d=> matchesDetailed(d, filters, q));
        const list = [...oldEgypt, ...newEgypt];
        if(!list.length){
          egGrid.innerHTML = `<div class="empty-state empty-state--compact" style="grid-column:1/-1;">
            <p class="empty-state__title">لا توجد برامج مطابقة</p>
            <p class="empty-state__desc">الفلترة: نطاق=${filters.scope} • مستوى=${filters.level}${q?' • بحث='+escapeHtml(window.__searchQuery):''}</p>
            <button type="button" class="btn btn--ghost btn--sm" data-clear-filters>مسح الفلترة</button>
          </div>`;
        } else {
          egGrid.innerHTML = list.map(p=>{
            const isDetailed = p.id && String(p.id).startsWith('EGO-');
            if(isDetailed){
              const d = p;
              const title = d.name_ar || d.name_original;
              const url = d.official_url || d.apply_url || '#';
              const hasUrl = url && url !== '' && !url.includes('غير متحقق');
              return `
            <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:12px;" id="${escapeHtml(d.id||'')}">
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:start; justify-content:space-between;">
                <h3 style="font-size:15px; flex:1; line-height:1.4;">${escapeHtml(title)}</h3>
                <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(d.opportunity_type||'')}</span>
              </div>
              <p style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(d.provider||'')} • ${escapeHtml(d.country||'')} • ${escapeHtml(d.field||'')}</p>
              ${d.subfields?`<p style="font-size:12.5px; color:var(--text-secondary); background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:10px; line-height:1.6;"><strong>التخصص:</strong> ${escapeHtml(d.subfields)}</p>`:''}
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; color:var(--text-secondary);">
                ${d.target_audience?`<div style="background:var(--bg-surface); border:1px solid var(--border-color); padding:8px; border-radius:10px;"><strong>الفئة:</strong><br>${escapeHtml(d.target_audience)}</div>`:''}
                ${!isPlaceholder(d.duration)?`<div style="background:var(--bg-surface); border:1px solid var(--border-color); padding:8px; border-radius:10px;"><strong>المدة:</strong><br>${escapeHtml(d.duration)}</div>`:''}
              </div>
              ${d.cost_class?`<p style="font-size:12px; color:var(--text-muted);"><strong>التكلفة:</strong> ${escapeHtml(d.cost_class)} ${d.funding_details? '— '+escapeHtml(d.funding_details.slice(0,120)) : ''}</p>`:''}
              ${!isPlaceholder(d.language)?`<p style="font-size:11.5px; color:var(--text-muted);">اللغة: ${escapeHtml(d.language)}</p>`:''}
              ${!isPlaceholder(d.deadline) && !String(d.deadline).includes('غير متحقق')?`<p style="font-size:11.5px; color:var(--text-muted);">الموعد: ${escapeHtml(d.deadline)}</p>`:''}
              <div style="display:flex; gap:8px; margin-top:auto; flex-wrap:wrap;">
                ${hasUrl?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1;">الموقع الرسمي ↗</a>`:`<span class="badge badge--muted" style="padding:8px;">راجع المصادر الثانوية</span>`}
                ${d.apply_url && d.apply_url.includes('http')?`<a href="${escapeHtml(d.apply_url)}" target="_blank" rel="noopener noreferrer" class="btn btn--ghost btn--sm">التقديم ↗</a>`:''}
              </div>
              ${d.notes?`<details style="font-size:11.5px; color:var(--text-muted); background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:8px;"><summary style="cursor:pointer; font-weight:700;">ملاحظات</summary><div style="margin-top:6px; line-height:1.7;">${escapeHtml(d.notes)}</div></details>`:''}
              ${cardActionsHtml('opp-'+(d.id||title), hasUrl?url:location.href, title)}
            </article>
              `;
            }
            return `
            <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px;" id="${escapeHtml(p.id||'')}">
              <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                <h3 style="font-size:15px; flex:1;">${escapeHtml(p.name)}</h3>
              </div>
              <p style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(p.entity)} • <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary); text-decoration:underline;">${escapeHtml(p.website||'')}</a></p>
              ${p.tracks?`<p style="font-size:12.5px; color:var(--text-secondary); background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:10px; line-height:1.6;"><strong>المسارات:</strong> ${escapeHtml(p.tracks)}</p>`:''}
              ${p.target?`<p style="font-size:12.5px; color:var(--text-muted);"><strong>الفئة:</strong> ${escapeHtml(p.target)}</p>`:''}
              ${p.duration?`<p style="font-size:12.5px; color:var(--text-muted);"><strong>المدة:</strong> ${escapeHtml(p.duration)}</p>`:''}
              ${p.conditions?`<p style="font-size:11.5px; color:var(--text-muted); border-right:3px solid var(--border-strong); padding-right:8px;">${escapeHtml(p.conditions)}</p>`:''}
              <div style="display:flex; gap:8px; margin-top:auto; align-items:center; flex-wrap:wrap;">
                <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1;">الموقع الرسمي ↗</a>
                ${p.scope?`<span class="badge badge--muted">${escapeHtml(p.scope)}</span>`:''}
                ${p.level?`<span class="badge badge--muted">${escapeHtml(p.level)}</span>`:''}
              </div>
              ${cardActionsHtml('opp-'+(p.id||p.name), p.link, p.name)}
            </article>
            `;
          }).join('');
        }
      }
      if(intlGrid){
        // دمج: دولي القديم (15) + المفصل دولي (7) = 22
        const oldIntl = (data.intlScholarships||[]).filter(p=> matchesOpp(p, filters, q));
        const newIntl = intlDetailed.filter(d=> matchesDetailed(d, filters, q));
        const list2 = [...oldIntl, ...newIntl];
        if(!list2.length){
          intlGrid.innerHTML = `<div class="empty-state empty-state--compact" style="grid-column:1/-1;"><p class="empty-state__title">لا توجد منح مطابقة</p><p class="empty-state__desc">جرّب تغيير الفلترة.</p></div>`;
        } else {
          intlGrid.innerHTML = list2.map(p=>{
            const isDetailed = p.id && String(p.id).startsWith('EGO-');
            if(isDetailed){
              const d = p;
              const title = d.name_ar || d.name_original;
              const url = d.official_url || d.apply_url || '#';
              const hasUrl = url && url !== '' && !url.includes('غير متحقق');
              return `
            <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:12px;" id="${escapeHtml(d.id||'')}">
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:start; justify-content:space-between;">
                <h3 style="font-size:14px; flex:1; line-height:1.4;">${escapeHtml(title)}</h3>
                <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(d.opportunity_type||'')}</span>
              </div>
              <p style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(d.provider||'')} • ${escapeHtml(d.country||'')} • ${escapeHtml(d.field||'')}</p>
              ${d.subfields?`<p style="font-size:12px; color:var(--text-secondary); background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:10px; line-height:1.6;">${escapeHtml(d.subfields)}</p>`:''}
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; color:var(--text-secondary);">
                ${d.target_audience?`<div style="background:var(--bg-surface); border:1px solid var(--border-color); padding:8px; border-radius:10px;"><strong>الفئة:</strong><br>${escapeHtml(d.target_audience)}</div>`:''}
                ${!isPlaceholder(d.duration)?`<div style="background:var(--bg-surface); border:1px solid var(--border-color); padding:8px; border-radius:10px;"><strong>المدة:</strong><br>${escapeHtml(d.duration)}</div>`:''}
              </div>
              ${d.cost_class?`<p style="font-size:12px; color:var(--text-muted);"><strong>التكلفة:</strong> ${escapeHtml(d.cost_class)}</p>`:''}
              ${!isPlaceholder(d.deadline) && !String(d.deadline).includes('غير متحقق')?`<p style="font-size:11.5px; color:var(--text-muted);">الموعد: ${escapeHtml(d.deadline)}</p>`:''}
              <div style="display:flex; gap:8px; margin-top:auto; flex-wrap:wrap;">
                ${hasUrl?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1; background:var(--color-primary); border-color:var(--color-primary);">الموقع الرسمي ↗</a>`:`<span class="badge badge--muted" style="padding:8px;">راجع المصادر</span>`}
                ${d.apply_url && d.apply_url.includes('http')?`<a href="${escapeHtml(d.apply_url)}" target="_blank" rel="noopener noreferrer" class="btn btn--ghost btn--sm">التقديم ↗</a>`:''}
              </div>
              ${d.notes?`<details style="font-size:11.5px; color:var(--text-muted); background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:8px;"><summary style="cursor:pointer; font-weight:700;">ملاحظات</summary><div style="margin-top:6px; line-height:1.7;">${escapeHtml(d.notes)}</div></details>`:''}
              ${cardActionsHtml('opp-'+(d.id||title), hasUrl?url:location.href, title)}
            </article>
              `;
            }
            return `
            <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px;" id="${escapeHtml(p.id||'')}">
              <div style="display:flex; justify-content:space-between; gap:8px;">
                <h3 style="font-size:14px; flex:1;">${escapeHtml(p.name)}</h3>
              </div>
              <p style="font-size:13px; color:var(--text-secondary);"><strong>${escapeHtml(p.type||'')}</strong></p>
              ${p.conditions?`<p style="font-size:12px; color:var(--text-muted); background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 10px; border-radius:8px;">${escapeHtml(p.conditions)}</p>`:''}
              ${p.link && p.link!=='#'?`<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="width:100%; background:var(--color-primary); border-color:var(--color-primary);">الموقع الرسمي ↗</a>`:`<span class="badge badge--muted" style="justify-content:center; padding:8px;">راجع القسم للروابط الرسمية</span>`}
              <span style="font-size:11px; color:var(--text-muted); text-align:center;">${p.scope?escapeHtml(p.scope):''} ${p.scope && p.level ? '•' : ''} ${p.level?escapeHtml(p.level):''}</span>
              ${cardActionsHtml('opp-'+(p.id||p.name), p.link, p.name)}
            </article>
            `;
          }).join('');
        }
      }
      updateCounter();
    }
    function updateCounter(){
      const counter = $('#oppCounter');
      if(!counter) return;
      const q = normalize(window.__searchQuery||'');
      // إجمالي مدمج: 9 + 15 + 11 = 35
      const allCount = (data.egyptPrograms.length + data.intlScholarships.length + (hasDetailed ? data.detailedOpportunities.length : 0));
      const filteredCount = (
        data.egyptPrograms.filter(p=>matchesOpp(p,filters,q)).length +
        data.intlScholarships.filter(p=>matchesOpp(p,filters,q)).length +
        (hasDetailed ? data.detailedOpportunities.filter(d=>matchesDetailed(d,filters,q)).length : 0)
      );
      counter.textContent = filteredCount + ' من ' + allCount;
    }

    applyToUI();
    renderAll();

    if(officialEl){
      officialEl.innerHTML = data.officialSites.map(s=>`
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px;">
          <div><div style="font-weight:800; font-size:13px;">${escapeHtml(s.name)}</div><div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(s.desc)}</div></div>
          <span style="color:var(--text-muted);">↗</span>
        </a>
      `).join('');
    }
    renderFAQ('faqOpp', data.faq);
    renderRefTables();

    window.renderScholarships = renderAll;
    // also expose for search sync
    window.__renderScholarships = renderAll;
  }

  /* ---------- Career Paths ---------- */
  function renderCareerPaths(){
    const grid = $('#careerGrid');
    const trendsEl = $('#marketTrends');
    if(trendsEl && data.marketTrends){
      trendsEl.innerHTML = data.marketTrends.map(t=>`
        <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-size:16px;">${escapeHtml(t.status.split(' ')[0]||'•')}</span>
            <span class="badge ${t.status.includes('الأعلى')?'badge--primary':t.status.includes('طلب')?'badge--accent':'badge--muted'}" style="font-size:11px;">${escapeHtml(t.status)}</span>
          </div>
          <div style="font-weight:800; font-size:13px; margin-bottom:4px;">${escapeHtml(t.track)}</div>
          <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(t.reason)}</div>
        </div>
      `).join('');
    }
    if(!grid) {
      // still need to handle chips etc? if grid missing, just do plan etc.
      renderPlan90();
      renderFAQ('faqCareer', data.faq);
      renderRefTables();
      return;
    }

    // Chips filtering
    let chipFilter = 'all';
    const chipsEl = $('#careerChips');
    const counterEl = $('#careerCounter');
    // read hash for chips?
    const hashChip = new URLSearchParams(location.hash.replace(/^#/,'')).get('path');
    if(hashChip) chipFilter = hashChip;

    function applyChipUI(){
      if(!chipsEl) return;
      chipsEl.querySelectorAll('.chip').forEach(c=>{
        c.classList.toggle('is-active', c.dataset.filter===chipFilter);
      });
      const params = new URLSearchParams(location.hash.replace(/^#/,''));
      if(chipFilter==='all') params.delete('path');
      else params.set('path', chipFilter);
      const nh = params.toString();
      history.replaceState(null,'', location.pathname + location.search + (nh?'#'+nh:''));
    }
    if(chipsEl){
      chipsEl.querySelectorAll('.chip').forEach(ch=>{
        if(ch.dataset.bound==='1') return;
        ch.dataset.bound='1';
        ch.addEventListener('click', ()=>{
          chipFilter = ch.dataset.filter;
          applyChipUI();
          renderGrid();
        });
      });
    }

    function careerMatchesChip(p, chip){
      if(chip==='all') return true;
      const t = (p.title||'').toLowerCase();
      const id = p.id||'';
      if(chip==='ai' && (id.includes('ai')|| t.includes('ذكاء'))) return true;
      if(chip==='data' && (id.includes('data')|| t.includes('بيانات'))) return true;
      if(chip==='cyber' && (id.includes('cyber')|| t.includes('سيبراني')|| t.includes('أمن'))) return true;
      if(chip==='web' && (id.includes('web')|| t.includes('ويب'))) return true;
      if(chip==='ui' && (id.includes('ui')|| t.includes('تصميم'))) return true;
      if(chip==='short' && (p.duration||'').includes('3') ) return true;
      // also match level? no
      return false;
    }

    function renderGrid(){
      const q = normalize(window.__searchQuery||'');
      let list = data.careerPaths||[];
      // chip filter
      list = list.filter(p=> careerMatchesChip(p, chipFilter));
      // search
      if(q) list = list.filter(p=> normalize(p.title+' '+(p.desc||'')+' '+(p.goal||'')+' '+(p.skills||[]).join(' ')+' '+(p.roles||[]).join(' ')).includes(q));
      if(counterEl) counterEl.textContent = list.length + ' من ' + data.careerPaths.length;
      applyChipUI();
      if(!list.length){
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p class="empty-state__title">لا توجد مسارات مطابقة</p><p class="empty-state__desc">جرّب كلمة مثل "Python" أو "تصميم" أو غيّر الشريحة.</p><button type="button" class="btn btn--ghost btn--sm" data-show-all-career>عرض الكل</button></div>`;
        return;
      }
      grid.innerHTML = list.map(p=>{
        // شريط زمني أفقي — نقاط المراحل
        const timelineHtml = `<div style="display:flex; align-items:center; gap:0; margin:6px 0 2px; padding:6px 2px; overflow-x:auto; scrollbar-width:none;">
          ${p.roadmap.map((r,i)=>`
            <span style="width:28px;height:28px;min-width:28px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0;${i===0?`background:${p.color};color:white;border:2px solid ${p.color};box-shadow:0 2px 8px ${p.color}30;`:`background:var(--bg-surface);color:var(--text-muted);border:1.5px solid var(--border-color);`}">${i+1}</span>
            ${i < p.roadmap.length-1 ? `<span style="flex:1; min-width:14px; height:2px; background:${i===0? p.color+'40' : 'var(--border-color)'}; margin:0 4px; border-radius:2px;"></span>` : ''}
          `).join('')}
          <span style="margin-right:8px; font-size:11px; color:var(--text-muted); white-space:nowrap;">${escapeHtml(p.duration||'')} • ${p.roadmap.length} مراحل</span>
        </div>`;
        // حقول بنية فارغة — ماذا ستبني؟ وماذا بعد المسار؟
        const projects = p.projects || p.build || null;
        const hasProjects = Array.isArray(projects) && projects.length;
        const projectsHtml = hasProjects ? `<div style="display:flex; flex-direction:column; gap:6px;">${projects.slice(0,3).map(pr=>`<span style="display:flex; gap:8px; align-items:center; font-size:12px; background:var(--bg-surface); border:1px solid var(--border-color); padding:7px 10px; border-radius:999px;"><span style="width:6px;height:6px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>${escapeHtml(typeof pr==='string'? pr : pr.title||pr)}</span>`).join('')}</div>` : `<div style="border:1.5px dashed var(--border-strong); border-radius:10px; padding:12px; text-align:center; background:var(--bg-muted);"><div style="font-size:11.5px; color:var(--text-muted); line-height:1.6;">🛠️ <strong>ماذا ستبني؟</strong><br>قريباً — 3 مشاريع مقترحة ستُضاف هنا</div><div style="font-size:10.5px; color:var(--text-muted); margin-top:4px; opacity:0.8;">(بنية جاهزة — بدون إعادة بناء)</div></div>`;

        const roles = p.roles || null;
        const hasRoles = Array.isArray(roles) && roles.length;
        const rolesHtml = hasRoles ? `<div style="display:flex; flex-wrap:wrap; gap:6px;">${roles.slice(0,4).map(r=>`<span class="badge" style="background:${p.color}12; color:${p.color}; border:1px solid ${p.color}30; font-size:11px;">${escapeHtml(r)}</span>`).join('')}</div>` : `<div style="border:1.5px dashed var(--border-strong); border-radius:10px; padding:12px; text-align:center; background:var(--bg-muted);"><div style="font-size:11.5px; color:var(--text-muted);">💼 <strong>ماذا بعد المسار؟</strong><br>قريباً — مسميات وظيفية</div><div style="font-size:10.5px; color:var(--text-muted); margin-top:4px; opacity:0.8;">(بنية جاهزة)</div></div>`;

        return `
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:12px; border-top:3px solid ${p.color};" id="${escapeHtml(p.id)}" data-level="${escapeHtml(p.level||'')}" data-duration="${escapeHtml(p.duration||'')}">
          <div style="display:flex; gap:12px; align-items:start;">
            <span style="width:44px;height:44px; border-radius:11px; background:${p.color}15; color:${p.color}; border:1px solid ${p.color}30; display:grid; place-items:center; font-size:20px; flex-shrink:0;">${p.icon}</span>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px; align-items:center;">
                <span class="badge badge--primary" style="font-size:11px; background:${p.color}; border-color:${p.color}; color:white;">${escapeHtml(p.duration||'')}</span>
                <span class="badge badge--muted" style="font-size:11px; display:inline-flex; align-items:center; gap:4px;">${escapeHtml(p.level||'')} ${p.level && p.level.includes('→') ? '' : '→ متقدم'}</span>
              </div>
              <h3 style="font-size:16px; margin-bottom:4px; line-height:1.3;">${escapeHtml(p.title)}</h3>
              <p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(p.desc)}</p>
            </div>
          </div>
          ${timelineHtml}
          ${p.goal?`<p style="font-size:12.5px; background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:10px; line-height:1.6;"><strong>الهدف:</strong> ${escapeHtml(p.goal)}</p>`:''}
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${(p.skills||[]).slice(0,4).map(s=>`<span class="badge badge--muted" style="font-size:11px;">${escapeHtml(s)}</span>`).join('')}
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin-top:2px;">
            <div style="background:var(--bg-muted); border:1px solid var(--border-color); border-radius:10px; padding:10px 12px;">
              <div style="font-size:11.5px; font-weight:800; margin-bottom:8px; color:var(--text-primary);">🛠️ ماذا ستبني؟</div>
              ${projectsHtml}
            </div>
            <div style="background:var(--bg-muted); border:1px solid var(--border-color); border-radius:10px; padding:10px 12px;">
              <div style="font-size:11.5px; font-weight:800; margin-bottom:8px; color:var(--text-primary);">💼 ماذا بعد المسار؟</div>
              ${rolesHtml}
            </div>
          </div>
          <div style="background:var(--bg-muted); border:1px solid var(--border-color); border-radius:10px; padding:10px 12px;">
            <div style="font-size:12px; font-weight:800; margin-bottom:6px; display:flex; align-items:center; gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:${p.color};display:inline-block;"></span> خارطة الطريق — ${p.roadmap.length} مراحل</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:11px; color:var(--text-muted);">
              ${p.roadmap.map(r=>`<span style="background:var(--bg-surface); border:1px solid var(--border-color); padding:4px 8px; border-radius:999px;">${escapeHtml(r.title)}</span>`).join('')}
            </div>
          </div>
          <p style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(p.students||'')}</p>
          ${p.featuredPage ? `<a href="${escapeHtml(p.featuredPage)}" class="btn btn--primary" style="width:100%; background:#0EA5E9; border-color:#0EA5E9; font-weight:800;">${escapeHtml(p.featuredLabel||'فتح الصفحة المخصصة ↗')} — ${escapeHtml(p.title)}</a>` : ''}
          ${p.featuredPage2 ? `<a href="${escapeHtml(p.featuredPage2)}" class="btn btn--primary" style="width:100%; background:#0F172A; border-color:#0F172A; color:#FACC15; font-weight:800;">${escapeHtml(p.featuredLabel2||'فتح الصفحة المخصصة ↗')} — ${escapeHtml(p.title)}</a>` : ''}
          <a href="career-path.html?id=${escapeHtml(p.id)}" class="btn ${(p.featuredPage||p.featuredPage2)?'btn--ghost':'btn--primary'}" style="width:100%; ${(p.featuredPage||p.featuredPage2)?'':'background:'+p.color+'; border-color:'+p.color+';'}">عرض الخارطة الكاملة — ${escapeHtml(p.duration||'')}</a>
          ${cardActionsHtml('career-'+p.id, 'pages/career-path.html?id='+p.id, p.title)}
        </article>
      `}).join('');
    }

    applyChipUI();
    renderGrid();
    renderPlan90();
    renderFAQ('faqCareer', data.faq);
    renderRefTables();
    // Helper for career
    if(data.helper){
      renderHelper('careerHelperOptions','careerHelperResult', data.helper, (choice)=>{
        if(!choice) return;
        // map helper label to chip?
        if(choice.label.includes('ذكاء')||choice.label.includes('AI')) chipFilter='ai';
        else if(choice.label.includes('بيانات')) chipFilter='data';
        else if(choice.label.includes('أمن')||choice.label.includes('سيبراني')) chipFilter='cyber';
        else if(choice.label.includes('ويب')) chipFilter='web';
        else if(choice.label.includes('تصميم')) chipFilter='ui';
        else chipFilter='all';
        applyChipUI(); renderGrid();
      });
    }

    window.renderCareerPaths = renderGrid;
  }

  function renderCareerDetail(){
    const container = $('#careerDetail');
    if(!container) return;
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || 'ai-automation';
    const path = data.careerPaths.find(p=>p.id===id) || data.careerPaths[0];
    if(!path) return;
    const headerTitle = $('#detailTitle');
    const headerDesc = $('#detailDesc');
    const headerIcon = $('#detailIcon');
    const headerSkills = $('#detailSkills');
    if(headerTitle) headerTitle.textContent = path.title;
    if(headerDesc) headerDesc.textContent = path.goal ? path.goal + ' — ' + path.desc : path.desc;
    if(headerIcon){ headerIcon.textContent = path.icon; headerIcon.style.background = path.color+'15'; headerIcon.style.color = path.color; headerIcon.style.borderColor = path.color+'30'; }
    if(headerSkills) headerSkills.innerHTML = (path.skills||[]).map(s=>`<span class="badge badge--muted">${escapeHtml(s)}</span>`).join('') + (path.roles? ' ' + path.roles.slice(0,3).map(r=>`<span class="badge badge--accent" style="font-size:11px;">${escapeHtml(r)}</span>`).join('') : '');
    const studentsEl = $('#detailStudents');
    if(studentsEl) studentsEl.textContent = (path.level||path.students||'');
    const countEl = $('#detailCount');
    if(countEl) countEl.textContent = (path.duration||'') + ' • ' + path.roadmap.length + ' مراحل';
    const count2 = $('#detailCount2');
    if(count2) count2.textContent = path.roadmap.length;
    const bc = $('#detailBreadcrumb');
    if(bc) bc.innerHTML = `<a href="../index.html">الرئيسية</a><span class="breadcrumb__sep">/</span><a href="career-paths.html">المسارات</a><span class="breadcrumb__sep">/</span><span aria-current="page">${escapeHtml(path.title)}</span>`;
    // Overview extra
    const overviewCard = container.querySelector('.card');
    if(overviewCard && !overviewCard.querySelector('.extra-overview')){
      let extra = '';
      if(path.requirements) extra += `<div style="margin-top:10px; padding:10px 12px; background:var(--bg-muted); border:1px solid var(--border-color); border-radius:10px; font-size:12.5px; line-height:1.7;"><strong>المتطلبات:</strong> ${escapeHtml(path.requirements)}</div>`;
      if(path.duration || path.level){
        extra += `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;"><span class="badge badge--primary" style="background:${path.color}; border-color:${path.color}; color:white;">${escapeHtml(path.duration||'')}</span><span class="badge badge--muted">${escapeHtml(path.level||'')}</span><span class="badge badge--muted">${escapeHtml((path.roles||[])[0]||'')}</span></div>`;
      }
      overviewCard.insertAdjacentHTML('beforeend', `<div class="extra-overview">${extra}</div>`);
    }
    // حقول بنية فارغة — ماذا ستبني؟ وماذا بعد المسار؟ (للتفصيل)
    const detailExtra = document.getElementById('detailExtra');
    if(detailExtra){
      const proj = path.projects || path.build || null;
      const hasProj = Array.isArray(proj) && proj.length;
      const projHtml = hasProj ? `<div style="display:flex; flex-direction:column; gap:6px;">${proj.slice(0,3).map(pr=>`<span style="display:flex; gap:8px; align-items:center; font-size:13px; background:var(--bg-surface); border:1px solid var(--border-color); padding:8px 10px; border-radius:999px;"><span style="width:6px;height:6px;border-radius:50%;background:${path.color};flex-shrink:0;"></span>${pr.title||pr}</span>`).join('')}</div>` : `<div style="border:1.5px dashed var(--border-strong); border-radius:10px; padding:14px; text-align:center; background:var(--bg-muted);"><div style="font-size:13px; color:var(--text-muted);">🛠️ <strong>ماذا ستبني؟</strong><br>قريباً — 3 مشاريع مقترحة</div><div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; opacity:0.8;">سيتم ملؤها لاحقاً بدون إعادة بناء</div></div>`;
      const roles = path.roles || null;
      const hasRoles = Array.isArray(roles) && roles.length;
      const rolesHtml = hasRoles ? `<div style="display:flex; flex-wrap:wrap; gap:6px;">${roles.map(r=>`<span class="badge" style="background:${path.color}12; color:${path.color}; border:1px solid ${path.color}30;">${r}</span>`).join('')}</div>` : `<div style="border:1.5px dashed var(--border-strong); border-radius:10px; padding:14px; text-align:center; background:var(--bg-muted);"><div style="font-size:13px; color:var(--text-muted);">💼 <strong>ماذا بعد المسار؟</strong><br>قريباً — مسميات وظيفية</div></div>`;
      // شريط زمني أفقي مصغر
      const timelineMini = `<div style="display:flex; align-items:center; gap:0; margin-bottom:12px; padding:8px 4px; overflow-x:auto;"><div style="display:flex; align-items:center; gap:0; flex:1;">${path.roadmap.map((r,i)=>`<span style="width:26px;height:26px;min-width:26px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:800;${i===0?`background:${path.color};color:white;border:2px solid ${path.color}`:`background:var(--bg-muted);color:var(--text-muted);border:1.5px solid var(--border-color)`}">${i+1}</span>${i < path.roadmap.length-1 ? `<span style="flex:1; height:2px; background:${i===0? path.color+'40':'var(--border-color)'}; margin:0 4px;"></span>`:''}`).join('')}</div><span style="font-size:11px; color:var(--text-muted); margin-right:8px; white-space:nowrap;">${path.duration||''}</span></div>`;
      detailExtra.innerHTML = `
        ${timelineMini}
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px;">
          <div class="card" style="margin:0;"><div style="font-weight:800; font-size:13px; margin-bottom:8px;">🛠️ ماذا ستبني؟ <span style="font-weight:400; font-size:11px; color:var(--text-muted);">(3 مشاريع)</span></div>${projHtml}</div>
          <div class="card" style="margin:0;"><div style="font-weight:800; font-size:13px; margin-bottom:8px;">💼 ماذا بعد المسار؟ <span style="font-weight:400; font-size:11px; color:var(--text-muted);">(مسميات وظيفية)</span></div>${rolesHtml}</div>
        </div>
      `;
    }
    const roadmapEl = $('#detailRoadmap');
    if(roadmapEl){
      roadmapEl.innerHTML = path.roadmap.map((r, idx)=>`
        <div class="roadmap__step" id="stage-${idx+1}">
          <div class="roadmap__dot" style="${idx===0?`background:${path.color};color:white;border-color:${path.color}`:''}">${idx+1}</div>
          <div class="roadmap__content">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span class="badge ${idx===0?'badge--primary':'badge--muted'}" style="font-size:11px; ${idx===0?`background:${path.color}; border-color:${path.color}; color:white;`:''}">${escapeHtml(r.stage)}</span>
              ${r.duration?`<span class="badge badge--muted" style="font-size:11px;">${escapeHtml(r.duration)}</span>`:''}
              ${r.outcome?`<span class="badge" style="background:${path.color}15; color:${path.color}; border:1px solid ${path.color}30; font-size:11px;">المخرج: ${escapeHtml(r.outcome)}</span>`:''}
            </div>
            <div class="roadmap__step-title">${escapeHtml(r.title)}</div>
            <div class="roadmap__step-desc">${escapeHtml(r.desc)}</div>
            ${r.topics && r.topics.length ? `<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">${r.topics.slice(0,6).map(t=>`<span class="badge badge--muted" style="font-size:11px;">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
              ${(r.sources||[]).map(s=>`<span style="display:flex; align-items:center; gap:8px; font-size:12.5px; background:var(--bg-muted); border:1px solid var(--border-color); padding:8px 10px; border-radius:999px;"><span style="width:6px;height:6px;border-radius:50%;background:${path.color};display:inline-block; flex-shrink:0;"></span> ${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('');
      let after = '';
      if(path.extraSteps && path.extraSteps.length){
        after += `<div class="card" style="margin-top:16px;"><h3 style="font-size:14px; margin-bottom:8px;">خطوات مدمجة</h3><div style="display:flex; flex-direction:column; gap:8px;">${path.extraSteps.map(s=>`<div style="display:flex; gap:10px; padding:10px 12px; background:var(--bg-muted); border:1px solid var(--border-color); border-radius:10px;"><span style="width:6px;height:6px; border-radius:50%; background:${path.color}; margin-top:7px; flex-shrink:0;"></span><div><div style="font-weight:800; font-size:13px;">${escapeHtml(s.title)}</div><div style="font-size:12.5px; color:var(--text-secondary);">${escapeHtml(s.desc)}</div></div></div>`).join('')}</div></div>`;
      }
      if(path.warnings && path.warnings.length){
        after += `<div style="margin-top:12px; padding:12px; background:#FEF2F2; border:1px solid #FECACA; border-radius:12px;"><div style="font-weight:800; font-size:13px; color:#991B1B; margin-bottom:6px;">⚠️ تنبيهات</div><ul style="font-size:12.5px; color:#7F1D1D; line-height:1.7; padding-right:18px;">${path.warnings.map(w=>`<li>${escapeHtml(w)}</li>`).join('')}</ul></div>`;
      }
      if(path.tips && path.tips.length){
        after += `<div style="margin-top:12px; padding:12px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px;"><div style="font-weight:800; font-size:13px; color:#065F46; margin-bottom:6px;">💡 نصائح</div><ul style="font-size:12.5px; color:#065F46; line-height:1.7; padding-right:18px;">${path.tips.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`;
      }
      if(path.goldenRule){
        after += `<div style="margin-top:12px; padding:12px; background:var(--color-primary-light); border:1px solid rgba(227,32,39,0.18); border-radius:12px; font-size:13px; line-height:1.7;"><strong>القاعدة الذهبية:</strong> ${escapeHtml(path.goldenRule)}</div>`;
      }
      if(path.tool){
        after += `<div style="margin-top:12px; padding:10px 12px; background:var(--bg-muted); border:1px solid var(--border-color); border-radius:10px; font-size:12.5px;"><strong>الأداة:</strong> ${escapeHtml(path.tool)}</div>`;
      }
      // featured page CTAs if exist (Power English + Z American English)
      if(path.featuredPage){
        after += `<div style="margin-top:16px; padding:14px; background:#E0F2FE; border:1.5px solid #0EA5E9; border-radius:14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;"><span style="width:42px;height:42px; border-radius:11px; background:#0EA5E9; color:white; display:grid; place-items:center; font-size:18px;">🎧</span><div style="flex:1; min-width:200px;"><div style="font-weight:800; font-size:14px; color:#0C4A6E;">${escapeHtml(path.featuredLabel||'صفحة مخصصة')}</div><div style="font-size:12.5px; color:#0369A1; line-height:1.6;">MP3 + PDF — 6 أجزاء — طريقة اكتساب الطفل للغة</div></div><a href="${escapeHtml(path.featuredPage)}" class="btn btn--primary" style="background:#0EA5E9; border-color:#0EA5E9; font-weight:800;">فتح الصفحة ↗</a></div>`;
      }
      if(path.featuredPage2){
        after += `<div style="margin-top:12px; padding:14px; background:#FFFBEB; border:1.5px solid #FACC15; border-radius:14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;"><span style="width:42px;height:42px; border-radius:11px; background:#0F172A; color:#FACC15; display:grid; place-items:center; font-size:18px; font-weight:900;">Z</span><div style="flex:1; min-width:200px;"><div style="font-weight:800; font-size:14px; color:#92400E;">${escapeHtml(path.featuredLabel2||'صفحة مخصصة')}</div><div style="font-size:12.5px; color:#92400E; line-height:1.6;">تأسست 2020 — شرح بالعربي • فيديوهات منظمة • من الصفر للاحتراف</div></div><a href="${escapeHtml(path.featuredPage2)}" class="btn btn--primary" style="background:#0F172A; border-color:#0F172A; color:#FACC15; font-weight:800;">فتح الصفحة ↗</a></div>`;
      }
      // add fav/copy/report for career path detail page
      after += `<div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">${cardActionsHtml('career-'+path.id, location.href, path.title)}<button type="button" class="btn btn--ghost btn--sm" data-share>مشاركة المسار</button></div>`;
      if(after){
        // Remove previous after content if re-rendering
        const existingAfter = roadmapEl.nextElementSibling;
        if(existingAfter && existingAfter.classList.contains('career-after')) existingAfter.remove();
        const wrapper = document.createElement('div');
        wrapper.className='career-after';
        wrapper.innerHTML = after;
        roadmapEl.insertAdjacentElement('afterend', wrapper);
      }
    }
    document.title = path.title + " — عصفورة الويب";
    // TOC for this page? app.js handles automatically
  }

  /* ---------- YouTube ---------- */
  function renderYoutube(){
    const arGrid = $('#arabicYoutubeGrid');
    const enGrid = $('#englishYoutubeGrid');
    if(!arGrid && !enGrid) return;
    // قنوات قديمة موثقة (19 بروابط @Handle مباشرة)
    const baseChannels = data.youtubeChannels || [...(data.youtube?.arabic||[]).map(c=>({...c, lang:'عربية', langEn:'ar'})), ...(data.youtube?.english||[]).map(c=>({...c, lang:'إنجليزية', langEn:'en'}))];
    // قنوات مفصلة (35 من تقرير 2026-10-13 — روابط بحث، مستوى أدلة، لم تُفحص مباشرة)
    const hasDetailedYt = Array.isArray(data.detailedYoutubeChannels) && data.detailedYoutubeChannels.length;
    const detailedRaw = hasDetailedYt ? data.detailedYoutubeChannels : [];
    // دمج للعداد والبحث — نحتفظ بالأصل للعرض المفصل
    let currentFilter = 'all';
    const filterButtons = $$('.js-filter-yt');
    function applyFilter(f){
      currentFilter = f;
      filterButtons.forEach(b=> b.classList.toggle('is-active', b.dataset.filter===f));
      renderAr(); renderEn();
    }
    filterButtons.forEach(b=>{ if(b.dataset.bound==='1') return; b.dataset.bound='1'; b.addEventListener('click', ()=> applyFilter(b.dataset.filter)); });

    function matchesFilterOld(ch){
      if(currentFilter==='all') return true;
      if(currentFilter==='ar') return ch.langEn==='ar';
      if(currentFilter==='en') return ch.langEn==='en';
      if(currentFilter==='برمجة') return ch.category.includes('برمجة') || ch.content.includes('برمجة');
      if(currentFilter==='ذكاء') return ch.category.includes('ذكاء') || ch.content.includes('ذكاء') || ch.content.includes('AI') || ch.category.includes('بيانات');
      if(currentFilter==='أمن') return ch.category.includes('أمن') || ch.category.includes('شبكات') || ch.category.includes('سحابة');
      if(currentFilter==='إنجليزية') return ch.category.includes('إنجليزية') || ch.category.includes('تعلم الإنجليزية');
      if(currentFilter==='اختبار') return ch.category.includes('اختبار') || ch.content.includes('اختبار');
      if(currentFilter==='تصميم') return ch.category.includes('تصميم') || ch.content.includes('تصميم');
      return ch.category.includes(currentFilter) || ch.content.includes(currentFilter);
    }
    function matchesFilterDetailed(d){
      if(currentFilter==='all') return true;
      if(currentFilter==='ar') return d.language==='العربية';
      if(currentFilter==='en') return d.language==='الإنجليزية';
      if(currentFilter==='برمجة') return (d.main_field||'').includes('البرمجة');
      if(currentFilter==='ذكاء') return (d.main_field||'').includes('الذكاء') || (d.main_field||'').includes('البيانات');
      if(currentFilter==='أمن') return (d.main_field||'').includes('الأمن') || (d.main_field||'').includes('سيبراني');
      if(currentFilter==='إنجليزية') return false; // لا قنوات تعليم إنجليزية في المفصلة
      if(currentFilter==='اختبار') return (d.main_field||'').includes('اختبار');
      if(currentFilter==='تصميم') return (d.main_field||'').includes('التصميم');
      // fallback search in main_field/subfields
      return (d.main_field||'').includes(currentFilter) || (d.subfields||'').includes(currentFilter);
    }
    function renderAr(){
      if(!arGrid) return;
      // قديمة عربية (8)
      let oldList = baseChannels.filter(c=> c.langEn==='ar');
      if(currentFilter!=='all' && currentFilter!=='ar'){
        if(['برمجة','ذكاء','أمن','إنجليزية','اختبار','تصميم'].includes(currentFilter)) oldList = oldList.filter(matchesFilterOld);
        else if(currentFilter==='en') oldList = [];
      }
      // مفصلة عربية (7)
      let detailedAr = detailedRaw.filter(d=> d.language==='العربية');
      if(currentFilter!=='all' && currentFilter!=='ar'){
        if(['برمجة','ذكاء','أمن','إنجليزية','اختبار','تصميم'].includes(currentFilter)) detailedAr = detailedAr.filter(matchesFilterDetailed);
        else if(currentFilter==='en') detailedAr = [];
      }
      const q = normalize(window.__searchQuery||'');
      if(q){
        oldList = oldList.filter(c=> normalize(c.name+' '+c.handle+' '+c.content+' '+c.category+' '+c.level).includes(q));
        detailedAr = detailedAr.filter(d=> normalize((d.channel_name||'')+' '+(d.main_field||'')+' '+(d.subfields||'')+' '+(d.target_audience||'')+' '+(d.content_type||'')+' '+(d.best_playlists_named||'')+' '+(d.strengths||'')+' '+(d.limitations||'')).includes(q));
      }
      const totalAr = oldList.length + detailedAr.length;
      if(totalAr===0){
        arGrid.innerHTML = `<div class="empty-state empty-state--compact" style="grid-column:1/-1;"><p class="empty-state__title">لا توجد قنوات عربية مطابقة</p><p class="empty-state__desc">جرّب كلمة أخرى أو اختر تصفية مختلفة.</p></div>`;
        return;
      }
      const oldHtml = oldList.map(ch=>`
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px; border-top:3px solid #E32027;" id="${escapeHtml(ch.handle.replace(/[^a-z0-9]/gi,''))}" data-lang="${escapeHtml(ch.langEn||'ar')}" data-category="${escapeHtml(ch.category||'')}" data-level="${escapeHtml(ch.level||'')}">
          <div style="display:flex; align-items:start; justify-content:space-between; gap:10px;">
            <div style="width:42px;height:42px; border-radius:11px; background:#FFF0F1; border:1px solid #FFE0E3; display:grid; place-items:center; color:#E32027; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 12c0 3-1.5 5-4 6s-4-1-6-1-3.5 2-6 1-4-3-4-6 1.5-5 4-6 4 1 6 1 3.5-2 6-1 4 3 4 6z"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:end;">
              <span class="badge badge--primary">عربية</span>
              <span class="badge badge--muted" style="background:#DCFCE7; color:#166534; border-color:#BBF7D0;">✅ موثقة</span>
              <span class="badge badge--muted">${escapeHtml(ch.level)}</span>
            </div>
          </div>
          <h3 style="font-size:15px; line-height:1.3;">${escapeHtml(ch.name)}</h3>
          <p style="font-size:12.5px; color:var(--text-muted); direction:ltr; text-align:right;">${escapeHtml(ch.handle)} • ${escapeHtml(ch.category)}</p>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.7;">${escapeHtml(ch.content)}</p>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(ch.category)}</span>
            <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(ch.level)}</span>
          </div>
          <div style="margin-top:auto; display:flex; gap:8px;">
            <a href="${escapeHtml(ch.link)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1; background:#E32027;">فتح على يوتيوب ↗</a>
            <span class="badge badge--muted" style="align-self:center; direction:ltr;">${escapeHtml(ch.handle)}</span>
          </div>
          ${cardActionsHtml('yt-'+ch.handle, ch.link, ch.name)}
        </article>
      `).join('');
      const detailedHtml = detailedAr.map(d=> {
        const isVerified = d.channel_url && d.channel_url !== 'لم يتم التحقق' && d.channel_url.startsWith('http');
        const linkUrl = isVerified ? d.channel_url : (d.youtube_search_url || '#');
        const btnLabel = isVerified ? 'فتح على يوتيوب ↗' : 'بحث يوتيوب ↗';
        const btnClass = isVerified ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm';
        const btnStyle = isVerified ? 'flex:1; background:#E32027;' : 'flex:1; border-style:dashed;';
        const badgeVerified = isVerified ? '<span class="badge" style="background:#DCFCE7; color:#166534; border:1px solid #BBF7D0; font-size:10.5px;">✅ موثقة</span>' : '<span class="badge badge--muted" style="font-size:10.5px;">⚠️ بحث فقط</span>';
        const iconBg = isVerified ? '#FFF0F1' : '#FEF3C7';
        const iconBorder = isVerified ? '#FFE0E3' : '#FDE68A';
        const iconColor = isVerified ? '#E32027' : '#92400E';
        const evidenceColor = (d.evidence_level||'').includes('قوي') ? '#166534' : (d.evidence_level||'').includes('متوسط') ? '#92400E' : '#6B7280';
        const evidenceBg = (d.evidence_level||'').includes('قوي') ? '#DCFCE7' : (d.evidence_level||'').includes('متوسط') ? '#FEF3C7' : '#F3F4F6';
        const evidenceBorder = (d.evidence_level||'').includes('قوي') ? '#BBF7D0' : (d.evidence_level||'').includes('متوسط') ? '#FDE68A' : '#E5E7EB';
        return `
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px; border-top:3px solid #E32027; background:var(--bg-surface);" id="${escapeHtml(d.id)}" data-lang="${d.language==='العربية'?'ar':'en'}" data-mainfield="${escapeHtml(d.main_field||'')}" data-evidence="${escapeHtml(d.evidence_level||'')}">
          <div style="display:flex; align-items:start; justify-content:space-between; gap:10px;">
            <div style="width:42px;height:42px; border-radius:11px; background:${iconBg}; border:1px solid ${iconBorder}; display:grid; place-items:center; color:${iconColor}; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 12c0 3-1.5 5-4 6s-4-1-6-1-3.5 2-6 1-4-3-4-6 1.5-5 4-6 4 1 6 1 3.5-2 6-1 4 3 4 6z"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:end; align-items:center;">
              <span class="badge badge--primary">عربية</span>
              <span class="badge" style="background:${evidenceBg}; color:${evidenceColor}; border:1px solid ${evidenceBorder}; font-size:10.5px;">${escapeHtml(d.evidence_level||'')} • ${d.independent_mentions} ذكر</span>
              ${badgeVerified}
            </div>
          </div>
          <h3 style="font-size:15px; line-height:1.3;">${escapeHtml(d.channel_name)}</h3>
          <p style="font-size:12px; color:var(--text-muted);">${escapeHtml(d.main_field)} • ${escapeHtml(d.subfields.slice(0,60))}</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11.5px; color:var(--text-secondary);">
            <div style="background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px;"><strong>الفئة:</strong><br>${escapeHtml(d.target_audience)} • ${escapeHtml(d.educational_level)}</div>
            <div style="background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px;"><strong>النوع:</strong><br>${escapeHtml(d.content_type)}</div>
          </div>
          ${(()=>{ const raw=d.best_playlists_named||''; const cleaned=cleanPlaceholder(raw); const isPh=isPlaceholder(raw); const hasPre=['غير محدد','غير متحقق','لم يتم التحقق'].some(pre=> raw.startsWith(pre)); const show=!isPh || (hasPre && cleaned && cleaned!==raw && !isPlaceholder(cleaned)); const val=show ? (isPh || hasPre ? cleaned : raw) : ''; return show && val ? `<p style="font-size:11.5px; color:var(--text-secondary); background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px; line-height:1.6;"><strong>قوائم:</strong> ${escapeHtml(val.slice(0,140))}</p>`:''; })()}
          ${!isPlaceholder(d.best_starting_video)? `<p style="font-size:11.5px; color:var(--text-muted);">بداية مقترحة: ${escapeHtml(d.best_starting_video.slice(0,80))}</p>`:''}
          <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:11px;">
            ${(()=>{ const raw=d.is_free||""; const cleaned=cleanPlaceholder(raw); const isPh=isPlaceholder(raw); const cleanedPh=isPlaceholder(cleaned); const hasPrefix = ["غير محدد","غير متحقق","لم يتم التحقق","غير متوفر"].some(pre=> raw.startsWith(pre)); const show=!isPh || (!cleanedPh && cleaned && cleaned!==raw && cleaned.length>3); const val= show ? (isPh || hasPrefix ? cleaned : raw) : ""; return show && val && !isPlaceholder(val) ? `<span class="badge badge--muted">${escapeHtml(val.slice(0,60))}</span>` : ""; })()}
            <span class="badge badge--muted">${escapeHtml(d.channel_status)}</span>
          </div>
          ${!isPlaceholder(d.strengths)? `<p style="font-size:11.5px; color:#166534; background:#DCFCE7; border:1px solid #BBF7D0; padding:6px 8px; border-radius:8px;">✓ ${escapeHtml(d.strengths.slice(0,110))}</p>`:''}
          ${!isPlaceholder(d.limitations)? `<p style="font-size:11.5px; color:#92400E; background:#FEF3C7; border:1px solid #FDE68A; padding:6px 8px; border-radius:8px;">⚠ ${escapeHtml(d.limitations.slice(0,110))}</p>`:''}
          <p style="font-size:10.5px; color:var(--text-muted);">${escapeHtml(d.notes)}</p>
          <div style="margin-top:auto; display:flex; gap:8px;">
            <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="${btnClass}" style="${btnStyle}"> ${btnLabel}</a>
            <span class="badge badge--muted" style="align-self:center; font-size:10.5px;">${escapeHtml(d.id)}</span>
          </div>
          ${cardActionsHtml('yt-'+d.id, linkUrl, d.channel_name)}
        </article>
        `;
      }).join('');
      arGrid.innerHTML = oldHtml + detailedHtml;
    }
    function renderEn(){
      if(!enGrid) return;
      let oldList = baseChannels.filter(c=> c.langEn==='en');
      if(currentFilter!=='all' && currentFilter!=='en'){
        if(['برمجة','ذكاء','أمن','إنجليزية','اختبار','تصميم'].includes(currentFilter)) oldList = oldList.filter(matchesFilterOld);
        else if(currentFilter==='ar') oldList = [];
      }
      let detailedEn = detailedRaw.filter(d=> d.language==='الإنجليزية');
      if(currentFilter!=='all' && currentFilter!=='en'){
        if(['برمجة','ذكاء','أمن','إنجليزية','اختبار','تصميم'].includes(currentFilter)) detailedEn = detailedEn.filter(matchesFilterDetailed);
        else if(currentFilter==='ar') detailedEn = [];
      }
      const q = normalize(window.__searchQuery||'');
      if(q){
        oldList = oldList.filter(c=> normalize(c.name+' '+c.handle+' '+c.content+' '+c.category+' '+c.level).includes(q));
        detailedEn = detailedEn.filter(d=> normalize((d.channel_name||'')+' '+(d.main_field||'')+' '+(d.subfields||'')+' '+(d.target_audience||'')+' '+(d.content_type||'')+' '+(d.best_playlists_named||'')+' '+(d.strengths||'')).includes(q));
      }
      const totalEn = oldList.length + detailedEn.length;
      if(totalEn===0){
        enGrid.innerHTML = `<div class="empty-state empty-state--compact" style="grid-column:1/-1;"><p class="empty-state__title">لا توجد قنوات إنجليزية مطابقة</p><p class="empty-state__desc">جرّب كلمة أخرى أو اختر تصفية مختلفة.</p></div>`;
        return;
      }
      const oldHtml = oldList.map(ch=>`
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px; border-top:3px solid #0E7490;" id="${escapeHtml(ch.handle.replace(/[^a-z0-9]/gi,''))}" data-lang="${escapeHtml(ch.langEn||'en')}" data-category="${escapeHtml(ch.category||'')}" data-level="${escapeHtml(ch.level||'')}">
          <div style="display:flex; align-items:start; justify-content:space-between; gap:10px;">
            <div style="width:42px;height:42px; border-radius:11px; background:#E0F2FE; border:1px solid #BAE6FD; display:grid; place-items:center; color:#0E7490; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 12c0 3-1.5 5-4 6s-4-1-6-1-3.5 2-6 1-4-3-4-6 1.5-5 4-6 4 1 6 1 3.5-2 6-1 4 3 4 6z"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:end;">
              <span class="badge" style="background:#E0F2FE;color:#0E7490;border:1px solid #BAE6FD">إنجليزية</span>
              <span class="badge badge--muted" style="background:#DCFCE7; color:#166534; border-color:#BBF7D0;">✅ موثقة</span>
              <span class="badge badge--muted">${escapeHtml(ch.level)}</span>
            </div>
          </div>
          <h3 style="font-size:15px; line-height:1.3;">${escapeHtml(ch.name)}</h3>
          <p style="font-size:12.5px; color:var(--text-muted); direction:ltr; text-align:right;">${escapeHtml(ch.handle)} • ${escapeHtml(ch.category)}</p>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.7;">${escapeHtml(ch.content)}</p>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(ch.category)}</span>
            <span class="badge badge--muted" style="font-size:11px;">${escapeHtml(ch.level)}</span>
          </div>
          <div style="margin-top:auto; display:flex; gap:8px;">
            <a href="${escapeHtml(ch.link)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1; background:#0E7490;">فتح على يوتيوب ↗</a>
            <span class="badge badge--muted" style="align-self:center; direction:ltr;">${escapeHtml(ch.handle)}</span>
          </div>
          ${cardActionsHtml('yt-'+ch.handle, ch.link, ch.name)}
        </article>
      `).join('');
      const detailedHtml = detailedEn.map(d=> {
        const isVerified = d.channel_url && d.channel_url !== 'لم يتم التحقق' && d.channel_url.startsWith('http');
        const linkUrl = isVerified ? d.channel_url : (d.youtube_search_url || '#');
        const btnLabel = isVerified ? 'فتح على يوتيوب ↗' : 'بحث يوتيوب ↗';
        const btnClass = isVerified ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm';
        const btnStyle = isVerified ? 'flex:1; background:#0E7490;' : 'flex:1; border-style:dashed; color:#0E7490; border-color:#0E7490;';
        const badgeVerified = isVerified ? '<span class="badge" style="background:#DCFCE7; color:#166534; border:1px solid #BBF7D0; font-size:10.5px;">✅ موثقة</span>' : '<span class="badge badge--muted" style="font-size:10.5px;">⚠️ بحث فقط</span>';
        const iconBg = isVerified ? '#E0F2FE' : '#FEF3C7';
        const iconBorder = isVerified ? '#BAE6FD' : '#FDE68A';
        const iconColor = isVerified ? '#0E7490' : '#92400E';
        const evidenceColor = (d.evidence_level||'').includes('قوي') ? '#166534' : (d.evidence_level||'').includes('متوسط') ? '#92400E' : '#6B7280';
        const evidenceBg = (d.evidence_level||'').includes('قوي') ? '#DCFCE7' : (d.evidence_level||'').includes('متوسط') ? '#FEF3C7' : '#F3F4F6';
        const evidenceBorder = (d.evidence_level||'').includes('قوي') ? '#BBF7D0' : (d.evidence_level||'').includes('متوسط') ? '#FDE68A' : '#E5E7EB';
        return `
        <article class="card reveal is-visible" style="display:flex; flex-direction:column; gap:10px; border-top:3px solid #0E7490; background:var(--bg-surface);" id="${escapeHtml(d.id)}" data-lang="${d.language==='العربية'?'ar':'en'}" data-mainfield="${escapeHtml(d.main_field||'')}" data-evidence="${escapeHtml(d.evidence_level||'')}">
          <div style="display:flex; align-items:start; justify-content:space-between; gap:10px;">
            <div style="width:42px;height:42px; border-radius:11px; background:${iconBg}; border:1px solid ${iconBorder}; display:grid; place-items:center; color:${iconColor}; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 12c0 3-1.5 5-4 6s-4-1-6-1-3.5 2-6 1-4-3-4-6 1.5-5 4-6 4 1 6 1 3.5-2 6-1 4 3 4 6z"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:end; align-items:center;">
              <span class="badge" style="background:#E0F2FE;color:#0E7490;border:1px solid #BAE6FD">إنجليزية</span>
              <span class="badge" style="background:${evidenceBg}; color:${evidenceColor}; border:1px solid ${evidenceBorder}; font-size:10.5px;">${escapeHtml(d.evidence_level||'')} • ${d.independent_mentions} ذكر</span>
              ${badgeVerified}
            </div>
          </div>
          <h3 style="font-size:15px; line-height:1.3;">${escapeHtml(d.channel_name)}</h3>
          <p style="font-size:12px; color:var(--text-muted);">${escapeHtml(d.main_field)} • ${escapeHtml(d.subfields.slice(0,60))}</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11.5px; color:var(--text-secondary);">
            <div style="background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px;"><strong>الفئة:</strong><br>${escapeHtml(d.target_audience)} • ${escapeHtml(d.educational_level)}</div>
            <div style="background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px;"><strong>النوع:</strong><br>${escapeHtml(d.content_type)}</div>
          </div>
          ${(()=>{ const raw=d.best_playlists_named||''; const cleaned=cleanPlaceholder(raw); const isPh=isPlaceholder(raw); const hasPre=['غير محدد','غير متحقق','لم يتم التحقق'].some(pre=> raw.startsWith(pre)); const show=!isPh || (hasPre && cleaned && cleaned!==raw && !isPlaceholder(cleaned)); const val=show ? (isPh || hasPre ? cleaned : raw) : ''; return show && val ? `<p style="font-size:11.5px; color:var(--text-secondary); background:var(--bg-muted); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px; line-height:1.6;"><strong>قوائم:</strong> ${escapeHtml(val.slice(0,140))}</p>`:''; })()}
          ${!isPlaceholder(d.best_starting_video)? `<p style="font-size:11.5px; color:var(--text-muted);">بداية: ${escapeHtml(d.best_starting_video.slice(0,80))}</p>`:''}
          <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:11px;">
            ${(()=>{ const raw=d.is_free||""; const cleaned=cleanPlaceholder(raw); const isPh=isPlaceholder(raw); const cleanedPh=isPlaceholder(cleaned); const hasPrefix = ["غير محدد","غير متحقق","لم يتم التحقق","غير متوفر"].some(pre=> raw.startsWith(pre)); const show=!isPh || (!cleanedPh && cleaned && cleaned!==raw && cleaned.length>3); const val= show ? (isPh || hasPrefix ? cleaned : raw) : ""; return show && val && !isPlaceholder(val) ? `<span class="badge badge--muted">${escapeHtml(val.slice(0,60))}</span>` : ""; })()}
            <span class="badge badge--muted">${escapeHtml(d.channel_status)}</span>
          </div>
          ${!isPlaceholder(d.strengths)? `<p style="font-size:11.5px; color:#166534; background:#DCFCE7; border:1px solid #BBF7D0; padding:6px 8px; border-radius:8px;">✓ ${escapeHtml(d.strengths.slice(0,110))}</p>`:''}
          ${!isPlaceholder(d.limitations)? `<p style="font-size:11.5px; color:#92400E; background:#FEF3C7; border:1px solid #FDE68A; padding:6px 8px; border-radius:8px;">⚠ ${escapeHtml(d.limitations.slice(0,110))}</p>`:''}
          <p style="font-size:10.5px; color:var(--text-muted);">${escapeHtml(d.notes)}</p>
          <div style="margin-top:auto; display:flex; gap:8px;">
            <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="${btnClass}" style="${btnStyle}"> ${btnLabel}</a>
            <span class="badge badge--muted" style="align-self:center; font-size:10.5px;">${escapeHtml(d.id)}</span>
          </div>
          ${cardActionsHtml('yt-'+d.id, linkUrl, d.channel_name)}
        </article>
        `;
      }).join('');
      enGrid.innerHTML = oldHtml + detailedHtml;
    }
    renderAr(); renderEn();
    window.renderYoutube = function(){ renderAr(); renderEn(); };
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', ()=>{
    const path = location.pathname;
    if(path.includes('courses.html')) renderCourses();
    else if(path.includes('scholarships.html')) renderScholarships();
    else if(path.includes('career-paths.html')) renderCareerPaths();
    else if(path.includes('career-path.html')) renderCareerDetail();
    else if(path.includes('youtube.html')) renderYoutube();
    else {
      // index page may have trends? try generic
      if($('#careerGrid')) renderCareerPaths();
      if($('#globalGrid')) renderCourses();
      if($('#egyptGrid')) renderScholarships();
    }
    // always try to render plan90 if present on any page
    renderPlan90();
    renderRefTables();
    // FAQ for any page
    if($('#faqPlatforms')) renderFAQ('faqPlatforms', data.faq);
    if($('#faqOpp')) renderFAQ('faqOpp', data.faq);
    if($('#faqCareer')) renderFAQ('faqCareer', data.faq);
  });

  // Expose
  window.renderCourses = renderCourses;
  window.renderScholarships = renderScholarships;
  window.renderCareerPaths = renderCareerPaths;
  window.renderCareerDetail = renderCareerDetail;
  window.renderYoutube = renderYoutube;

})();
