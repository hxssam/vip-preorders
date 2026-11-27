/* ------------------------------------------------------------------
   store.js — слой хранения данных.
   • Если в js/firebase-config.js заполнены настройки → Firebase
     (вход по email/паролю + Firestore, синхронизация между устройствами,
     работает и без сети — запишется, когда появится интернет).
   • Если настройки пустые → ЛОКАЛЬНЫЙ режим (localStorage браузера).
------------------------------------------------------------------ */
(function () {
  'use strict';

  var FB_VERSION = '10.14.1';
  var COLS = ['categories', 'menu', 'orders', 'meta'];   /* всё, что видит и меняет персонал */
  var ALL = COLS.concat(['users']);                       /* + список официантов (только персонал) */
  var VIEW_COLS = ['orders'];                             /* официант (только просмотр) читает лишь заказы */
  var VIEWER_DOMAIN = '@waiter.vip';                      /* логин «ivan» → почта ivan@waiter.vip (письма не отправляются) */
  var cfg = window.FIREBASE_CONFIG || {};
  var CLOUD = !!(cfg.apiKey && cfg.projectId);
  var LS_PREFIX = 'vip.';

  var cache = {}, loaded = {}, fromServer = {}, pendingCol = {}, listeners = {};
  var stateListeners = [];
  ALL.forEach(function (c) {
    cache[c] = []; loaded[c] = false; fromServer[c] = false; pendingCol[c] = false; listeners[c] = [];
  });

  var state = {
    mode: CLOUD ? 'cloud' : 'local',
    authReady: false,
    user: null,
    role: CLOUD ? null : 'staff',   // 'staff' | 'viewer' | 'disabled' | 'none' | null (ещё определяется)
    profile: null,                  // для официанта: { name, username }
    online: navigator.onLine !== false,
    pending: false,
    error: null,       // 'permission' | 'sync' | 'write' | 'storage' | null
    loadError: false   // не удалось загрузить Firebase
  };
  var fb = null;
  var unsubs = [];

  function clean(o) { return JSON.parse(JSON.stringify(o)); }

  function emitState() {
    stateListeners.slice().forEach(function (fn) {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }
  function emit(col, docs) {
    cache[col] = docs;
    loaded[col] = true;
    listeners[col].slice().forEach(function (fn) {
      try { fn(docs); } catch (e) { console.error(e); }
    });
  }

  /* ---------- локальный режим ---------- */
  function lsRead(col) {
    try {
      var v = JSON.parse(localStorage.getItem(LS_PREFIX + col) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function lsWrite(col, arr) {
    try { localStorage.setItem(LS_PREFIX + col, JSON.stringify(arr)); return true; }
    catch (e) { state.error = 'storage'; emitState(); return false; }
  }

  /* ---------- применение операций (оптимистично, сразу в UI) ---------- */
  function applyOps(ops) {
    var byCol = {};
    ops.forEach(function (op) {
      var arr = byCol[op.col] || (byCol[op.col] = cache[op.col].slice());
      var i = -1;
      for (var k = 0; k < arr.length; k++) { if (arr[k].id === op.id) { i = k; break; } }
      if (i >= 0) arr.splice(i, 1);
      if (!op.del) {
        var rec = clean(op.data);
        delete rec.id;
        rec.id = op.id;
        arr.push(rec);
      }
    });
    Object.keys(byCol).forEach(function (c) {
      emit(c, byCol[c]);
      if (!CLOUD) lsWrite(c, byCol[c]);
    });
  }

  function writeError(e) {
    console.error('Ошибка записи', e);
    state.error = (e && e.code === 'permission-denied') ? 'permission' : 'write';
    emitState();
  }

  function batch(ops) {
    if (!ops || !ops.length) return Promise.resolve();
    applyOps(ops);
    if (!CLOUD || !fb) return Promise.resolve();
    var F = fb.F, jobs = [];
    for (var i = 0; i < ops.length; i += 400) {
      var b = F.writeBatch(fb.db);
      ops.slice(i, i + 400).forEach(function (op) {
        var ref = F.doc(fb.db, op.col, op.id);
        if (op.del) b.delete(ref);
        else { var rec = clean(op.data); delete rec.id; b.set(ref, rec); }
      });
      jobs.push(b.commit());
    }
    return Promise.all(jobs).catch(writeError);
  }
  function save(col, id, data) { return batch([{ col: col, id: id, data: data }]); }
  function remove(col, id) { return batch([{ col: col, id: id, del: true }]); }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- подписки ---------- */
  function watch(col, fn) {
    listeners[col].push(fn);
    if (loaded[col]) { try { fn(cache[col]); } catch (e) { console.error(e); } }
    return function () {
      var i = listeners[col].indexOf(fn);
      if (i >= 0) listeners[col].splice(i, 1);
    };
  }
  function onState(fn) { stateListeners.push(fn); return function () { var i = stateListeners.indexOf(fn); if (i >= 0) stateListeners.splice(i, 1); }; }
  function isSynced() {
    if (!CLOUD) return true;
    if (state.role === 'viewer') return !!fromServer.orders;
    return !!(fromServer.categories && fromServer.menu && fromServer.meta);
  }

  /* ---------- Firebase ---------- */
  function startListeners(cols, uid) {
    if (unsubs.length || !fb) return;
    var F = fb.F;
    cols.forEach(function (col) {
      var unsub = F.onSnapshot(
        F.collection(fb.db, col),
        { includeMetadataChanges: true },
        function (snap) {
          var md = snap.metadata;
          if (!md.fromCache) fromServer[col] = true;
          pendingCol[col] = md.hasPendingWrites;
          state.pending = ALL.some(function (c) { return pendingCol[c]; });
          if (state.error === 'permission' || state.error === 'sync') state.error = null;
          if (!loaded[col] || snap.docChanges().length) {
            emit(col, snap.docs.map(function (d) {
              var o = d.data(); o.id = d.id; return o;
            }));
          }
          emitState();
        },
        function (err) {
          console.error('Ошибка чтения ' + col, err);
          if (col === 'users') { emit(col, []); emitState(); return; }   /* правила без раздела «официанты» ещё не обновлены — не мешаем работе */
          if (err && err.code === 'permission-denied' && state.role === 'viewer') { recheckRole(); return; }   /* доступ отозван? */
          state.error = (err && err.code === 'permission-denied') ? 'permission' : 'sync';
          emit(col, cache[col]);
          emitState();
        }
      );
      unsubs.push(unsub);
    });
    if (uid && state.role === 'viewer') {
      /* следим за собственной карточкой: отключили или удалили — доступ закрывается сразу */
      unsubs.push(F.onSnapshot(F.doc(fb.db, 'users', uid), function (snap) {
        if (snap.metadata && snap.metadata.fromCache && !snap.exists()) return;   /* нет сети — не считаем это отзывом */
        var d = snap.exists() ? snap.data() : null;
        if (!d || d.role !== 'viewer' || d.active === false) { lockOut(d && d.active === false ? 'disabled' : 'none'); return; }
        state.profile = { name: d.name || '', username: d.username || '' };
        emitState();
      }, function () { /* ignore */ }));
    }
  }
  function stopListeners() {
    unsubs.forEach(function (u) { try { u(); } catch (e) { } });
    unsubs = [];
    ALL.forEach(function (c) {
      emit(c, []);
      loaded[c] = false; fromServer[c] = false; pendingCol[c] = false;
    });
    state.pending = false;
  }

  /* ---------- роли: персонал / официант (только просмотр) ---------- */
  function roleKey(uid) { return LS_PREFIX + 'role.' + uid; }
  function cachedRole(uid) { try { return localStorage.getItem(roleKey(uid)) || ''; } catch (e) { return ''; } }
  function rememberRole(uid, role) { try { if (role === 'staff' || role === 'viewer') localStorage.setItem(roleKey(uid), role); else localStorage.removeItem(roleKey(uid)); } catch (e) { } }

  /* Официант — тот, у кого есть карточка users/{uid} с role=viewer (создаёт только персонал).
     Персонал — тот, кто может читать meta (правила). Остальные — «нет доступа». */
  function resolveRole(user) {
    var F = fb.F, uid = user.uid;
    function wrap(p) { return p.then(function (v) { return { ok: true, v: v }; }, function (e) { return { ok: false, err: e }; }); }
    var job = Promise.all([wrap(F.getDoc(F.doc(fb.db, 'users', uid))), wrap(F.getDoc(F.doc(fb.db, 'meta', 'settings')))]);
    var timeout = new Promise(function (res) { setTimeout(function () { res('timeout'); }, 9000); });
    return Promise.race([job, timeout]).then(function (r) {
      if (r === 'timeout') return { role: cachedRole(uid) || 'staff', offline: true };
      var u = r[0], m = r[1];
      if (u.ok && u.v.exists() && (u.v.data() || {}).role === 'viewer') {
        var d = u.v.data();
        return { role: d.active === false ? 'disabled' : 'viewer', profile: { name: d.name || '', username: d.username || '' } };
      }
      if (m.ok) return { role: 'staff' };
      if (m.err && m.err.code === 'permission-denied') return { role: 'none' };
      return { role: cachedRole(uid) || 'staff', offline: true };   /* нет сети — берём последнюю известную роль */
    });
  }
  function applyRole(user, r) {
    stopListeners();
    state.role = r.role;
    state.profile = r.profile || null;
    state.error = null;
    if (!r.offline) rememberRole(user.uid, r.role);
    if (r.role === 'staff') startListeners(ALL);
    else if (r.role === 'viewer') startListeners(VIEW_COLS, user.uid);
  }
  function lockOut(role) {
    stopListeners();
    state.role = role;
    if (fb && fb.auth.currentUser) rememberRole(fb.auth.currentUser.uid, '');
    emitState();
  }
  var rechecking = false;
  function recheckRole() {
    var u = fb && fb.auth.currentUser;
    if (rechecking || !u) return;
    rechecking = true;
    resolveRole(u).then(function (r) {
      rechecking = false;
      if (r.offline || (r.role === 'viewer' && state.role === 'viewer')) return;
      if (!fb.auth.currentUser || fb.auth.currentUser.uid !== u.uid) return;
      applyRole(u, r); emitState();
    }, function () { rechecking = false; });
  }

  function cloudStart() {
    return new Promise(function (resolve) {
      var finished = false;
      function finish() { if (!finished) { finished = true; resolve(); } }
      var timer = setTimeout(function () {
        if (!state.authReady) { state.loadError = true; state.authReady = true; emitState(); }
        finish();
      }, 15000);

      var base = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';
      Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js')
      ]).then(function (m) {
        var A = m[0], Au = m[1], F = m[2];
        var app = A.initializeApp(cfg);
        var db;
        try {
          db = F.initializeFirestore(app, {
            localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() })
          });
        } catch (e) {
          console.warn('Офлайн-кэш недоступен, работаем без него', e);
          db = F.getFirestore(app);
        }
        var auth = Au.getAuth(app);
        fb = { A: A, Au: Au, F: F, app: app, db: db, auth: auth };
        state.loadError = false;
        Au.onAuthStateChanged(auth, function (user) {
          clearTimeout(timer);
          state.user = user ? { uid: user.uid, email: user.email || '' } : null;
          if (!user) {
            stopListeners();
            state.role = null; state.profile = null;
            state.authReady = true; emitState(); finish();
            return;
          }
          state.role = null; emitState();   /* роль определяется — приложение пока не открываем */
          resolveRole(user).then(function (r) {
            if (!fb.auth.currentUser || fb.auth.currentUser.uid !== user.uid) return;
            applyRole(user, r);
          }, function () {
            applyRole(user, { role: cachedRole(user.uid) || 'staff', offline: true });
          }).then(function () { state.authReady = true; emitState(); finish(); });
        }, function (err) {
          console.error(err);
          clearTimeout(timer);
          state.loadError = true; state.authReady = true; emitState(); finish();
        });
      }).catch(function (e) {
        console.error('Не удалось загрузить Firebase', e);
        clearTimeout(timer);
        state.loadError = true; state.authReady = true; emitState(); finish();
      });
    });
  }

  function init() {
    window.addEventListener('online', function () { state.online = true; emitState(); });
    window.addEventListener('offline', function () { state.online = false; emitState(); });
    if (!CLOUD) {
      COLS.forEach(function (c) { emit(c, lsRead(c)); });
      window.addEventListener('storage', function (ev) {
        if (!ev.key || ev.key.indexOf(LS_PREFIX) !== 0) return;
        var c = ev.key.slice(LS_PREFIX.length);
        if (COLS.indexOf(c) >= 0) emit(c, lsRead(c));
      });
      state.authReady = true;
      emitState();
      return Promise.resolve();
    }
    return cloudStart();
  }

  /* ---------- вход ---------- */
  function signIn(email, pass) {
    if (!fb) return Promise.reject({ code: 'auth/network-request-failed' });
    return fb.Au.signInWithEmailAndPassword(fb.auth, email, pass);
  }
  function signOut() {
    if (!fb) return Promise.resolve();
    return fb.Au.signOut(fb.auth);
  }
  /* ---------- официанты: создаёт и отключает только персонал ---------- */
  function loginToEmail(login) {
    var l = String(login || '').trim().toLowerCase();
    return l.indexOf('@') >= 0 ? l : l + VIEWER_DOMAIN;
  }
  function noop() { }
  function createViewer(username, name, password) {
    if (!fb) return Promise.reject({ code: 'auth/network-request-failed' });
    var A = fb.A, Au = fb.Au, F = fb.F;
    var login = String(username).trim().toLowerCase(), email = loginToEmail(login);
    /* второе «приложение» Firebase: создаём учётку в нём, чтобы не выйти из своей */
    var app2 = A.initializeApp(cfg, 'vip-new-' + Date.now().toString(36));
    var auth2 = Au.initializeAuth(app2, { persistence: Au.inMemoryPersistence });
    function cleanup() { return Au.signOut(auth2).catch(noop).then(function () { return A.deleteApp(app2); }).catch(noop); }
    return Au.createUserWithEmailAndPassword(auth2, email, password)
      .catch(function (e) {
        if (e && e.code === 'auth/email-already-in-use') {   /* логин уже был: вернём доступ, только если пароль тот же */
          return Au.signInWithEmailAndPassword(auth2, email, password).catch(function () { throw { code: 'vip/login-taken' }; });
        }
        throw e;
      })
      .then(function (cred) {
        var uid = cred.user.uid;
        var rec = { role: 'viewer', active: true, username: login, name: String(name || '').trim(), createdAt: Date.now() };
        return F.setDoc(F.doc(fb.db, 'users', uid), rec).then(function () { return { uid: uid, username: login }; });
      })
      .then(function (r) { return cleanup().then(function () { return r; }); }, function (e) { return cleanup().then(function () { throw e; }); });
  }
  function setViewerActive(uid, active) {
    var cur = cache.users.filter(function (u) { return u.id === uid; })[0];
    if (!cur) return Promise.resolve();
    var rec = clean(cur); delete rec.id; rec.active = !!active;
    return save('users', uid, rec);
  }
  function removeViewer(uid) { return remove('users', uid); }
  function changePassword(oldPass, newPass) {
    var u = fb && fb.auth.currentUser;
    if (!u) return Promise.reject({ code: 'auth/network-request-failed' });
    var Au = fb.Au;
    return Au.reauthenticateWithCredential(u, Au.EmailAuthProvider.credential(u.email, oldPass)).then(function () { return Au.updatePassword(u, newPass); });
  }

  function authErrorText(err) {
    var code = (err && err.code) || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
      case 'auth/missing-password':
        return 'Неверный email или пароль.';
      case 'auth/too-many-requests':
        return 'Слишком много попыток. Подождите немного и повторите.';
      case 'auth/network-request-failed':
        return 'Нет соединения с интернетом.';
      case 'auth/user-disabled':
        return 'Этот пользователь отключён.';
      case 'auth/email-already-in-use':
      case 'vip/login-taken':
        return 'Такой логин уже занят. Выберите другой.';
      case 'auth/weak-password':
        return 'Пароль слишком простой — нужно не меньше 6 символов.';
      case 'auth/requires-recent-login':
        return 'Войдите заново и повторите.';
      case 'permission-denied':
        return 'Нет прав на это действие.';
      case 'auth/admin-restricted-operation':
        return 'В Firebase отключена регистрация. Включите её: Authentication → Settings → User actions → «Enable create (sign-up)». Без этого официантов создать нельзя.';
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'В Firebase не включён вход по Email/паролю (Authentication → Sign-in method).';
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      case 'auth/invalid-api-key':
        return 'Неверный apiKey в js/firebase-config.js.';
      default:
        return 'Не удалось войти' + (code ? ' (' + code + ')' : '') + '.';
    }
  }

  window.VIPStore = {
    mode: state.mode,
    state: state,
    init: init,
    watch: watch,
    get: function (c) { return cache[c]; },
    isLoaded: function (c) { return !!loaded[c]; },
    isSynced: isSynced,
    save: save,
    remove: remove,
    batch: batch,
    newId: newId,
    signIn: signIn,
    signOut: signOut,
    loginToEmail: loginToEmail,
    createViewer: createViewer,
    setViewerActive: setViewerActive,
    removeViewer: removeViewer,
    changePassword: changePassword,
    onState: onState,
    authErrorText: authErrorText
  };
})();
