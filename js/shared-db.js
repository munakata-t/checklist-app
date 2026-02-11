// ./js/shared-db.js
(() => {
  "use strict";

  const ROOM_KEY = "moca_room_id_v1";

  const waitFirebaseReady = () =>
    new Promise((resolve) => {
      if (window.__FB_READY && window.__FB) return resolve();
      window.addEventListener("fb-ready", () => resolve(), { once: true });
    });

  function getRoomId() {
    return localStorage.getItem(ROOM_KEY) || "";
  }

  function setRoomId(id) {
    localStorage.setItem(ROOM_KEY, id);
  }

  function ensureRoomId() {
    let id = getRoomId();
    if (id) return id;

    // ルームコードは「2人で同じ文字」を入れるだけで共有される
    id = prompt("共有ルームコードを入力（例：moca-2026）", "moca-2026") || "";
    id = id.trim();
    if (!id) id = "moca-2026";
    setRoomId(id);
    return id;
  }

  function escRoomId(id) {
    // Firestore docId に使える範囲に寄せる（空白は-_に）
    return String(id).trim().replace(/\s+/g, "-").replace(/[\/#\[\]\.]/g, "-");
  }

  function nowISO() {
    return new Date().toISOString();
  }

  async function getNextOrderNo(roomId) {
    await waitFirebaseReady();
    const { db, fs } = window.__FB;
    const metaRef = fs.doc(db, "rooms", roomId, "meta", "orderSeq");

    const no = await fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(metaRef);
      const cur = snap.exists() ? (snap.data().n || 1) : 1;
      tx.set(metaRef, { n: cur + 1, updatedAt: fs.serverTimestamp() }, { merge: true });
      return cur;
    });

    const display = String(no).padStart(3, "0");
    return `A-${display}`;
  }

  // =========================
  // Recipes
  // =========================
  async function upsertRecipe(recipe) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;

    const id = recipe.id || `r_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const ref = fs.doc(db, "rooms", roomId, "recipes", id);

    const data = {
      id,
      name: (recipe.name || "").trim(),
      category: (recipe.category || "ご飯").trim(),
      price: Number(recipe.price) || 0,
      image: recipe.image || "",
      steps: (recipe.steps || "").trim(),
      published: !!recipe.published,
      catCover: !!recipe.catCover,
      updatedAt: nowISO(),
      updatedAtServer: fs.serverTimestamp(),
    };

    await fs.setDoc(ref, data, { merge: true });
    return data;
  }

  async function deleteRecipe(id) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;
    const ref = fs.doc(db, "rooms", roomId, "recipes", id);
    await fs.deleteDoc(ref);
  }

  async function subscribeRecipes(onChange) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;

    const q = fs.query(
      fs.collection(db, "rooms", roomId, "recipes"),
      fs.orderBy("updatedAt", "desc")
    );

    return fs.onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data()).filter(Boolean);
      onChange(list);
    });
  }

  function getMenuItemsFromRecipes(recipes) {
    return (recipes || [])
      .filter((r) => r && r.published && r.name)
      .map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category || "ご飯",
        price: Number(r.price) || 0,
        image: r.image || "",
        updatedAt: r.updatedAt || "",
      }));
  }

  // =========================
  // Orders
  // =========================
  async function createOrderFromCart(cart) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;

    const items = Array.isArray(cart) ? cart : [];
    if (!items.length) return null;

    const orderNo = await getNextOrderNo(roomId);

    const order = {
      no: orderNo,
      time: new Date().toTimeString().slice(0, 5),
      createdAt: nowISO(),
      createdAtServer: fs.serverTimestamp(),
      status: "received",
      note: items.map((x) => x.note).filter(Boolean).join(" / ") || "",
      items: items.map((x) => ({
        recipeId: x.recipeId || "",
        name: x.name || "",
        qty: Number(x.qty) || 1,
        price: Number(x.price) || 0,
      })),
    };

    const ref = await fs.addDoc(fs.collection(db, "rooms", roomId, "orders"), order);
    return { id: ref.id, ...order };
  }

  async function updateOrderStatus(orderId, status) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;
    const ref = fs.doc(db, "rooms", roomId, "orders", orderId);
    await fs.updateDoc(ref, { status, updatedAt: nowISO(), updatedAtServer: fs.serverTimestamp() });
  }

  async function deleteOrder(orderId) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;
    const ref = fs.doc(db, "rooms", roomId, "orders", orderId);
    await fs.deleteDoc(ref);
  }

  async function subscribeOrders(onChange) {
    await waitFirebaseReady();
    const roomId = escRoomId(ensureRoomId());
    const { db, fs } = window.__FB;

    const q = fs.query(
      fs.collection(db, "rooms", roomId, "orders"),
      fs.orderBy("createdAt", "desc")
    );

    return fs.onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(Boolean);
      onChange(list);
    });
  }

  // 公開API
  window.SharedDB = {
    ensureRoomId,
    getRoomId,
    setRoomId,

    // recipes
    upsertRecipe,
    deleteRecipe,
    subscribeRecipes,
    getMenuItemsFromRecipes,

    // orders
    createOrderFromCart,
    subscribeOrders,
    updateOrderStatus,
    deleteOrder,
  };
})();