// ./js/index.js
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);

  const grid = $("#menuGrid");
  const empty = $("#menuEmpty");
  const totalEl = $("#bottomTotal");
  const countEl = $("#cartCount");
  const tabMenuBtn = $("#tabMenu");

  const HERO_URL = "./images/home-cafe-hero.png";
  let sortMode = "popular";
  let latestRecipes = [];

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function makeNoImage(){
    const div = document.createElement("div");
    div.className = "no-image";
    div.textContent = "NO IMAGE";
    return div;
  }

  function setHero(){
    const img = $("#heroImg");
    if (!img) return;

    img.src = HERO_URL;
    img.onerror = () => img.replaceWith(makeNoImage());
  }

  function updateBottom(){
    totalEl.textContent = String(window.AppStorage.cartTotal());
    countEl.textContent = String(window.AppStorage.cartCount());
  }

  function sortItems(items){
    const a = [...items];

    if (sortMode === "added"){
      return a.sort((x,y) => (y.updatedAt||"").localeCompare(x.updatedAt||""));
    }
    if (sortMode === "az"){
      return a.sort((x,y) => (x.name||"").localeCompare(y.name||"", "ja"));
    }
    return a.sort((x,y) => (y.updatedAt||"").localeCompare(x.updatedAt||""));
  }

  function render(){
    const selected = window.AppStorage.getSelectedCategory();
    const menuItems = window.SharedDB.getMenuItemsFromRecipes(latestRecipes);

    const filtered = selected ? menuItems.filter(x => x.category === selected) : menuItems;
    const items = sortItems(filtered);

    grid.innerHTML = "";

    if(items.length === 0){
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    items.forEach(m => {
      const card = document.createElement("article");
      card.className = "card";

      const photoHTML = m.image
        ? `<img class="card__img" src="${m.image}" alt="${escapeHtml(m.name)}">`
        : `<div class="no-image">NO IMAGE</div>`;

      card.innerHTML = `
        <div class="card__photo">${photoHTML}</div>
        <div class="card__footer">
          <div class="card__name">${escapeHtml(m.name)}</div>
          <div class="card__price">${m.price}円</div>
          <div class="card__sub">カテゴリ：${escapeHtml(m.category)}</div>

          <div class="card__actions">
            <button class="btn btn--mint btn--wide" type="button">カートに追加</button>
          </div>
        </div>
      `;

      const img = card.querySelector(".card__img");
      if (img) img.onerror = () => img.replaceWith(makeNoImage());

      card.querySelector("button").addEventListener("click", () => {
        let qty = parseInt(prompt(`数量（1〜5）\n${m.name}`, "1") || "1", 10);
        if(!Number.isFinite(qty)) qty = 1;
        qty = Math.max(1, Math.min(5, qty));

        const note = prompt("要望（空でOK）", "") ?? "";
        window.AppStorage.addToCart(m, qty, note);
        updateBottom();
      });

      grid.appendChild(card);
    });
  }

  if(tabMenuBtn){
    tabMenuBtn.addEventListener("click", () => {
      window.AppStorage.setSelectedCategory("");
      render();
    });
  }

  document.querySelectorAll(".sort__btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sort__btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      sortMode = btn.dataset.sort || "popular";
      render();
    });
  });

  async function boot(){
    // ルームコード確定（2人で同じの入れる）
    window.SharedDB.ensureRoomId();

    // recipes購読→リアルタイム反映
    await window.SharedDB.subscribeRecipes((recipes) => {
      latestRecipes = recipes || [];
      render();
    });

    setHero();
    updateBottom();
  }

  boot();
})();