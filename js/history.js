// ./js/history.js
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);

  const listEl  = $("#historyList");
  const emptyEl = $("#historyEmpty");

  if (!listEl || !emptyEl) {
    console.warn("[history.js] #historyList または #historyEmpty が見つかりません");
    return;
  }

  let latestOrders = [];

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function render(){
    const orders = latestOrders || [];
    listEl.innerHTML = "";

    if (!orders.length){
      emptyEl.style.display = "block";
      listEl.style.display = "none";
      return;
    }

    emptyEl.style.display = "none";
    listEl.style.display = "block";

    orders.forEach(order => {
      const block = document.createElement("section");
      block.className = "day-block";

      const items = (order.items || [])
        .map(it => `<li>${escapeHtml(it.name)} × ${Number(it.qty) || 1}</li>`)
        .join("");

      block.innerHTML = `
        <div class="history-order">
          <div class="history-head">
            <span>${escapeHtml(order.no || "A-000")}</span>
            <span>${escapeHtml(order.time || "")}</span>
          </div>
          <ul>${items || "<li>（注文内容なし）</li>"}</ul>
        </div>
      `;

      listEl.appendChild(block);
    });
  }

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