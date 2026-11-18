/* =====================================================================
   Бланк заказа → изображение (PNG) для WhatsApp / Telegram / ВК.
   Бланк рисуется напрямую на canvas (без внешних библиотек), поэтому
   одинаково работает в Safari, Chrome и на телефоне. Если позиций много,
   таблица автоматически уменьшается, чтобы бланк поместился на «лист» A4; при очень большом
   заказе картинка становится длиннее (чтобы текст оставался читаемым в мессенджере).
   ===================================================================== */
(function () {
  'use strict';

  const PAGE_W = 210, PAGE_H = 297, PX = 1654 / 210;           /* A4 ≈ 200 dpi */
  const FONT = "'Manrope','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const PT = 25.4 / 72;                                         /* пункты → мм */
  const ML = 12, MR = 12, MT = 11, MB = 10;
  const CW = PAGE_W - ML - MR;                                  /* ширина содержимого, 186 мм */
  const INK = '#141414', RULE = '#2b2b2b', GRID = '#3b3b3b', SHADE = '#f3f3f3';
  const MIN_ROWS = 20;
  const CONSENT = 'Даю согласие на обработку, хранение и передачу третьим лицам личных данных в целях осуществления необходимых мер безопасности и требований заведения';

  let logoP = null;
  function loadLogo() {
    if (!logoP) logoP = new Promise(res => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = 'assets/logo-print.png';
    });
    return logoP;
  }
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const sample = 'Бланк предварительного заказа ИТОГО ₽ 0123456789 Abc';
    return Promise.all([500, 600, 700, 800].map(w => document.fonts.load(w + ' 16px Manrope', sample).catch(() => { })));
  }

  /* ---------- маленькая обёртка над canvas: все размеры в мм, шрифты в pt ---------- */
  function makeG(ctx) {
    const st = { dry: false };
    const font = (pt, w, italic) => (italic ? 'italic ' : '') + (w || 500) + ' ' + (pt * PT * PX).toFixed(2) + 'px ' + FONT;
    const api = {
      set dry(v) { st.dry = v; },
      measure(str, pt, w, italic) { ctx.font = font(pt, w, italic); return ctx.measureText(str).width / PX; },
      rect(x, y, w, h, fill) { if (st.dry) return; ctx.fillStyle = fill; ctx.fillRect(x * PX, y * PX, w * PX, h * PX); },
      stroke(x, y, w, h, lw, col) { if (st.dry) return; ctx.strokeStyle = col; ctx.lineWidth = lw * PX; ctx.strokeRect(x * PX, y * PX, w * PX, h * PX); },
      line(x1, y1, x2, y2, lw, col) {
        if (st.dry) return;
        ctx.strokeStyle = col; ctx.lineWidth = lw * PX; ctx.beginPath();
        ctx.moveTo(x1 * PX, y1 * PX); ctx.lineTo(x2 * PX, y2 * PX); ctx.stroke();
      },
      text(str, x, y, o) {
        if (st.dry || !str) return;
        o = o || {};
        ctx.font = font(o.pt || 10, o.w, o.italic);
        ctx.fillStyle = o.color || INK;
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(str, x * PX, y * PX);
      },
      image(im, x, y, w, h, alpha) {
        if (st.dry || !im) return;
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.drawImage(im, x * PX, y * PX, w * PX, h * PX);
        ctx.globalAlpha = 1;
      },
      /* перенос по словам (и по символам для очень длинных слов), поддерживает \n */
      wrap(str, maxW, pt, w, italic) {
        const out = [];
        String(str == null ? '' : str).split(/\r?\n/).forEach(par => {
          let cur = '';
          par.split(/\s+/).filter(Boolean).forEach(word => {
            const t = cur ? cur + ' ' + word : word;
            if (api.measure(t, pt, w, italic) <= maxW) { cur = t; return; }
            if (cur) { out.push(cur); cur = ''; }
            if (api.measure(word, pt, w, italic) <= maxW) { cur = word; return; }
            let chunk = '';
            Array.from(word).forEach(ch => {
              if (api.measure(chunk + ch, pt, w, italic) > maxW && chunk) { out.push(chunk); chunk = ch; } else chunk += ch;
            });
            cur = chunk;
          });
          out.push(cur);
        });
        return out.length ? out : [''];
      }
    };
    return api;
  }

  /* ----------------------------- верстка бланка ----------------------------- */
  /* s — масштаб таблицы/примечаний (1 = обычный размер). Возвращает нижнюю границу содержимого, мм. */
  function paint(g, m, s, logo) {
    const T = (str, x, y, o) => g.text(str, x, y, o);
    let y = MT;

    /* водяной знак и шапка */
    if (logo) {
      const ww = 118, wh = ww * logo.height / logo.width;
      g.image(logo, PAGE_W / 2 - ww / 2, PAGE_H * 0.58 - wh / 2, ww, wh, 0.035);
      const lh = 23;
      g.image(logo, ML, MT, lh * logo.width / logo.height, lh, 1);
    }
    const t1 = 'БЛАНК ПРЕДВАРИТЕЛЬНОГО ЗАКАЗА', t2 = 'РЕСТОБАРА «ВИАЙПИ»';
    const tpt = 12.5, tlh = tpt * PT * 1.35, ttop = MT + (23 - tlh * 2) / 2;
    T(t1, PAGE_W / 2, ttop + tlh / 2 + tpt * PT * 0.36, { pt: tpt, w: 800, align: 'center' });
    T(t2, PAGE_W / 2, ttop + tlh * 1.5 + tpt * PT * 0.36, { pt: tpt, w: 800, align: 'center' });
    if (m.no) {
      const top = MT + 6.6;
      T('ЗАКАЗ №', PAGE_W - MR, top + 2.2, { pt: 6.8, w: 800, color: '#555', align: 'right' });
      T(m.no, PAGE_W - MR, top + 8.6, { pt: 17, w: 800, align: 'right' });
    }
    y = MT + 23 + 4;

    /* поля */
    const field = (label, value, x, w, yy) => {
      const lw = g.measure(label.toUpperCase(), 9.5, 800);
      T(label.toUpperCase(), x, yy + 3.75, { pt: 9.5, w: 800 });
      const vx = x + lw + 2, vw = x + w - vx;
      g.line(vx, yy + 5.25, vx + vw, yy + 5.25, 0.3, RULE);
      let pt = 11;
      while (pt > 7 && g.measure(value, pt, 600) > vw - 3) pt -= 0.5;
      T(value, vx + 1.5, yy + 3.75, { pt: pt, w: 600 });
    };
    const rowH = 5.6 + 2.4;
    field('Дата', m.date, ML, CW, y); y += rowH;
    field('ФИО', m.name, ML, CW, y); y += rowH;
    const gap = 5;
    field('№ телефона', m.phone, ML, CW - 50 - gap, y);
    field('Стол №', m.table, ML + CW - 50, 50, y); y += rowH;
    const wg = 52, wt = 55, wp = CW - wg - wt - 2 * gap;
    field('Кол-во гостей', m.guests, ML, wg, y);
    field('Время заказа', m.time, ML + wg + gap, wt, y);
    field('Предоплата', m.prepay, ML + wg + wt + 2 * gap, wp, y);
    y += rowH + 4 - 2.4;

    /* таблица */
    const cw = [18, CW - 18 - 17 - 27, 17, 27];
    const cx = [ML, ML + cw[0], ML + cw[0] + cw[1], ML + cw[0] + cw[1] + cw[2], ML + CW];
    const padX = 1.8;
    const headH = (1.7 * 2 + 8.8 * PT * 1.25) * s;
    const tableTop = y;
    g.rect(ML, y, CW, headH, SHADE);
    ['ПОДАЧА', 'НАИМЕНОВАНИЕ', 'КОЛ-ВО', 'ЦЕНА'].forEach((h, i) => {
      const cxm = cx[i] + cw[i] / 2, hp = 8.8 * s, hw = g.measure(h, hp, 800);
      const base = y + headH / 2 + hp * PT * 0.36;
      T(h, cxm, base, { pt: hp, w: 800, align: 'center' });
      g.line(cxm - hw / 2, base + 0.6 * s, cxm + hw / 2, base + 0.6 * s, 0.2 * s + 0.05, INK);
    });
    y += headH;
    const rowLines = [y];

    const namePt = 10 * s, notePt = 7.6 * s, unitPt = 6.8 * s;
    const nameLH = namePt * PT * 1.2, noteLH = notePt * PT * 1.15;
    m.rows.forEach(r => {
      const nm = g.wrap(r.name, cw[1] - 2 * padX, namePt, 600);
      const nt = r.note ? g.wrap(r.note, cw[1] - 2 * padX, notePt, 500, true) : [];
      const txtH = nm.length * nameLH + nt.length * noteLH;
      const priceH = namePt * PT * 1.2 + (r.unit ? unitPt * PT * 1.15 : 0);
      const h = Math.max(6.9 * s, 1.6 * s + Math.max(txtH, priceH));
      const mid = y + h / 2;
      T(r.serve, cx[0] + cw[0] / 2, mid + namePt * PT * 0.36, { pt: namePt, w: 700, align: 'center' });
      let ty = mid - txtH / 2;
      nm.forEach(l => { T(l, cx[1] + padX, ty + nameLH / 2 + namePt * PT * 0.36, { pt: namePt, w: 600 }); ty += nameLH; });
      nt.forEach(l => { T(l, cx[1] + padX, ty + noteLH / 2 + notePt * PT * 0.36, { pt: notePt, w: 500, italic: true, color: '#555' }); ty += noteLH; });
      T(r.qty, cx[2] + cw[2] / 2, mid + namePt * PT * 0.36, { pt: namePt, w: 700, align: 'center' });
      let py = mid - priceH / 2;
      T(r.price, cx[4] - padX, py + nameLH / 2 + namePt * PT * 0.36, { pt: namePt, w: 700, align: 'right' });
      if (r.unit) T(r.unit, cx[4] - padX, py + nameLH + noteLH / 2 + unitPt * PT * 0.36, { pt: unitPt, w: 500, color: '#666', align: 'right' });
      y += h; rowLines.push(y);
    });
    const used = m.rows.reduce((a, r) => a + Math.max(1, Math.ceil(String(r.name).length / 62)) + (r.note ? 0.45 : 0), 0);
    const empty = Math.max(0, MIN_ROWS - Math.ceil(used));
    for (let i = 0; i < empty; i++) { y += 6.9 * s; rowLines.push(y); }

    /* строка «Итого» */
    const totH = 7.8 * s;
    g.rect(ML, y, CW, totH, SHADE);
    const tmid = y + totH / 2 + namePt * PT * 0.36;
    T('ИТОГО', cx[0] + padX, tmid, { pt: namePt, w: 800 });
    T(m.totQty, cx[2] + cw[2] / 2, tmid, { pt: namePt, w: 800, align: 'center' });
    T(m.totSum, cx[4] - padX, tmid, { pt: namePt, w: 800, align: 'right' });
    y += totH; rowLines.push(y);

    /* сетка таблицы */
    rowLines.forEach(ly => g.line(ML, ly, ML + CW, ly, 0.25, GRID));
    g.line(ML, tableTop, ML + CW, tableTop, 0.25, GRID);
    /* у строки «Итого» первые две колонки объединены — граница между ними там не рисуется */
    [cx[0], cx[2], cx[3], cx[4]].forEach(vx => g.line(vx, tableTop, vx, y, 0.25, GRID));
    g.line(cx[1], tableTop, cx[1], y - totH, 0.25, GRID);
    y += 3.5;

    /* примечания */
    const nlpt = 7.6 * s, ntpt = 9.6 * s, ntLH = ntpt * PT * 1.3;
    const nLines = m.notes ? g.wrap(m.notes, CW - 4.8, ntpt, 500) : [];
    const nH = Math.max(15 * s, 1.8 * 2 + nlpt * PT * 1.2 + 0.8 + nLines.length * ntLH);
    g.stroke(ML, y, CW, nH, 0.25, GRID);
    T('ПРИМЕЧАНИЯ / ПОЖЕЛАНИЯ ГОСТЕЙ', ML + 2.4, y + 1.8 + nlpt * PT * 0.95, { pt: nlpt, w: 800, color: '#444' });
    nLines.forEach((l, i) => T(l, ML + 2.4, y + 1.8 + nlpt * PT * 1.2 + 0.8 + i * ntLH + ntLH / 2 + ntpt * PT * 0.36, { pt: ntpt, w: 500 }));
    y += nH + 4;

    /* предоплата / доплата */
    if (m.sum2) {
      let x = PAGE_W - MR;
      const parts = m.sum2.slice().reverse();
      parts.forEach(p => {
        const w = g.measure(p[0], 9, p[1] ? 800 : 600);
        T(p[0], x, y + 3.2, { pt: 9, w: p[1] ? 800 : 600, color: '#222', align: 'right' });
        x -= w;
      });
      y += 4 + 1.5;
    }

    /* низ бланка */
    const u = (CW - 2 * 5) / 3.3;
    field('Итог:', m.footTotal, ML, u, y);
    field('Дата принятия', m.accepted, ML + u + 5, u * 1.15, y);
    field('Принял', m.acceptedBy, ML + u * 2.15 + 10, u * 1.15, y);
    y += 5.6 + 2;

    /* согласие + подпись */
    const cpt = 7.4, clh = cpt * PT * 1.38;
    y += 2.5;
    const cl = g.wrap(CONSENT, CW, cpt, 500);
    const sigW = 52;
    cl.forEach((l, i) => T(l, ML, y + i * clh + clh / 2 + cpt * PT * 0.36, { pt: cpt, w: 500, color: '#333' }));
    let sigLine = cl.length - 1;
    let sx = ML + g.measure(cl[cl.length - 1], cpt, 500) + 1.2;
    if (sx + sigW > ML + CW) { sigLine++; sx = ML; }
    g.line(sx, y + sigLine * clh + clh / 2 + cpt * PT * 0.36 + 0.4, Math.min(sx + sigW, ML + CW), y + sigLine * clh + clh / 2 + cpt * PT * 0.36 + 0.4, 0.3, RULE);
    y += (sigLine + 1) * clh;
    return y;
  }

  function render(model, opts) {
    return Promise.all([loadLogo(), loadFonts()]).then(r => {
      const logo = r[0];
      const probe = document.createElement('canvas').getContext('2d');
      const gp = makeG(probe);
      gp.dry = true;
      /* подбираем самый крупный масштаб, при котором всё помещается в A4 */
      let s = 1;
      const limit = PAGE_H - MB, MIN_S = 0.62;     /* ниже этого текст в мессенджере уже плохо читается — тогда картинка станет длиннее A4 */
      if (paint(gp, model, 1, logo) > limit) {
        if (paint(gp, model, MIN_S, logo) > limit) s = MIN_S;
        else {
          let lo = MIN_S, hi = 1;
          for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (paint(gp, model, mid, logo) <= limit) lo = mid; else hi = mid; }
          s = lo;
        }
      }
      const endY = paint(gp, model, s, logo);
      const hmm = Math.max(PAGE_H, Math.ceil(endY + MB));
      const cv = document.createElement('canvas');
      cv.width = Math.round(PAGE_W * PX); cv.height = Math.round(hmm * PX);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      const g = makeG(ctx);
      paint(g, model, s, logo);
      return new Promise((res, rej) => {
        const done = blob => blob ? res({ canvas: cv, blob: blob, scale: s }) : rej(new Error('toBlob failed'));
        if (cv.toBlob) cv.toBlob(done, 'image/png');
        else {
          const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          done(new Blob([arr], { type: 'image/png' }));
        }
      });
    });
  }

  window.VIPShare = { render: render, PX: PX };
})();
