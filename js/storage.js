// ./js/storage.js
(() => {
  "use strict";

  const KEY = {
    CART: "cart_items",
    SELECTED_CATEGORY: "moca_selected_category_v1",
  };

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw) ?? fallback; }
    catch { return fallback; }
  }
  function load(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? safeParse(raw, fallback) : fallback;
  }
  function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // =========================
  // Category selection
  // =========================
  function setSelectedCategory(cat) {
    localStorage.setItem(KEY.SELECTED_CATEGORY, cat || "");
  }
  function getSelectedCategory() {
    return localStorage.getItem(KEY.SELECTED_CATEGORY) || "";
  }

  // =========================
  // Cart（端末内だけ）
  // =========================
  function getCart() { return load(KEY.CART, []).filter(Boolean); }
  function setCart(list) { save(KEY.CART, Array.isArray(list) ? list : []); }
  function cartCount() { return getCart().reduce((n, x) => n + (x.qty || 0), 0); }
  function cartTotal() { return getCart().reduce((s, x) => s + (x.price || 0) * (x.qty || 0), 0); }

  function uid(p="id") {
    return `${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function addToCart(item, qty=1, note="") {
    qty = Math.max(1, Math.min(5, Number(qty) || 1));
    const cart = getCart();
    cart.push({
      id: uid("c"),
      recipeId: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image || "",   // ★あなたのcart.jsがit.imageを見るので入れる
      qty,
      note: note || "",
      addedAt: new Date().toISOString(),
    });
    setCart(cart);
    return cart;
  }

  function clearCart() {
    localStorage.removeItem(KEY.CART);
  }

  // 公開
  window.AppStorage = {
    KEY,
    // category
    setSelectedCategory, getSelectedCategory,
    // cart
    getCart, setCart, cartCount, cartTotal, addToCart, clearCart,
  };
})();