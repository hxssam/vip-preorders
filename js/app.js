/* ------------------------------------------------------------------
   ВИАЙПИ РЕСТОБАР — приём предварительных заказов
   Журнал · Новый заказ (бланк) · Меню · Печать в PDF
------------------------------------------------------------------ */
(function () {
  'use strict';

  const Store = window.VIPStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const viewEl = $('#view');

  /* =============================== иконки =============================== */
  const ICON = {
    list: '<path d="M9 5h11M9 12h11M9 19h11"/><path d="M4 5h.01M4 12h.01M4 19h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>'
  };
  const ic = (n, cls) =>
    '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || '') + '</svg>';

  /* ============================== утилиты =============================== */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  };
  const round2 = n => Math.round(n * 100) / 100;
  const fmt = n => round2(num(n)).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  const money = n => fmt(n) + ' ₽';
  const p2 = n => String(n).padStart(2, '0');
  const pad = (n, l) => String(num(n) | 0).padStart(l || 4, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  const parseISO = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const toISO = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const fmtDate = s => { const d = parseISO(s); return d ? p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear() : ''; };
  const weekday = s => { const d = parseISO(s); return d ? d.toLocaleDateString('ru-RU', { weekday: 'long' }) : ''; };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const fmtDateLong = s => { const d = parseISO(s); return d ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s*г\.?$/, '') : ''; };
  const fmtShort = s => { const d = parseISO(s); return d ? d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }) : ''; };
  const dayLabel = s => {
    if (!s) return 'Без даты';
    const t = todayISO();
    if (s === t) return 'Сегодня';
    if (s === addDays(t, 1)) return 'Завтра';
    if (s === addDays(t, -1)) return 'Вчера';
    return cap(weekday(s));
  };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const clone = o => JSON.parse(JSON.stringify(o));

  const STATUS = { new: 'Новый', confirmed: 'Подтверждён', done: 'Выполнен', cancelled: 'Отменён' };
  const stPill = s => '<span class="st st-' + (STATUS[s] ? s : 'new') + '">' + esc(STATUS[s] || STATUS.new) + '</span>';

  /* ============================ состояние ============================== */
  const S = {
    cats: [], menu: [], orders: [], meta: [],
    view: '', appShown: false, pendingRoute: false, seedChecked: false, bannerOff: false,
    draft: null, dirty: false, lastHash: '',
    f: { q: '', range: 'all', status: '', limit: 24 },
    mCat: 'all', mQ: '',
    pCat: 'all', pQ: '', pServe: '',
    deferred: false
  };

  const catsSorted = () => S.cats.slice().sort((a, b) => (num(a.sort) - num(b.sort)) || String(a.name).localeCompare(String(b.name), 'ru'));
  const catName = id => { const c = S.cats.find(x => x.id === id); return c ? c.name : 'Без категории'; };
  function menuSorted() {
    const order = {};
    catsSorted().forEach((c, i) => { order[c.id] = i; });
    const o = id => (order[id] == null ? 999 : order[id]);
    return S.menu.slice().sort((a, b) => (o(a.cat) - o(b.cat)) || (num(a.sort) - num(b.sort)) || String(a.name).localeCompare(String(b.name), 'ru'));
  }
  const nextNo = () => S.orders.reduce((m, o) => Math.max(m, num(o.no)), 0) + 1;
  const userLabel = () => (Store.state.user && Store.state.user.email) || 'local';

  /* ============================ расчёты ================================ */
  const lineSum = l => round2(num(l.qty) * num(l.price));
  const totals = lines => {
    let q = 0, s = 0;
    lines.forEach(l => { q += num(l.qty); s += lineSum(l); });
    return { qty: round2(q), sum: round2(s) };
  };
  /* «Подача» — время, к которому гость хочет получить блюдо (ЧЧ:ММ). Старые значения-цифры (1, 2…) игнорируются. */
  function normServe(v) {
    const m = /^\s*(\d{1,2})\s*[:.\-]\s*(\d{2})\s*$/.exec(String(v == null ? '' : v));
    if (!m) return '';
    const h = +m[1], mi = +m[2];
    return h > 23 || mi > 59 ? '' : String(h).padStart(2, '0') + ':' + m[2];
  }
  const serveOf = l => normServe(l && l.serve != null ? l.serve : (l ? l.course : ''));
  const serveMin = l => { const t = serveOf(l); return t ? (+t.slice(0, 2)) * 60 + (+t.slice(3)) : 99999; };
  function sortedLines(lines) {
    return lines.map((l, i) => ({ l, i })).sort((a, b) => (serveMin(a.l) - serveMin(b.l)) || (a.i - b.i)).map(x => x.l);
  }
  function normOrder(o) {
    return Object.assign({ no: 0, date: '', time: '', name: '', phone: '', table: '', guests: '', prepay: 0, notes: '', status: 'new', accepted: '', acceptedBy: '' },
      o, { lines: Array.isArray(o.lines) ? o.lines : [] });
  }

  /* ======================= БЛАНК (HTML листа A4) ======================== */
  const CONSENT = 'Даю согласие на обработку, хранение и передачу третьим лицам личных данных в целях осуществления необходимых мер безопасности и требований заведения';
  const MIN_ROWS = 20;

  const nb = s => esc(s) || '&nbsp;';

  function sheetHTML(src, opts) {
    const o = normOrder(src);
    const lines = sortedLines(o.lines).filter(l => String(l.name || '').trim());
    const tot = totals(lines);
    const prepay = num(o.prepay);

    let used = 0;
    lines.forEach(l => { used += Math.max(1, Math.ceil(String(l.name || '').length / 62)) + (l.note ? 0.45 : 0); });
    const emptyRows = Math.max(0, MIN_ROWS - Math.ceil(used));

    const rows = lines.map(l => {
      const q = num(l.qty);
      return '<tr><td class="c tm">' + esc(serveOf(l)) + '</td>' +
        '<td class="n"><div class="nm">' + esc(l.name) + '</div>' + (l.note ? '<div class="nt">' + esc(l.note) + '</div>' : '') + '</td>' +
        '<td class="c">' + esc(fmt(q)) + '</td>' +
        '<td class="p">' + esc(money(lineSum(l))) + (q !== 1 ? '<span class="pu">' + esc(fmt(q)) + ' × ' + esc(fmt(l.price)) + '</span>' : '') + '</td></tr>';
    }).join('') + '<tr><td></td><td></td><td></td><td></td></tr>'.repeat(emptyRows);

    const dateTxt = o.date ? fmtDate(o.date) + ' · ' + weekday(o.date) : '';
    const noTxt = o.no ? pad(o.no) : '';

    return '<div class="sheet' + (opts && opts.fit ? ' pf' : '') + '">' +
      '<img class="sh-wm" src="assets/logo-print.png" alt="">' +
      '<div class="sh-head"><img class="sh-logo" src="assets/logo-print.png" alt="ВИАЙПИ">' +
      '<div class="sh-title">Бланк предварительного заказа<br>рестобара «ВИАЙПИ»</div>' +
      '<div class="sh-no">' + (noTxt ? '<small>Заказ №</small><b>' + esc(noTxt) + '</b>' : '') + '</div></div>' +
      '<div class="sh-fields">' +
      '<div class="sh-row"><div class="f"><label>Дата</label><span class="v">' + nb(dateTxt) + '</span></div></div>' +
      '<div class="sh-row"><div class="f"><label>ФИО</label><span class="v">' + nb(o.name) + '</span></div></div>' +
      '<div class="sh-row"><div class="f"><label>№ телефона</label><span class="v">' + nb(o.phone) + '</span></div>' +
      '<div class="f w-stol"><label>Стол №</label><span class="v">' + nb(o.table) + '</span></div></div>' +
      '<div class="sh-row"><div class="f w-gost"><label>Кол-во гостей</label><span class="v">' + nb(o.guests) + '</span></div>' +
      '<div class="f w-time"><label>Время заказа</label><span class="v">' + nb(o.time) + '</span></div>' +
      '<div class="f"><label>Предоплата</label><span class="v">' + (prepay > 0 ? esc(money(prepay)) : '&nbsp;') + '</span></div></div>' +
      '</div>' +
      '<table class="sh-table"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup>' +
      '<thead><tr><th>Подача</th><th>Наименование</th><th>Кол-во</th><th>Цена</th></tr></thead><tbody>' + rows +
      '<tr class="tot"><td class="lbl" colspan="2">Итого</td><td class="c">' + (lines.length ? esc(fmt(tot.qty)) : '') + '</td><td class="p">' + (lines.length ? esc(money(tot.sum)) : '') + '</td></tr>' +
      '</tbody></table>' +
      '<div class="sh-notes"><label>Примечания / пожелания гостей</label><div class="v">' + esc(o.notes) + '</div></div>' +
      (prepay > 0 ? '<p class="sh-sum2">Предоплата: <b>' + esc(money(prepay)) + '</b> &nbsp;·&nbsp; К доплате: <b>' + esc(money(Math.max(0, tot.sum - prepay))) + '</b></p>' : '') +
      '<div class="sh-foot">' +
      '<div class="f"><label>Итог:</label><span class="v">' + (lines.length ? esc(money(tot.sum)) : '&nbsp;') + '</span></div>' +
      '<div class="f"><label>Дата принятия</label><span class="v">' + nb(fmtDate(o.accepted)) + '</span></div>' +
      '<div class="f"><label>Принял</label><span class="v">' + nb(o.acceptedBy) + '</span></div></div>' +
      '<p class="sh-consent">' + esc(CONSENT) + ' <span class="sig"></span></p>' +
      '</div>';
  }

  /* ============================== печать ================================ */
  /* Область печати A4 (поля 10 мм сверху/снизу и 12 мм по бокам). Высоту берём с запасом,
     чтобы бланк ВСЕГДА умещался на одном листе (в т.ч. в Safari с колонтитулами). */
  const PRINT_W_MM = 186, PRINT_H_MM = 262;
  function fitSheetToPage(root) {
    const wrap = $('.pf-wrap', root), sheet = $('.sheet', root);
    if (!wrap || !sheet) return 1;
    const MM = 96 / 25.4, W = PRINT_W_MM * MM, H = PRINT_H_MM * MM;
    root.classList.add('measuring');
    const hAt = k => { sheet.style.transform = 'none'; sheet.style.width = (W / k) + 'px'; return sheet.offsetHeight * k; };
    let s = 1;
    if (hAt(1) > H) {
      /* подбираем самый крупный масштаб, при котором бланк целиком умещается по высоте */
      let lo = 0.2, hi = 1;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (hAt(mid) <= H) lo = mid; else hi = mid; }
      s = lo;
    }
    sheet.style.width = (W / s) + 'px';
    sheet.style.transformOrigin = '0 0';
    sheet.style.transform = 'scale(' + s + ')';
    wrap.style.width = W + 'px';
    wrap.style.height = Math.min(H, Math.ceil(sheet.offsetHeight * s)) + 'px';
    root.classList.remove('measuring');
    return s;
  }
  function printOrder(o) {
    const root = $('#printRoot');
    root.innerHTML = '<div class="pf-wrap">' + sheetHTML(o, { fit: true }) + '</div>';
    const prev = document.title;
    document.title = 'Бланк №' + pad(o.no) + ' — ' + (o.name || 'гость') + ' — ' + fmtDate(o.date);
    const restore = () => { document.title = prev; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    const imgs = $$('img', root).map(im => im.complete ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; }));
    const fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => { }) : Promise.resolve();
    Promise.all(imgs.concat([fonts])).then(() => {
      fitSheetToPage(root);
      setTimeout(() => window.print(), 80);
    });
  }

  /* =========================== мелкие компоненты ======================= */
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 320); }, kind === 'err' ? 6000 : 2400);
  }
  function openModal(html, cls) {
    closeModal();
    const root = $('#modalRoot');
    root.innerHTML = '<div class="scrim"></div><div class="modal ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.classList.add('modal-open');
    $('.scrim', root).addEventListener('click', closeModal);
    return $('.modal', root);
  }
  function closeModal() {
    const root = $('#modalRoot');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
  }
  function confirmBox(o) {
    return new Promise(res => {
      const m = openModal('<h3>' + esc(o.title) + '</h3><p class="modal-text">' + esc(o.text || '') + '</p>' +
        '<div class="modal-actions"><button type="button" class="btn" data-no>Отмена</button><button type="button" class="btn ' + (o.danger ? 'danger-solid' : 'primary') + '" data-yes>' + esc(o.ok || 'Да') + '</button></div>', 'sm');
      $('[data-no]', m).onclick = () => { closeModal(); res(false); };
      $('[data-yes]', m).onclick = () => { closeModal(); res(true); };
      $('[data-yes]', m).focus();
    });
  }
  const emptyHTML = (title, text, extra) =>
    '<div class="empty">' + ic('file') + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (extra || '') + '</div>';
  const loadingHTML = () => '<section class="page"><div class="ogrid"><div class="skeleton"></div><div class="skeleton"></div></div></section>';
  const notFoundHTML = () => '<section class="page">' + emptyHTML('Заказ не найден', 'Возможно, он был удалён.', '<a class="btn primary" href="#/orders">' + ic('back') + 'К журналу</a>') + '</section>';

  /* ============================== журнал ================================ */
  function filteredOrders() {
    const q = S.f.q.trim().toLowerCase();
    const today = todayISO();
    const list = S.orders.filter(o => {
      if (S.f.status && o.status !== S.f.status) return false;
      if (S.f.range === 'today' && o.date !== today) return false;
      if (S.f.range === 'upcoming' && !(o.date >= today)) return false;
      if (S.f.range === 'past' && !(o.date < today)) return false;
      if (q) {
        const hay = [o.name, o.phone, o.table, '№' + pad(o.no), String(o.no), o.acceptedBy, o.notes,
          (o.lines || []).map(l => l.name).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    const asc = S.f.range === 'upcoming' || S.f.range === 'today';
    const key = o => (o.date || '') + ' ' + (o.time || '00:00');
    list.sort((a, b) => {
      const c = key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
      return (asc ? c : -c) || (num(b.no) - num(a.no));
    });
    return list;
  }

  function renderOrders() {
    S.view = 'orders';
    S.draft = null;
    viewEl.innerHTML =
      '<section class="page">' +
      '<div class="page-head"><div><p class="eyebrow">Журнал</p><h1>Заказы и брони</h1></div>' +
      '<a class="btn primary" href="#/new">' + ic('plus') + 'Новый заказ</a></div>' +
      '<div class="stats" id="oStats"></div>' +
      '<div class="toolbar">' +
      '<label class="search">' + ic('search') + '<input id="oSearch" type="search" placeholder="Поиск: ФИО, телефон, стол, №, блюдо…" value="' + esc(S.f.q) + '" autocomplete="off"></label>' +
      '<div class="chips" id="oRange">' + [['all', 'Все'], ['today', 'Сегодня'], ['upcoming', 'Ближайшие'], ['past', 'Прошедшие']]
        .map(r => '<button type="button" class="chip ' + (S.f.range === r[0] ? 'on' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>' +
      '<select id="oStatus" class="select" aria-label="Статус"><option value="">Все статусы</option>' +
      Object.keys(STATUS).map(k => '<option value="' + k + '"' + (S.f.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select>' +
      '</div><div id="oList"></div></section>';

    $('#oSearch').addEventListener('input', e => { S.f.q = e.target.value; S.f.limit = 24; renderOrdersBody(); });
    $('#oStatus').addEventListener('change', e => { S.f.status = e.target.value; S.f.limit = 24; renderOrdersBody(); });
    $('#oRange').addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      S.f.range = b.dataset.r; S.f.limit = 24;
      $$('#oRange .chip').forEach(c => c.classList.toggle('on', c === b));
      renderOrdersBody();
    });
    $('#oList').addEventListener('click', e => {
      if (e.target.closest('#oMore')) { S.f.limit += 24; renderOrdersBody(); return; }
      const card = e.target.closest('.ocard');
      if (!card) return;
      const id = card.dataset.id;
      const act = e.target.closest('[data-act]');
      if (act) {
        e.stopPropagation();
        const o = S.orders.find(x => x.id === id);
        if (!o) return;
        if (act.dataset.act === 'print') printOrder(o);
        else if (act.dataset.act === 'edit') location.hash = '#/edit/' + encodeURIComponent(id);
        return;
      }
      location.hash = '#/view/' + encodeURIComponent(id);
    });
    renderOrdersBody();
  }

  function renderStats() {
    const box = $('#oStats');
    if (!box) return;
    const today = todayISO();
    const act = S.orders.filter(o => o.status !== 'cancelled');
    const t = act.filter(o => o.date === today);
    const up = act.filter(o => o.date > today);
    const sum = a => a.reduce((s, o) => s + num(o.total), 0);
    box.innerHTML =
      '<div class="stat"><span>Сегодня</span><b>' + t.length + '</b><em>' + esc(money(sum(t))) + '</em></div>' +
      '<div class="stat"><span>Ближайшие</span><b>' + up.length + '</b><em>' + esc(money(sum(up))) + '</em></div>' +
      '<div class="stat"><span>Всего заказов</span><b>' + S.orders.length + '</b><em>в журнале</em></div>';
  }

  function cardHTML(o) {
    const n = normOrder(o);
    const meta = [
      n.time ? '<span>' + ic('clock') + esc(n.time) + '</span>' : '',
      n.table ? '<span>' + ic('grid') + 'Стол ' + esc(n.table) + '</span>' : '',
      n.guests ? '<span>' + ic('users') + esc(n.guests) + ' гост.</span>' : '',
      n.phone ? '<span>' + ic('phone') + esc(n.phone) + '</span>' : ''
    ].join('');
    return '<article class="ocard ' + (n.status === 'cancelled' ? 'is-cancelled' : '') + '" data-id="' + esc(o.id) + '">' +
      '<div class="thumb"><div class="thumb-scale">' + sheetHTML(n) + '</div></div>' +
      '<div class="ocard-body">' +
      '<div class="ocard-top"><span class="no">№ ' + esc(pad(n.no)) + '</span>' + stPill(n.status) + '</div>' +
      '<h3>' + esc(n.name || 'Без имени') + '</h3>' +
      '<div class="meta"><span>' + ic('calendar') + esc(fmtShort(n.date)) + '</span>' + meta + '</div>' +
      '<div class="ocard-bottom"><div><div class="sum">' + esc(money(num(o.total) || totals(n.lines).sum)) + '</div>' +
      '<span class="by">' + (n.acceptedBy ? 'Принял: ' + esc(n.acceptedBy) : '&nbsp;') + '</span></div>' +
      '<div class="ocard-actions"><button type="button" class="icon-btn" data-act="print" title="Печать / PDF" aria-label="Печать">' + ic('printer') + '</button>' +
      '<button type="button" class="icon-btn" data-act="edit" title="Изменить" aria-label="Изменить">' + ic('edit') + '</button></div></div>' +
      '</div></article>';
  }

  function renderOrdersBody() {
    renderStats();
    const box = $('#oList');
    if (!box) return;
    if (!Store.isLoaded('orders')) { box.innerHTML = '<div class="ogrid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>'; return; }
    const all = filteredOrders();
    if (!all.length) {
      box.innerHTML = S.orders.length
        ? emptyHTML('Ничего не найдено', 'Измените поиск или фильтры.')
        : emptyHTML('Заказов пока нет', 'Создайте первый бланк — он сразу появится здесь.', '<a class="btn primary" href="#/new">' + ic('plus') + 'Новый заказ</a>');
      return;
    }
    const shown = all.slice(0, S.f.limit);
    let html = '', last = null, open = false;
    shown.forEach(o => {
      if (o.date !== last) {
        if (open) html += '</div>';
        html += '<div class="dh"><span>' + esc(dayLabel(o.date)) + '</span><em>' + esc(fmtDateLong(o.date)) + '</em></div><div class="ogrid">';
        open = true; last = o.date;
      }
      html += cardHTML(o);
    });
    if (open) html += '</div>';
    if (all.length > shown.length) html += '<div class="more-wrap"><button type="button" class="btn" id="oMore">Показать ещё (' + (all.length - shown.length) + ')</button></div>';
    box.innerHTML = html;
  }

  /* ============================ просмотр бланка ========================= */
  function renderView(id) {
    S.view = 'view'; S.draft = null;
    if (!Store.isLoaded('orders')) { viewEl.innerHTML = loadingHTML(); S.pendingRoute = true; return; }
    const o = S.orders.find(x => x.id === id);
    if (!o) { viewEl.innerHTML = notFoundHTML(); return; }
    const n = normOrder(o);
    viewEl.innerHTML =
      '<section class="page' + (S.quiet ? ' quiet' : '') + '">' +
      '<div class="view-bar"><a class="btn ghost" href="#/orders">' + ic('back') + '<span>Журнал</span></a>' +
      '<div class="view-title"><h1>Заказ № ' + esc(pad(n.no)) + '</h1><span id="vSt">' + stPill(n.status) + '</span></div>' +
      '<div class="view-actions">' +
      '<select id="vStatus" class="select" aria-label="Статус заказа">' + Object.keys(STATUS).map(k => '<option value="' + k + '"' + (n.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select>' +
      '<a class="btn" href="#/edit/' + encodeURIComponent(o.id) + '">' + ic('edit') + '<span>Изменить</span></a>' +
      '<button type="button" class="btn" id="vDup">' + ic('copy') + '<span>Дублировать</span></button>' +
      '<button type="button" class="btn danger" id="vDel">' + ic('trash') + '<span>Удалить</span></button>' +
      '<button type="button" class="btn primary" id="vPrint">' + ic('printer') + '<span>Печать / PDF</span></button>' +
      '</div></div>' +
      '<div class="paper-stage"><div class="paper-fit"><div class="paper-scale">' + sheetHTML(n) + '</div></div></div>' +
      '<p class="hint">Для PDF нажмите <b>«Печать / PDF»</b> и в окне печати выберите принтер <b>«Сохранить как PDF»</b>.</p>' +
      '<p class="audit">Создал: ' + esc(n.createdBy || '—') + (n.createdAt ? ' · ' + esc(new Date(n.createdAt).toLocaleString('ru-RU')) : '') +
      (n.updatedAt && n.updatedAt !== n.createdAt ? ' · изменён ' + esc(new Date(n.updatedAt).toLocaleString('ru-RU')) : '') + '</p>' +
      '</section>';

    $('#vPrint').onclick = () => printOrder(o);
    $('#vStatus').onchange = e => {
      Store.save('orders', o.id, Object.assign({}, o, { status: e.target.value, updatedAt: Date.now() }));
      toast('Статус: ' + STATUS[e.target.value], 'ok');
    };
    $('#vDup').onclick = () => duplicateOrder(o);
    $('#vDel').onclick = async () => {
      const ok = await confirmBox({ title: 'Удалить заказ?', text: 'Заказ № ' + pad(n.no) + ' (' + (n.name || 'без имени') + ') будет удалён без возможности восстановления.', ok: 'Удалить', danger: true });
      if (!ok) return;
      Store.remove('orders', o.id);
      toast('Заказ удалён', 'ok');
      location.hash = '#/orders';
    };
    fitPapers();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPapers).catch(() => { });
  }

  function fitPapers() {
    $$('.paper-fit').forEach(f => {
      const sc = f.firstElementChild, sheet = sc && sc.firstElementChild;
      if (!sheet) return;
      sc.style.transform = 'none';
      const w = sheet.offsetWidth, h = sheet.offsetHeight;
      const avail = Math.max(240, f.parentElement.clientWidth - 24);
      const s = Math.min(1, avail / w);
      sc.style.transform = 'scale(' + s + ')';
      f.style.width = Math.round(w * s) + 'px';
      f.style.height = Math.round(h * s) + 'px';
    });
  }

  function duplicateOrder(o) {
    const d = Object.assign(newDraft(), {
      name: o.name || '', phone: o.phone || '', table: o.table || '', guests: String(o.guests || ''),
      notes: o.notes || '', date: o.date || todayISO(), time: o.time || '',
      lines: (o.lines || []).map(l => Object.assign({}, l, { id: uid() }))
    });
    lsSet('vip.draft', JSON.stringify(d));
    location.hash = '#/new';
    toast('Создана копия — проверьте данные и сохраните', 'ok');
  }

  /* ============================== редактор ============================== */
  function newDraft() {
    return { id: '', no: nextNo(), date: todayISO(), time: '', name: '', phone: '', table: '', guests: '', prepay: '', lines: [], notes: '', status: 'new', accepted: todayISO(), acceptedBy: lsGet('vip.staff') || '', createdAt: 0, createdBy: '' };
  }
  function draftFromOrder(o) {
    const n = normOrder(o);
    return Object.assign({}, n, {
      id: o.id, guests: String(n.guests == null ? '' : n.guests), prepay: num(n.prepay) ? String(num(n.prepay)) : '',
      lines: n.lines.map(l => ({ id: l.id || uid(), serve: serveOf(l), name: l.name || '', qty: num(l.qty) || 1, price: num(l.price), note: l.note || '', mid: l.mid || '' }))
    });
  }
  function loadDraft() {
    try {
      const d = JSON.parse(lsGet('vip.draft') || 'null');
      if (d && typeof d === 'object' && Array.isArray(d.lines)) return Object.assign(newDraft(), d, { id: '', lines: d.lines.map(l => Object.assign({}, l, { serve: serveOf(l) })) });
    } catch (e) { /* ignore */ }
    return null;
  }
  let draftTimer = null;
  function markDirty() {
    S.dirty = true;
    if (S.draft && !S.draft.id) {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => { if (S.draft && !S.draft.id) lsSet('vip.draft', JSON.stringify(S.draft)); }, 350);
    }
  }
  function staffNames() {
    const set = {};
    S.orders.forEach(o => { if (o.acceptedBy) set[o.acceptedBy] = 1; });
    const mine = lsGet('vip.staff'); if (mine) set[mine] = 1;
    return Object.keys(set);
  }

  function editorHTML(d, isNew) {
    return '<section class="page editor"><div class="ed-grid"><div class="ed-main">' +
      '<div class="page-head tight"><div><p class="eyebrow">' + (isNew ? 'Новый заказ' : 'Редактирование') + '</p>' +
      '<h1>Бланк заказа <span class="no-chip">№ ' + esc(pad(d.no)) + '</span></h1></div>' +
      (isNew ? '<button type="button" class="btn ghost sm" id="clearDraft">Очистить форму</button>' : '') + '</div>' +
      '<form id="edForm" autocomplete="off" novalidate>' +

      '<div class="card"><div class="card-h"><h2>Гость</h2></div><div class="grid g-2">' +
      '<label class="fld span-2"><span>ФИО<i>*</i></span><input data-d="name" type="text" value="' + esc(d.name) + '" placeholder="Фамилия Имя Отчество" autocapitalize="words"></label>' +
      '<label class="fld"><span>№ телефона</span><input data-d="phone" type="tel" inputmode="tel" value="' + esc(d.phone) + '" placeholder="+7 (___) ___-__-__"></label>' +
      '<label class="fld"><span>Стол №</span><input data-d="table" type="text" value="' + esc(d.table) + '" placeholder="например, 5 или VIP"></label>' +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h2>Бронь</h2></div><div class="grid g-4">' +
      '<label class="fld"><span>Дата<i>*</i></span><input data-d="date" type="date" value="' + esc(d.date) + '"></label>' +
      '<label class="fld"><span>Время заказа</span><input data-d="time" type="time" value="' + esc(d.time) + '"></label>' +
      '<label class="fld"><span>Кол-во гостей</span><input data-d="guests" type="number" inputmode="numeric" min="0" step="1" value="' + esc(d.guests) + '" placeholder="0"></label>' +
      '<label class="fld"><span>Предоплата</span><div class="with-unit"><input data-d="prepay" type="number" inputmode="decimal" min="0" step="1" value="' + esc(d.prepay) + '" placeholder="0"><em>₽</em></div></label>' +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h2>Позиции заказа</h2><div class="head-actions">' +
      '<button type="button" class="btn sm" id="addCustom">' + ic('plus') + 'Своя позиция</button>' +
      '<button type="button" class="btn sm primary only-drawer" data-open-picker>' + ic('book') + 'Из меню</button></div></div>' +
      '<div id="lines"></div>' +
      '<div class="lines-total"><span class="cnt" id="tCnt"></span><span class="big" id="tSum"></span></div>' +
      '<div class="pay-sum" id="paySum"></div></div>' +

      '<div class="card"><div class="card-h"><h2>Примечания</h2></div>' +
      '<label class="fld"><span>Пожелания гостей, особые условия</span><textarea data-d="notes" rows="3" placeholder="Например: торт к 20:00, без острого, детский стул…">' + esc(d.notes) + '</textarea></label></div>' +

      '<div class="card"><div class="card-h"><h2>Приём заказа</h2></div><div class="grid g-3">' +
      '<label class="fld"><span>Принял</span><input data-d="acceptedBy" type="text" list="staffList" value="' + esc(d.acceptedBy) + '" placeholder="Имя сотрудника"><datalist id="staffList">' + staffNames().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></label>' +
      '<label class="fld"><span>Дата принятия</span><input data-d="accepted" type="date" value="' + esc(d.accepted) + '"></label>' +
      '<label class="fld"><span>Статус</span><select data-d="status">' + Object.keys(STATUS).map(k => '<option value="' + k + '"' + (d.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select></label>' +
      '</div></div>' +
      '</form>' +

      '<div class="ed-bar"><div class="bar-sum"><small>Итого</small><b id="barSum"></b></div><div class="bar-btns">' +
      '<button type="button" class="btn sm only-drawer" data-open-picker>' + ic('book') + 'Меню</button>' +
      '<a class="btn bar-cancel" href="#/orders">Отмена</a>' +
      '<button type="button" class="btn" id="saveBtn" aria-label="Сохранить">' + ic('check') + '<span class="lbl">Сохранить</span></button>' +
      '<button type="button" class="btn primary" id="savePrintBtn">' + ic('printer') + '<span class="lbl-long">Сохранить и печать</span><span class="lbl-short">Печать</span></button></div></div>' +
      '</div>' +

      '<aside class="picker" id="picker" aria-label="Меню ресторана">' +
      '<div class="picker-h"><h2>Меню</h2><button type="button" class="icon-btn only-drawer" id="closePicker" aria-label="Закрыть">' + ic('x') + '</button></div>' +
      '<label class="search">' + ic('search') + '<input id="pQ" type="search" placeholder="Найти блюдо…" autocomplete="off"></label>' +
      '<div class="serve-pick"><label for="pServe">Время подачи<br>новых позиций</label>' +
      '<input id="pServe" type="time" value="' + esc(S.pServe) + '" aria-label="Время подачи для новых позиций">' +
      '<button type="button" class="icon-btn" id="pServeClr" aria-label="Сбросить время подачи" title="Без времени">' + ic('x') + '</button></div>' +
      '<div class="chips scroll" id="pCats"></div>' +
      '<div class="pitems" id="pItems"></div></aside>' +
      '</div></section><div class="picker-scrim" id="pScrim" hidden></div>';
  }

  function renderEditor(id) {
    S.view = 'editor';
    const isNew = !id;
    let d;
    if (id) {
      if (!Store.isLoaded('orders')) { viewEl.innerHTML = loadingHTML(); S.pendingRoute = true; S.draft = null; return; }
      const o = S.orders.find(x => x.id === id);
      if (!o) { viewEl.innerHTML = notFoundHTML(); S.draft = null; return; }
      d = draftFromOrder(o);
    } else {
      d = loadDraft() || newDraft();
    }
    S.draft = d; S.dirty = false; S.pCat = 'all'; S.pQ = '';
    viewEl.innerHTML = editorHTML(d, isNew);
    bindEditor();
    renderLines();
    renderPickerChips();
    renderPickerItems();
    updateTotals();
  }

  function lineHTML(l, i, flash) {
    return '<div class="line' + (flash ? ' flash' : '') + '" data-i="' + i + '">' +
      '<label class="ln-c"><span>Подача</span><input data-f="serve" type="time" value="' + esc(serveOf(l)) + '" aria-label="Время подачи"></label>' +
      '<label class="ln-n"><span>Наименование</span><input data-f="name" type="text" value="' + esc(l.name) + '" placeholder="Название блюда"></label>' +
      '<div class="ln-q"><span>Кол-во</span><div class="stepper"><button type="button" data-step="-1" aria-label="Меньше">−</button>' +
      '<input data-f="qty" type="number" inputmode="decimal" min="0" step="1" value="' + esc(l.qty) + '" aria-label="Количество"><button type="button" data-step="1" aria-label="Больше">+</button></div></div>' +
      '<label class="ln-p"><span>Цена, ₽</span><input data-f="price" type="number" inputmode="decimal" min="0" step="1" value="' + esc(l.price) + '"></label>' +
      '<div class="ln-s"><span>Сумма</span><b data-sum>' + esc(money(lineSum(l))) + '</b></div>' +
      '<button type="button" class="icon-btn danger ln-x" data-del aria-label="Удалить позицию">' + ic('trash') + '</button>' +
      '<input class="ln-note" data-f="note" type="text" value="' + esc(l.note || '') + '" placeholder="Комментарий к позиции (например: отварные, без лука)">' +
      '</div>';
  }
  function renderLines(flashId) {
    const box = $('#lines');
    if (!box || !S.draft) return;
    const d = S.draft;
    if (!d.lines.length) {
      box.innerHTML = '<div class="lines-empty">' + ic('utensils') + '<div>Пока нет позиций.<br>Выберите блюда из меню — они появятся здесь.</div></div>';
      return;
    }
    box.innerHTML = d.lines.map((l, i) => lineHTML(l, i, l.id === flashId)).join('');
  }
  function sortLines() {
    S.draft.lines = sortedLines(S.draft.lines);
  }
  function updateTotals() {
    const d = S.draft;
    if (!d) return;
    const t = totals(d.lines);
    const pre = num(d.prepay);
    const set = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
    set('#tSum', money(t.sum));
    set('#barSum', money(t.sum));
    set('#tCnt', 'Позиций: ' + d.lines.filter(l => String(l.name).trim()).length + ' · порций: ' + fmt(t.qty));
    const pay = $('#paySum');
    if (pay) pay.innerHTML = pre > 0 ? '<span>Предоплата: <b>' + esc(money(pre)) + '</b></span><span>К доплате: <b>' + esc(money(Math.max(0, t.sum - pre))) + '</b></span>' : '';
  }
  function refreshLineSum(row, l) {
    const el = row && $('[data-sum]', row);
    if (el) el.textContent = money(lineSum(l));
  }
  const lineIndex = el => { const row = el.closest('.line'); return row ? +row.dataset.i : -1; };
  const lineCounts = () => {
    const c = {};
    if (S.draft) S.draft.lines.forEach(l => { if (l.mid) c[l.mid] = (c[l.mid] || 0) + num(l.qty); });
    return c;
  };

  function bindEditor() {
    const form = $('#edForm');
    form.addEventListener('submit', e => e.preventDefault());
    const onField = e => {
      const t = e.target, k = t.dataset && t.dataset.d;
      if (!k) return;
      S.draft[k] = t.value;
      t.classList.remove('err');
      markDirty();
      if (k === 'prepay') updateTotals();
    };
    form.addEventListener('input', onField);
    form.addEventListener('change', onField);

    const lines = $('#lines');
    lines.addEventListener('input', e => {
      const t = e.target, f = t.dataset.f;
      if (!f) return;
      const idx = lineIndex(t);
      if (idx < 0) return;
      const L = S.draft.lines[idx];
      if (f === 'serve') { L.serve = normServe(t.value); markDirty(); return; }
      L[f] = t.value;
      markDirty();
      if (f === 'qty' || f === 'price') { refreshLineSum(t.closest('.line'), L); updateTotals(); if (f === 'qty') renderPickerItems(); }
    });
    lines.addEventListener('change', e => {
      const t = e.target, f = t.dataset.f;
      if (!f) return;
      const idx = lineIndex(t);
      if (idx < 0) return;
      const L = S.draft.lines[idx];
      if (f === 'serve') {
        L.serve = normServe(t.value); markDirty();
      } else if (f === 'qty' && !(num(t.value) > 0)) {
        L.qty = 1; t.value = '1'; refreshLineSum(t.closest('.line'), L); updateTotals(); renderPickerItems();
      }
    });
    /* после ввода времени строки аккуратно пересортировываются (когда фокус ушёл из списка) */
    lines.addEventListener('focusout', e => {
      if (!e.target.dataset || e.target.dataset.f !== 'serve') return;
      setTimeout(() => {
        if (!S.draft || S.view !== 'editor') return;
        const a = document.activeElement;
        if (a && a.closest && a.closest('#lines') && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
        const before = S.draft.lines.map(l => l.id).join();
        sortLines();
        if (S.draft.lines.map(l => l.id).join() !== before) renderLines();
      }, 380);
    });
    lines.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const idx = lineIndex(b);
      if (idx < 0) return;
      const L = S.draft.lines[idx];
      if (b.hasAttribute('data-del')) {
        S.draft.lines.splice(idx, 1);
        renderLines(); updateTotals(); renderPickerItems(); markDirty();
      } else if (b.dataset.step) {
        L.qty = Math.max(1, round2(num(L.qty) + num(b.dataset.step)));
        const row = b.closest('.line');
        $('[data-f="qty"]', row).value = L.qty;
        refreshLineSum(row, L); updateTotals(); renderPickerItems(); markDirty();
      }
    });

    $('#addCustom').onclick = () => {
      const L = { id: uid(), serve: S.pServe, name: '', qty: 1, price: '', note: '', mid: '' };
      S.draft.lines.push(L);
      renderLines(L.id); updateTotals(); markDirty();
      const inp = $('.line[data-i="' + (S.draft.lines.length - 1) + '"] [data-f="name"]');
      if (inp) { inp.focus(); inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    };
    const cd = $('#clearDraft');
    if (cd) cd.onclick = async () => {
      const ok = await confirmBox({ title: 'Очистить форму?', text: 'Все введённые данные нового заказа будут удалены.', ok: 'Очистить', danger: true });
      if (!ok) return;
      lsDel('vip.draft'); S.dirty = false; renderEditor('');
    };
    $('#saveBtn').onclick = () => saveOrder(false);
    $('#savePrintBtn').onclick = () => saveOrder(true);

    /* меню справа */
    $$('[data-open-picker]').forEach(b => { b.onclick = openPicker; });
    $('#closePicker').onclick = closePicker;
    $('#pScrim').onclick = closePicker;
    $('#pQ').addEventListener('input', e => { S.pQ = e.target.value; renderPickerItems(); });
    $('#pServe').addEventListener('input', e => { S.pServe = normServe(e.target.value); });
    $('#pServeClr').onclick = () => { S.pServe = ''; $('#pServe').value = ''; };
    $('#pCats').addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      S.pCat = b.dataset.c;
      renderPickerChips(); renderPickerItems();
    });
    $('#pItems').addEventListener('click', e => {
      const b = e.target.closest('.pitem');
      if (b) addMenuItem(b.dataset.id);
    });
  }

  function openPicker() { const p = $('#picker'); if (p) p.classList.add('open'); const s = $('#pScrim'); if (s) s.hidden = false; }
  function closePicker() { const p = $('#picker'); if (p) p.classList.remove('open'); const s = $('#pScrim'); if (s) s.hidden = true; }

  function renderPickerChips() {
    const box = $('#pCats');
    if (!box) return;
    const cats = catsSorted();
    if (S.pCat !== 'all' && !cats.some(c => c.id === S.pCat)) S.pCat = 'all';
    box.innerHTML = '<button type="button" class="chip ' + (S.pCat === 'all' ? 'on' : '') + '" data-c="all">Все</button>' +
      cats.map(c => '<button type="button" class="chip ' + (S.pCat === c.id ? 'on' : '') + '" data-c="' + esc(c.id) + '">' + esc(c.name) + '</button>').join('');
  }
  function renderPickerItems() {
    const box = $('#pItems');
    if (!box) return;
    const keep = box.scrollTop;
    const q = S.pQ.trim().toLowerCase();
    let items = menuSorted();
    if (S.pCat !== 'all') items = items.filter(i => i.cat === S.pCat);
    if (q) items = items.filter(i => (i.name + ' ' + (i.desc || '')).toLowerCase().indexOf(q) >= 0);
    if (!items.length) {
      box.innerHTML = '<div class="pi-empty">' + (S.menu.length ? 'Ничего не найдено' : 'Меню пока пустое — добавьте блюда в разделе «Меню».') + '</div>';
      return;
    }
    const counts = lineCounts();
    let html = '', last = null;
    items.forEach(i => {
      if (S.pCat === 'all' && i.cat !== last) { html += '<div class="pgroup">' + esc(catName(i.cat)) + '</div>'; last = i.cat; }
      const off = i.active === false;
      html += '<button type="button" class="pitem' + (off ? ' off' : '') + '" data-id="' + esc(i.id) + '"><span class="pi-main"><b>' + esc(i.name) + '</b><small>' + esc(i.weight || '') + (off ? ' <span class="pi-stop">· стоп</span>' : '') + '</small></span>' +
        '<span class="pi-price">' + esc(money(i.price)) + '</span><span class="pi-add">' + ic('plus') + '</span>' +
        (counts[i.id] ? '<i class="pi-badge">×' + esc(fmt(counts[i.id])) + '</i>' : '') + '</button>';
    });
    box.innerHTML = html;
    box.scrollTop = keep;
  }

  function addMenuItem(mid) {
    const it = S.menu.find(m => m.id === mid);
    if (!it || !S.draft) return;
    const serve = S.pServe;
    const ex = S.draft.lines.find(l => l.mid === mid && serveOf(l) === serve && !String(l.note || '').trim());
    let L;
    if (ex) { ex.qty = round2(num(ex.qty) + 1); L = ex; }
    else {
      L = { id: uid(), serve: serve, name: it.name, qty: 1, price: num(it.price), note: '', mid: mid };
      S.draft.lines.push(L);
      sortLines();
    }
    markDirty();
    renderLines(L.id); updateTotals(); renderPickerItems();
    const row = $$('.line').find((r, i) => S.draft.lines[i] && S.draft.lines[i].id === L.id);
    if (row && window.matchMedia('(min-width: 1100px)').matches) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function saveOrder(doPrint) {
    const d = S.draft;
    if (!d) return;
    const errs = [];
    if (!String(d.name).trim()) errs.push(['name', 'Укажите ФИО гостя']);
    if (!d.date) errs.push(['date', 'Укажите дату']);
    if (errs.length) {
      toast(errs[0][1], 'err');
      const el = $('[data-d="' + errs[0][0] + '"]');
      if (el) { el.classList.add('err'); el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    const isNew = !d.id;
    const id = d.id || Store.newId();
    const lines = d.lines.filter(l => String(l.name).trim()).map(l => ({
      id: l.id || uid(), serve: serveOf(l), name: String(l.name).trim(),
      qty: num(l.qty) > 0 ? num(l.qty) : 1, price: Math.max(0, num(l.price)), note: String(l.note || '').trim(), mid: l.mid || ''
    }));
    const rec = {
      no: isNew ? nextNo() : (d.no || nextNo()),
      date: d.date, time: d.time || '', name: String(d.name).trim(), phone: String(d.phone || '').trim(),
      table: String(d.table || '').trim(), guests: String(d.guests || '').trim(), prepay: Math.max(0, num(d.prepay)),
      lines: lines, notes: String(d.notes || '').trim(), status: d.status || 'new',
      accepted: d.accepted || todayISO(), acceptedBy: String(d.acceptedBy || '').trim(),
      total: totals(lines).sum, createdAt: d.createdAt || Date.now(), createdBy: d.createdBy || userLabel(), updatedAt: Date.now()
    };
    if (rec.acceptedBy) lsSet('vip.staff', rec.acceptedBy);
    Store.save('orders', id, rec);
    S.dirty = false;
    lsDel('vip.draft');
    S.draft = null;
    toast('Заказ сохранён', 'ok');
    location.hash = '#/view/' + encodeURIComponent(id);
    if (doPrint) setTimeout(() => printOrder(Object.assign({ id: id }, rec)), 400);
  }

  /* ============================== меню ================================== */
  function renderMenu() {
    S.view = 'menu'; S.draft = null;
    viewEl.innerHTML =
      '<section class="page"><div class="page-head"><div><p class="eyebrow">Управление</p><h1>Меню</h1></div>' +
      '<div class="head-actions"><button type="button" class="btn" id="addCat">' + ic('plus') + 'Категория</button>' +
      '<button type="button" class="btn primary" id="addItem">' + ic('plus') + 'Позиция</button></div></div>' +
      '<div class="menu-layout"><aside class="cats" id="mCats"></aside><div class="menu-main">' +
      '<div class="toolbar"><label class="search">' + ic('search') + '<input id="mSearch" type="search" placeholder="Поиск по меню…" value="' + esc(S.mQ) + '" autocomplete="off"></label></div>' +
      '<div id="mList"></div></div></div></section>';

    $('#addItem').onclick = () => itemModal(null);
    $('#addCat').onclick = () => catModal(null);
    $('#mSearch').addEventListener('input', e => { S.mQ = e.target.value; renderMList(); });

    const cats = $('#mCats');
    const pick = el => {
      const b = el.closest('[data-c]');
      if (!b) return;
      const edit = el.closest('[data-cat-edit]');
      if (edit) { const c = S.cats.find(x => x.id === edit.dataset.catEdit); if (c) catModal(c); return; }
      S.mCat = b.dataset.c; renderMenuBody();
    };
    cats.addEventListener('click', e => pick(e.target));
    cats.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.cat-btn')) { e.preventDefault(); pick(e.target); } });

    const list = $('#mList');
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'seed') { doSeed(); return; }
      if (b.dataset.act === 'add-here') { itemModal(null); return; }
      const row = b.closest('.mrow');
      const it = row && S.menu.find(x => x.id === row.dataset.id);
      if (!it) return;
      if (b.dataset.act === 'toggle') {
        Store.save('menu', it.id, Object.assign({}, it, { active: it.active === false, updatedAt: Date.now() }));
        toast(it.active === false ? 'В продаже: ' + it.name : 'Стоп-лист: ' + it.name, 'ok');
      } else if (b.dataset.act === 'edit') itemModal(it);
      else if (b.dataset.act === 'del') delItem(it);
    });
    list.addEventListener('change', e => {
      if (!e.target.classList.contains('in-price')) return;
      const row = e.target.closest('.mrow');
      const it = row && S.menu.find(x => x.id === row.dataset.id);
      if (!it) return;
      const v = Math.max(0, num(e.target.value));
      e.target.value = v;
      Store.save('menu', it.id, Object.assign({}, it, { price: v, updatedAt: Date.now() }));
      toast('Цена обновлена: ' + it.name + ' — ' + fmt(v) + ' ₽', 'ok');
    });
    renderMenuBody();
  }
  function renderMenuBody() { renderCats(); renderMList(); }

  function renderCats() {
    const box = $('#mCats');
    if (!box) return;
    const cats = catsSorted();
    if (S.mCat !== 'all' && !cats.some(c => c.id === S.mCat)) S.mCat = 'all';
    const cnt = id => S.menu.filter(i => i.cat === id).length;
    box.innerHTML = '<div class="cat-btn ' + (S.mCat === 'all' ? 'on' : '') + '" data-c="all" role="button" tabindex="0"><span class="nm">Все позиции</span><span class="cn">' + S.menu.length + '</span></div>' +
      cats.map(c => '<div class="cat-btn ' + (S.mCat === c.id ? 'on' : '') + '" data-c="' + esc(c.id) + '" role="button" tabindex="0"><span class="nm">' + esc(c.name) + '</span><span class="cn">' + cnt(c.id) + '</span>' +
        '<button type="button" class="icon-btn" data-cat-edit="' + esc(c.id) + '" aria-label="Изменить категорию">' + ic('edit') + '</button></div>').join('');
  }

  function rowHTML(i) {
    const off = i.active === false;
    return '<div class="mrow' + (off ? ' off' : '') + '" data-id="' + esc(i.id) + '">' +
      '<div class="mr-name"><b>' + esc(i.name) + '</b>' + (i.desc ? '<small>' + esc(i.desc) + '</small>' : '') + '</div>' +
      '<div class="mr-w">' + esc(i.weight || '') + '</div>' +
      '<label class="mr-price"><input class="in-price" type="number" inputmode="decimal" min="0" step="1" value="' + esc(i.price) + '" aria-label="Цена"><em>₽</em></label>' +
      '<button type="button" class="switch" data-act="toggle" aria-pressed="' + (off ? 'false' : 'true') + '" title="' + (off ? 'В стоп-листе' : 'В продаже') + '"><span></span></button>' +
      '<button type="button" class="icon-btn m-edit" data-act="edit" aria-label="Изменить">' + ic('edit') + '</button>' +
      '<button type="button" class="icon-btn danger m-del" data-act="del" aria-label="Удалить">' + ic('trash') + '</button>' +
      '<div class="m-actions"><button type="button" class="btn sm" data-act="edit">Изменить</button><button type="button" class="btn sm danger" data-act="del">Удалить</button></div>' +
      '</div>';
  }
  function renderMList() {
    const box = $('#mList');
    if (!box) return;
    if (!Store.isLoaded('menu') || !Store.isLoaded('categories')) { box.innerHTML = '<div class="skeleton"></div>'; return; }
    if (!S.cats.length && !S.menu.length) {
      box.innerHTML = emptyHTML('Меню пустое', 'Загрузите готовое меню ВИАЙПИ или добавьте категории и блюда вручную.',
        '<button type="button" class="btn primary" data-act="seed">' + ic('download') + 'Загрузить меню ВИАЙПИ</button>');
      return;
    }
    const q = S.mQ.trim().toLowerCase();
    let items = menuSorted();
    if (S.mCat !== 'all') items = items.filter(i => i.cat === S.mCat);
    if (q) items = items.filter(i => (i.name + ' ' + (i.desc || '') + ' ' + (i.weight || '')).toLowerCase().indexOf(q) >= 0);
    if (!items.length) {
      box.innerHTML = emptyHTML(q ? 'Ничего не найдено' : 'В этой категории пока пусто', q ? 'Попробуйте другой запрос.' : 'Добавьте первое блюдо.',
        q ? '' : '<button type="button" class="btn primary" data-act="add-here">' + ic('plus') + 'Добавить позицию</button>');
      return;
    }
    if (S.mCat !== 'all') { box.innerHTML = '<div class="mlist">' + items.map(rowHTML).join('') + '</div>'; return; }
    let html = '', last = null, open = false;
    items.forEach(i => {
      if (i.cat !== last) {
        if (open) html += '</div></div>';
        html += '<div class="mgroup"><h2>' + esc(catName(i.cat)) + '</h2><div class="mlist">';
        open = true; last = i.cat;
      }
      html += rowHTML(i);
    });
    if (open) html += '</div></div>';
    box.innerHTML = html;
  }

  function itemModal(item) {
    const cats = catsSorted();
    if (!cats.length) { toast('Сначала создайте категорию', 'err'); catModal(null); return; }
    const it = item || { name: '', cat: (S.mCat !== 'all' && cats.some(c => c.id === S.mCat)) ? S.mCat : cats[0].id, price: '', weight: '', desc: '', active: true };
    const m = openModal('<h3>' + (item ? 'Изменить позицию' : 'Новая позиция') + '</h3>' +
      '<form id="itemForm" novalidate><div class="grid g-2">' +
      '<label class="fld span-2"><span>Название<i>*</i></span><input name="name" type="text" value="' + esc(it.name) + '" autocomplete="off"></label>' +
      '<label class="fld"><span>Категория</span><select name="cat">' + cats.map(c => '<option value="' + esc(c.id) + '"' + (c.id === it.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>' +
      '<label class="fld"><span>Цена, ₽<i>*</i></span><input name="price" type="number" inputmode="decimal" min="0" step="1" value="' + esc(it.price) + '"></label>' +
      '<label class="fld span-2"><span>Вес / выход</span><input name="weight" type="text" value="' + esc(it.weight || '') + '" placeholder="например, 255 гр" autocomplete="off"></label>' +
      '<label class="fld span-2"><span>Описание / состав</span><textarea name="desc" rows="3">' + esc(it.desc || '') + '</textarea></label>' +
      '</div><div class="check"><button type="button" class="switch" id="itActive" aria-pressed="' + (it.active !== false) + '"><span></span></button><span>В продаже <small style="color:var(--muted)">(выключите — стоп-лист)</small></span></div>' +
      '<div class="modal-actions">' + (item ? '<button type="button" class="btn danger left" id="itDel">Удалить</button>' : '') +
      '<button type="button" class="btn" id="itCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></form>', '');
    const f = $('#itemForm', m);
    const g = n => f.elements[n].value;
    $('#itActive', m).onclick = e => { const b = e.currentTarget; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); };
    $('#itCancel', m).onclick = closeModal;
    if (item) $('#itDel', m).onclick = () => { closeModal(); delItem(item); };
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = g('name').trim();
      if (!name) { f.elements.name.classList.add('err'); f.elements.name.focus(); return; }
      if (g('price').trim() === '') { f.elements.price.classList.add('err'); f.elements.price.focus(); return; }
      const maxSort = S.menu.reduce((mx, x) => Math.max(mx, num(x.sort)), 0);
      const rec = {
        name: name, cat: g('cat'), price: Math.max(0, num(g('price'))), weight: g('weight').trim(), desc: g('desc').trim(),
        active: $('#itActive', m).getAttribute('aria-pressed') === 'true',
        sort: item ? num(item.sort) : maxSort + 1, updatedAt: Date.now()
      };
      if (item && item.cat !== rec.cat) rec.sort = maxSort + 1;
      Store.save('menu', item ? item.id : Store.newId(), rec);
      closeModal();
      toast(item ? 'Позиция обновлена' : 'Позиция добавлена', 'ok');
    });
    setTimeout(() => f.elements.name.focus(), 50);
  }

  async function delItem(it) {
    const ok = await confirmBox({ title: 'Удалить позицию?', text: '«' + it.name + '» будет удалена из меню. Старые заказы не изменятся.', ok: 'Удалить', danger: true });
    if (!ok) return;
    Store.remove('menu', it.id);
    toast('Позиция удалена', 'ok');
  }

  function catModal(cat) {
    const m = openModal('<h3>' + (cat ? 'Изменить категорию' : 'Новая категория') + '</h3>' +
      '<form id="catForm" novalidate><label class="fld"><span>Название<i>*</i></span><input name="name" type="text" value="' + esc(cat ? cat.name : '') + '" autocomplete="off" placeholder="например, Напитки"></label>' +
      '<div class="modal-actions">' + (cat ? '<button type="button" class="btn danger left" id="cDel">Удалить</button>' : '') +
      '<button type="button" class="btn" id="cCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></form>', 'sm');
    const f = $('#catForm', m);
    $('#cCancel', m).onclick = closeModal;
    if (cat) $('#cDel', m).onclick = async () => {
      closeModal();
      const items = S.menu.filter(i => i.cat === cat.id);
      const ok = await confirmBox({
        title: 'Удалить категорию?',
        text: items.length ? 'Категория «' + cat.name + '» и все её позиции (' + items.length + ') будут удалены.' : 'Категория «' + cat.name + '» будет удалена.',
        ok: 'Удалить', danger: true
      });
      if (!ok) return;
      Store.batch(items.map(i => ({ col: 'menu', id: i.id, del: true })).concat([{ col: 'categories', id: cat.id, del: true }]));
      if (S.mCat === cat.id) S.mCat = 'all';
      toast('Категория удалена', 'ok');
    };
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = f.elements.name.value.trim();
      if (!name) { f.elements.name.classList.add('err'); f.elements.name.focus(); return; }
      if (cat) Store.save('categories', cat.id, Object.assign({}, cat, { name: name }));
      else {
        const id = Store.newId();
        Store.save('categories', id, { name: name, sort: S.cats.reduce((mx, c) => Math.max(mx, num(c.sort)), 0) + 1 });
        S.mCat = id;
      }
      closeModal();
      toast(cat ? 'Категория обновлена' : 'Категория добавлена', 'ok');
    });
    setTimeout(() => f.elements.name.focus(), 50);
  }

  /* ======================= загрузка исходного меню ====================== */
  function doSeed() {
    const seed = window.VIP_SEED;
    if (!seed) return Promise.resolve();
    const now = Date.now(), ops = [];
    seed.categories.forEach((c, i) => ops.push({ col: 'categories', id: c.id, data: { name: c.name, sort: i + 1 } }));
    seed.items.forEach((r, i) => ops.push({
      col: 'menu', id: 's' + String(i + 1).padStart(3, '0'),
      data: { name: r[1], cat: r[0], price: r[2], weight: r[3], desc: r[4] || '', active: true, sort: i + 1, updatedAt: now }
    }));
    ops.push({ col: 'meta', id: 'seed', data: { done: true, at: now } });
    toast('Меню ВИАЙПИ загружено', 'ok');
    return Store.batch(ops);
  }
  function maybeSeed() {
    if (S.seedChecked) return;
    if (!Store.isLoaded('categories') || !Store.isLoaded('menu') || !Store.isLoaded('meta')) return;
    if (!Store.isSynced()) return;
    S.seedChecked = true;
    const done = Store.get('meta').some(m => m.id === 'seed' && m.done);
    if (done) return;
    if (S.cats.length || S.menu.length) { Store.save('meta', 'seed', { done: true, at: Date.now() }); return; }
    doSeed();
  }

  /* ======================== шапка, вход, состояние ====================== */
  const NAV = [['orders', 'list', 'Журнал'], ['new', 'plus', 'Новый заказ'], ['menu', 'book', 'Меню']];
  function setupChrome() {
    $$('[data-nav]').forEach(a => {
      const n = NAV.find(x => x[0] === a.dataset.nav);
      a.innerHTML = ic(n[1]) + '<span>' + n[2] + '</span>';
    });
    $('#userBtn').innerHTML = ic('user');
    $('#userBtn').onclick = e => { e.stopPropagation(); togglePopover(); };
    $('#syncPill').onclick = showSyncInfo;
  }
  function setNav(name) { $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === name)); }

  function togglePopover() {
    const ex = $('.popover');
    if (ex) { ex.remove(); return; }
    const st = Store.state;
    const el = document.createElement('div');
    el.className = 'popover';
    el.innerHTML = '<div class="who"><small>' + (st.mode === 'cloud' ? 'Вы вошли как' : 'Режим') + '</small><b>' + esc(st.mode === 'cloud' ? ((st.user && st.user.email) || '') : 'Локальный (без входа)') + '</b></div>' +
      '<button type="button" data-a="backup">' + ic('download') + 'Резервная копия (JSON)</button>' +
      (st.mode === 'cloud' ? '<button type="button" data-a="logout">' + ic('logout') + 'Выйти</button>' : '');
    $('.top-right').appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      el.remove();
      if (b.dataset.a === 'backup') exportBackup();
      if (b.dataset.a === 'logout') Store.signOut();
    });
    setTimeout(() => {
      const off = ev => {
        if (el.contains(ev.target) && !ev.target.closest('[data-a]')) return;
        el.remove();
        document.removeEventListener('click', off);
      };
      document.addEventListener('click', off);
    }, 0);
  }
  function exportBackup() {
    const data = { app: 'vip-restobar', exportedAt: new Date().toISOString(), categories: S.cats, menu: S.menu, orders: S.orders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vip-backup-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
    toast('Резервная копия скачана', 'ok');
  }

  function syncInfo() {
    const st = Store.state;
    if (st.mode === 'local') return { cls: 'local', txt: 'Локально', title: 'Локальный режим', text: 'Данные сохраняются только в этом браузере, на этом устройстве. Чтобы заказы и меню были онлайн и на всех телефонах, подключите Firebase — шаги описаны в README.md (раздел «Подключение Firebase»).' };
    if (st.error === 'permission') return { cls: 'bad', txt: 'Нет доступа', title: 'Нет доступа к базе', text: 'Проверьте правила Firestore и список разрешённых email в файле firestore.rules (см. README).' };
    if (!st.online) return { cls: 'bad', txt: 'Нет сети', title: 'Нет соединения', text: 'Можно продолжать работать: изменения сохранятся на устройстве и отправятся в облако, как только появится интернет.' };
    if (st.pending) return { cls: 'warn', txt: 'Синхронизация…', title: 'Синхронизация', text: 'Изменения отправляются в облако.' };
    return { cls: 'ok', txt: 'Онлайн', title: 'Онлайн', text: 'Все данные сохранены в облаке и доступны на всех ваших устройствах.' };
  }
  function renderSync() {
    const i = syncInfo(), el = $('#syncPill');
    if (!el) return;
    el.className = 'pill ' + i.cls;
    el.innerHTML = '<i></i><span>' + esc(i.txt) + '</span>';
    el.title = i.title;
  }
  function showSyncInfo() {
    const i = syncInfo();
    const m = openModal('<h3>' + esc(i.title) + '</h3><p class="modal-text">' + esc(i.text) + '</p><div class="modal-actions"><button type="button" class="btn primary" id="siOk">Понятно</button></div>', 'sm');
    $('#siOk', m).onclick = closeModal;
  }
  let lastErr = null;
  function errorToast(st) {
    if (st.error && st.error !== lastErr) {
      lastErr = st.error;
      toast({
        permission: 'Нет доступа к базе данных. Проверьте правила Firestore и список email в firestore.rules (см. README).',
        sync: 'Не удалось получить данные из облака.',
        write: 'Не удалось сохранить изменения в облаке. Проверьте соединение.',
        storage: 'Не удалось записать в память браузера (возможно, она заполнена).'
      }[st.error] || 'Ошибка', 'err');
    } else if (!st.error) lastErr = null;
  }
  function renderBanner() {
    const b = $('#banner');
    if (Store.state.mode === 'local' && !S.bannerOff) {
      b.innerHTML = '<div class="banner">' + ic('cloud') + '<p>Локальный режим: данные хранятся только на этом устройстве. Чтобы всё сохранялось онлайн, подключите Firebase — см. README.md.</p><button type="button" id="bannerX" aria-label="Закрыть">' + ic('x') + '</button></div>';
      $('#bannerX').onclick = () => { S.bannerOff = true; b.innerHTML = ''; };
    } else b.innerHTML = '';
  }

  function showLogin() {
    $('#app').hidden = true;
    const el = $('#login');
    el.hidden = false;
    if (el.dataset.built === 'login') { const pf = $('#loginForm'); if (pf) pf.elements.pass.value = ''; return; }
    el.dataset.built = 'login';
    el.innerHTML = '<div class="login-card"><img src="assets/logo-gold.png" alt="ВИАЙПИ"><h1>ВИАЙПИ</h1><p class="sub">Искусство отдыха · заказы</p>' +
      '<form id="loginForm" novalidate>' +
      '<label class="fld"><span>Email</span><input name="email" type="email" autocomplete="username" inputmode="email" required></label>' +
      '<label class="fld"><span>Пароль</span><input name="pass" type="password" autocomplete="current-password" required></label>' +
      '<p class="login-err" id="loginErr" role="alert"></p>' +
      '<button type="submit" class="btn primary" id="loginBtn">Войти</button></form></div>';
    const f = $('#loginForm');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const email = f.elements.email.value.trim(), pass = f.elements.pass.value;
      const err = $('#loginErr'), btn = $('#loginBtn');
      if (!email || !pass) { err.textContent = 'Введите email и пароль.'; return; }
      err.textContent = ''; btn.disabled = true;
      Store.signIn(email, pass).catch(ex => { err.textContent = Store.authErrorText(ex); }).then(() => { btn.disabled = false; });
    });
  }
  function showFatal() {
    $('#app').hidden = true;
    const el = $('#login');
    el.hidden = false;
    el.dataset.built = 'fatal';
    el.innerHTML = '<div class="fatal"><h1>Нет соединения</h1><p>Не удалось загрузить Firebase. Проверьте интернет и значения в js/firebase-config.js.</p><button type="button" class="btn primary" id="retry">Повторить</button></div>';
    $('#retry').onclick = () => location.reload();
  }
  function showApp() {
    $('#login').hidden = true;
    $('#app').hidden = false;
    if (S.appShown) return;
    S.appShown = true;
    renderBanner();
    route();
  }

  function onState(st) {
    renderSync();
    errorToast(st);
    if (st.mode === 'cloud') {
      if (!st.authReady) return;
      if (st.loadError) { showFatal(); return; }
      if (!st.user) {
        if (S.appShown) { S.appShown = false; S.seedChecked = false; closeModal(); }
        showLogin();
      } else if (!S.appShown) showApp();
    } else if (!S.appShown) showApp();
    maybeSeed();
  }

  /* ============================== роутер ================================ */
  function parseRoute() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const p = h.split('/');
    let id = '';
    try { id = p[1] ? decodeURIComponent(p[1]) : ''; } catch (e) { id = p[1] || ''; }
    return { name: p[0] || 'orders', id: id };
  }
  function onHash() {
    if (S.view === 'editor' && S.dirty) {
      if (!window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) {
        history.replaceState(null, '', S.lastHash || '#/orders');
        return;
      }
      S.dirty = false;
    }
    route();
  }
  function route() {
    if (!S.appShown) return;
    const r = parseRoute();
    S.lastHash = location.hash || '#/orders';
    S.pendingRoute = false;
    closeModal();
    switch (r.name) {
      case 'orders': renderOrders(); setNav('orders'); break;
      case 'new': renderEditor(''); setNav('new'); break;
      case 'edit': renderEditor(r.id); setNav('orders'); break;
      case 'view': renderView(r.id); setNav('orders'); break;
      case 'menu': renderMenu(); setNav('menu'); break;
      default: location.replace('#/orders'); return;
    }
    document.body.dataset.view = S.view;
    window.scrollTo(0, 0);
  }

  /* ===================== обновление при изменении данных ================ */
  function refresh(col) {
    if (!S.appShown) return;
    if (S.pendingRoute && Store.isLoaded('orders')) { route(); return; }
    const a = document.activeElement;
    if (S.view === 'menu' && a && a.classList && a.classList.contains('in-price')) { S.deferred = true; return; }
    switch (S.view) {
      case 'orders': if (col === 'orders') renderOrdersBody(); break;
      case 'menu': if (col === 'menu' || col === 'categories') renderMenuBody(); break;
      case 'view':
        if (col === 'orders') { S.quiet = true; renderView(parseRoute().id); S.quiet = false; }
        break;
      case 'editor':
        if ((col === 'menu' || col === 'categories') && S.draft) { renderPickerChips(); renderPickerItems(); }
        break;
      default: break;
    }
  }

  /* ================================ старт ================================ */
  function boot() {
    setupChrome();
    Store.watch('categories', d => { S.cats = d; refresh('categories'); });
    Store.watch('menu', d => { S.menu = d; refresh('menu'); maybeSeed(); });
    Store.watch('orders', d => { S.orders = d; refresh('orders'); });
    Store.watch('meta', d => { S.meta = d; maybeSeed(); });
    Store.onState(st => { onState(st); if (S.deferred) maybeFlushDeferred(); maybeSeed(); });

    window.addEventListener('hashchange', onHash);
    window.addEventListener('resize', () => { clearTimeout(boot.t); boot.t = setTimeout(fitPapers, 80); });
    window.addEventListener('beforeunload', e => { if (S.view === 'editor' && S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if ($('.modal')) closeModal();
      else closePicker();
    });
    document.addEventListener('focusout', () => { if (S.deferred) setTimeout(maybeFlushDeferred, 90); });

    Store.init().then(() => {
      const sp = $('#splash');
      if (sp) { sp.classList.add('gone'); setTimeout(() => sp.remove(), 520); }
      onState(Store.state);
    });
  }
  function maybeFlushDeferred() {
    const a = document.activeElement;
    if (a && a.classList && a.classList.contains('in-price')) return;
    S.deferred = false;
    refresh('menu');
  }

  window.VIPApp = { S: S, sheetHTML: sheetHTML, printOrder: printOrder, fitSheetToPage: fitSheetToPage, route: route };
  boot();
})();
