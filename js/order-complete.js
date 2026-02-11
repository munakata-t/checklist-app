(() => {
  "use strict";

  // cart.js で保存した番号を表示するだけ
  const el = document.getElementById("orderNumber");
  if (!el) return;

  const no = sessionStorage.getItem("last_order_no");
  if (!no){
    el.textContent = "—";
    return;
  }

  el.textContent = no;

  // 表示したら消してOK（任意）
  sessionStorage.removeItem("last_order_no");
})();
