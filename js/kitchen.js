// ./js/kitchen.js
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const ordersEl = $("#orders");
  const emptyEl  = $("#kEmpty");

  if (!ordersEl || !emptyEl) {
    console.warn("[kitchen.js] #orders または #kEmpty が見つかりません");
    return;
  }

  let latestOrders = [];

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusLabel(s) {
    if (s === "cooking") return "調理中";
    if (s === "done")    return "完成";
    return "受付";
  }

  function nextStatus(s) {
    if (s === "received") return "cooking";
    if (s === "cooking")  return "done";
    return "received";
  }

  function render() {
    const list = latestOrders || [];
    ordersEl.innerHTML = "";

    if (!list.length) {
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    list.forEach((o) => {
      const card = document.createElement("section");
      card.className = "order";
      card.dataset.id = o.id || "";

      const itemsHtml = (o.items || [])
        .map((x) => `<li>${escapeHtml(x.name)} × ${Number(x.qty) || 1}</li>`)
        .join("");

      card.innerHTML = `
        <div class="order__head">
          <div class="order__no">${escapeHtml(o.no || "A-000")}</div>
          <div class="order__time">${escapeHtml(o.time || "")}</div>
        </div>

        <div class="order__body">
          <ul class="order__items">${itemsHtml || "<li>（注文内容なし）</li>"}</ul>
          <div class="order__note">要望：${escapeHtml(o.note || "（なし）")}</div>

          <div class="order__footer">
            <span class="badge">${statusLabel(o.status)}</span>

            <div class="btns">
              <button class="btn btn--dark js-status" type="button">状態切替</button>
              <button class="btn btn--danger js-del" type="button">削除</button>
            </div>
          </div>
        </div>
      `;

      ordersEl.appendChild(card);
    });
  }

  ordersEl.addEventListener("click", async (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLElement)) return;

    const card = btn.closest(".order");
    if (!card) return;

    const id = card.dataset.id;
    if (!id) return;

    const cur = latestOrders.find((x) => x.id === id);
    if (!cur) return;

    if (btn.classList.contains("js-status")) {
      const ns = nextStatus(cur.status);
      await window.SharedDB.updateOrderStatus(id, ns);
      return;
    }

    if (btn.classList.contains("js-del")) {
      if (!confirm("この注文を削除しますか？")) return;
      await window.SharedDB.deleteOrder(id);
      return;
    }
  });

  async function boot(){
    window.SharedDB.ensureRoomId();
    await window.SharedDB.subscribeOrders((orders) => {
      latestOrders = orders || [];
      render();
    });
    render();
  }

  boot();
})();