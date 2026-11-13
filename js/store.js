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
  var COLS = ['categories', 'menu', 'orders', 'meta'];
  var cfg = window.FIREBASE_CONFIG || {};
  var CLOUD = !!(cfg.apiKey && cfg.projectId);
  var LS_PREFIX = 'vip.';

  var cache = {}, loaded = {}, fromServer = {}, pendingCol = {}, listeners = {};
  var stateListeners = [];
  COLS.forEach(function (c) {
    cache[c] = []; loaded[c] = false; fromServer[c] = false; pendingCol[c] = false; listeners[c] = [];
  });

  var state = {
    mode: CLOUD ? 'cloud' : 'local',
    authReady: false,
    user: null,
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
    return CLOUD ? (fromServer.categories && fromServer.menu && fromServer.meta) : true;
  }

  /* ---------- Firebase ---------- */
  function startListeners() {
    if (unsubs.length || !fb) return;
    var F = fb.F;
    COLS.forEach(function (col) {
      var unsub = F.onSnapshot(
        F.collection(fb.db, col),
        { includeMetadataChanges: true },
        function (snap) {
          var md = snap.metadata;
          if (!md.fromCache) fromServer[col] = true;
          pendingCol[col] = md.hasPendingWrites;
          state.pending = COLS.some(function (c) { return pendingCol[c]; });
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
          state.error = (err && err.code === 'permission-denied') ? 'permission' : 'sync';
          emit(col, cache[col]);
          emitState();
        }
      );
      unsubs.push(unsub);
    });
  }
  function stopListeners() {
    unsubs.forEach(function (u) { try { u(); } catch (e) { } });
    unsubs = [];
    COLS.forEach(function (c) {
      emit(c, []);
      loaded[c] = false; fromServer[c] = false; pendingCol[c] = false;
    });
    state.pending = false;
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
          state.authReady = true;
          if (user) startListeners(); else stopListeners();
          emitState();
          finish();
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
    onState: onState,
    authErrorText: authErrorText
  };
})();
