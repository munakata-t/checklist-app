// ./js/firebase.js
(() => {
  "use strict";

  // Firebase JS SDK (CDN) v12.9.0 を使用（公式手順）
  // ※HTML側で module import せず、ここは「globals + defer」で動かす方式

  // 1) firebase-config.js が先に読み込まれている前提
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) {
    console.error("[firebase] FIREBASE_CONFIG がありません。firebase-config.js を確認してね。");
    return;
  }

  // 2) CDN の読み込み（defer前提なので動的importでOK）
  const base = "https://www.gstatic.com/firebasejs/12.9.0/";

  Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-auth.js"),
    import(base + "firebase-firestore.js"),
  ])
    .then(async ([appMod, authMod, fsMod]) => {
      const { initializeApp } = appMod;
      const { getAuth, signInAnonymously, onAuthStateChanged } = authMod;
      const {
        getFirestore,
        serverTimestamp,
        doc,
        setDoc,
        getDoc,
        collection,
        addDoc,
        deleteDoc,
        updateDoc,
        query,
        orderBy,
        onSnapshot,
        runTransaction,
      } = fsMod;

      const app = initializeApp(cfg);
      const auth = getAuth(app);
      const db = getFirestore(app);

      // グローバル公開（他JSから使う）
      window.__FB = {
        app,
        auth,
        db,
        fs: {
          serverTimestamp,
          doc,
          setDoc,
          getDoc,
          collection,
          addDoc,
          deleteDoc,
          updateDoc,
          query,
          orderBy,
          onSnapshot,
          runTransaction,
        },
      };

      // 匿名ログイン（未ログインなら実行）
      onAuthStateChanged(auth, async (user) => {
        if (user) return;
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("[firebase] 匿名ログイン失敗", e);
        }
      });

      // firebase準備完了フラグ
      window.__FB_READY = true;
      window.dispatchEvent(new CustomEvent("fb-ready"));
    })
    .catch((e) => console.error("[firebase] SDK読み込み失敗", e));
})();