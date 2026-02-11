// ./js/cart.js
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);

  const list = $("#cartList");
  const empty = $("#cartEmpty");
  const totalEl = $("#cartTotal");
  const checkoutBtn = $("#checkoutBtn");

  if (!list || !empty || !totalEl || !checkoutBtn) {
    console.warn("[cart.js] 必要な要素が見つかりません");
    return;
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function render(){
    const cart = window.AppStorage.getCart();
    const total = window.AppStorage.cartTotal();

    totalEl.textContent = String(total);
    checkoutBtn.textContent = `注文確定（${total}円）`;

    list.innerHTML = "";

    if(cart.length === 0){
      empty.style.display = "block";
      list.style.display = "none";
      return;
    }
    empty.style.display = "none";
    list.style.display = "flex";

    cart.forEach(it => {
      const row = document.createElement("article");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item__thumb">
          ${it.image ? `<img src="${it.image}" alt="">` : "NO IMAGE"}
        </div>
        <div class="cart-item__body">
          <div class="cart-item__top">
            <div class="cart-item__name">${escapeHtml(it.name)}</div>
            <button class="chip chip--danger" type="button">削除</button>
          </div>

          <div class="cart-item__meta">
            <div class="cart-item__price">${Number(it.price)||0}円</div>
            <div class="qty">
              <button class="qty__btn" type="button">−</button>
              <div class="qty__num">${Number(it.qty)||1}</div>
              <button class="qty__btn" type="button">＋</button>
            </div>
          </div>

          <div class="cart-item__note" title="クリックで編集">
            <div class="cart-item__note-label">要望</div>
            <div class="cart-item__note-text">${it.note ? escapeHtml(it.note) : "（未入力）"}</div>
          </div>
        </div>
      `;

      const delBtn = row.querySelector(".chip--danger");
      const [minusBtn, plusBtn] = row.querySelectorAll(".qty__btn");
      const noteBox = row.querySelector(".cart-item__note");

      delBtn.addEventListener("click", () => {
        const next = window.AppStorage.getCart().filter(x => x.id !== it.id);
        window.AppStorage.setCart(next);
        render();
      });

      minusBtn.addEventListener("click", () => {
        const next = window.AppStorage.getCart().map(x => {
          if (x.id !== it.id) return x;
          const q = Math.max(1, (Number(x.qty)||1) - 1);
          return { ...x, qty: q };
        });
        window.AppStorage.setCart(next);
        render();
      });

      plusBtn.addEventListener("click", () => {
        const next = window.AppStorage.getCart().map(x => {
          if (x.id !== it.id) return x;
          const q = Math.min(5, (Number(x.qty)||1) + 1);
          return { ...x, qty: q };
        });
        window.AppStorage.setCart(next);
        render();
      });

      noteBox.addEventListener("click", () => {
        const nextNote = prompt("要望を入力（空で消す）", it.note || "");
        if(nextNote === null) return;
        const next = window.AppStorage.getCart().map(x => {
          if (x.id !== it.id) return x;
          return { ...x, note: (nextNote || "").trim() };
        });
        window.AppStorage.setCart(next);
        render();
      });

      list.appendChild(row);
    });
  }

  checkoutBtn.addEventListener("click", async () => {
    const cart = window.AppStorage.getCart();
    if (!cart.length) {
      alert("カートが空です");
      return;
    }
    if (!confirm("この内容で注文を確定しますか？")) return;

    try {
      // ルーム確定
      window.SharedDB.ensureRoomId();

      const order = await window.SharedDB.createOrderFromCart(cart);
      if (!order) {
        alert("注文作成に失敗しました");
        return;
      }

      window.AppStorage.setCart([]);
      sessionStorage.setItem("last_order_no", order.no);
      window.location.href = "./order-complete.html";
    } catch (e) {
      console.error(e);
      alert("Firebase通信に失敗しました。ネット接続とFirebase設定を確認してね。");
    }
  });

  render();
})();