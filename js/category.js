// ./js/category.js
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const grid = $("#catGrid");
  const empty = $("#catEmpty");

  const CATEGORIES = ["ご飯", "パスタ", "デザート", "飲み物", "その他麺類", "サイドメニュー"];
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

  function getPopularityMap(recipes){
    const map = new Map();
    for (const c of CATEGORIES) map.set(c, 0);

    recipes.forEach(r => {
      const c = r.category || "";
      if (!CATEGORIES.includes(c)) return;
      if (r.published) map.set(c, (map.get(c)||0) + 1);
    });
    return map;
  }

  function pickCategoryCovers(recipes){
    const best = new Map();
    for (const c of CATEGORIES) best.set(c, null);

    for (const r of recipes){
      const c = r.category || "";
      if (!CATEGORIES.includes(c)) continue;
      if (!r.catCover) continue;
      if (!r.image) continue;

      const cur = best.get(c);
      if (!cur) best.set(c, r);
      else {
        const t1 = Date.parse(r.updatedAt || "") || 0;
        const t2 = Date.parse(cur.updatedAt || "") || 0;
        if (t1 >= t2) best.set(c, r);
      }
    }
    return best;
  }

  function sortedCategories(recipes){
    const pop = getPopularityMap(recipes);

    if (sortMode === "added") return [...CATEGORIES];
    if (sortMode === "az") return [...CATEGORIES].sort((a,b)=>a.localeCompare(b, "ja"));

    return [...CATEGORIES].sort((a,b)=>{
      const pa = pop.get(a)||0;
      const pb = pop.get(b)||0;
      if (pb !== pa) return pb - pa;
      return a.localeCompare(b, "ja");
    });
  }

  function makeAllCategoryCard(){
    const card = document.createElement("button");
    card.type = "button";
    card.className = "cat-card";
    card.setAttribute("aria-label", "全カテゴリーを表示");
    card.innerHTML = `
      <div class="cat-card__placeholder">ALL</div>
      <div class="cat-card__label">全カテゴリー</div>
    `;
    card.addEventListener("click", () => {
      window.AppStorage.setSelectedCategory("");
      location.href = "./index.html";
    });
    return card;
  }

  function render(){
    const covers = pickCategoryCovers(latestRecipes);
    const list = sortedCategories(latestRecipes);

    grid.innerHTML = "";
    grid.appendChild(makeAllCategoryCard());

    const hasAnyCover = list.some(c => {
      const r = covers.get(c);
      return r && r.image;
    });
    empty.style.display = hasAnyCover ? "none" : "block";

    list.forEach(cat => {
      const r = covers.get(cat);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "cat-card";
      card.setAttribute("aria-label", `${cat}を選択`);

      if (r && r.image){
        card.innerHTML = `
          <img class="cat-card__img" src="${r.image}" alt="${escapeHtml(cat)}">
          <div class="cat-card__label">${escapeHtml(cat)}</div>
        `;
        const img = card.querySelector("img");
        img.onerror = () => {
          card.innerHTML = `
            <div class="cat-card__placeholder">画像なし</div>
            <div class="cat-card__label">${escapeHtml(cat)}</div>
          `;
        };
      } else {
        card.innerHTML = `
          <div class="cat-card__placeholder">画像なし</div>
          <div class="cat-card__label">${escapeHtml(cat)}</div>
        `;
      }

      card.addEventListener("click", () => {
        window.AppStorage.setSelectedCategory(cat);
        location.href = "./index.html";
      });

      grid.appendChild(card);
    });
  }

  document.querySelectorAll(".cat-sort__btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-sort__btn").forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");
      sortMode = btn.dataset.sort || "popular";
      render();
    });
  });

  async function boot(){
    window.SharedDB.ensureRoomId();
    await window.SharedDB.subscribeRecipes((recipes) => {
      latestRecipes = recipes || [];
      render();
    });
    render();
  }

  boot();
})();