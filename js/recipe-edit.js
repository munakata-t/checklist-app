(() => {
  "use strict";

  const qs = new URL(location.href).searchParams;
  const id = qs.get("id");

  const $ = (s) => document.querySelector(s);

  const nameEl = $("#rName");
  const imageEl = $("#rImage");
  const fileEl = $("#rFile");
  const previewEl = $("#rPreview");

  const catEl = $("#rCategory");
  const timeEl = $("#rTime");
  const tagsEl = $("#rTags");
  const priceEl = $("#rPrice");
  const pubEl = $("#rPublished");
  const catCoverEl = $("#rCatCover"); // ✅ 追加
  const memoEl = $("#rMemo");

  const ingList = $("#ingList");
  const stepList = $("#stepList");

  const addIngBtn = $("#addIngBtn");
  const addStepBtn = $("#addStepBtn");
  const saveBtn = $("#saveRecipeBtn");
  const delBtn = $("#deleteRecipeBtn");
  const stateEl = $("#saveState");

  function rowInput(placeholder, value = "") {
    const wrap = document.createElement("div");
    wrap.className = "list__row";
    wrap.innerHTML = `
      <input class="field__input" type="text" placeholder="${placeholder}">
      <button class="chip chip--danger" type="button">削除</button>
    `;
    wrap.querySelector("input").value = value;
    wrap.querySelector("button").addEventListener("click", () => wrap.remove());
    return wrap;
  }

  function stepInput(no, value = "") {
    const wrap = document.createElement("div");
    wrap.className = "step";
    wrap.innerHTML = `
      <div class="step__no">${no}</div>
      <textarea class="field__input field__textarea" placeholder="手順を書く"></textarea>
      <button class="chip chip--danger" type="button">削除</button>
    `;
    wrap.querySelector("textarea").value = value;
    wrap.querySelector("button").addEventListener("click", () => {
      wrap.remove();
      renumberSteps();
    });
    return wrap;
  }

  function renumberSteps() {
    Array.from(stepList.querySelectorAll(".step")).forEach((el, i) => {
      el.querySelector(".step__no").textContent = String(i + 1);
    });
  }

  function load() {
    if (!id) return null;
    return window.AppStorage.getRecipes().find((r) => r.id === id) || null;
  }

  function setPreview(src) {
    previewEl.src = src || "";
    previewEl.style.display = src ? "block" : "none";
  }

  function fill(r) {
    if (!r) {
      ingList.appendChild(rowInput("例：卵 2個"));
      stepList.appendChild(stepInput(1));
      setPreview("");
      catCoverEl.checked = false;
      return;
    }

    nameEl.value = r.name || "";
    imageEl.value = r.image || "";
    catEl.value = r.category || "ご飯";
    timeEl.value = r.time || "";
    tagsEl.value = (r.tags || []).join(", ");
    priceEl.value = String(r.price || 0);
    pubEl.checked = !!r.published;
    catCoverEl.checked = !!r.catCover; // ✅ 追加
    memoEl.value = r.memo || "";

    (r.ingredients || [""]).forEach((v) => ingList.appendChild(rowInput("例：卵 2個", v)));
    (r.steps || [""]).forEach((v, i) => stepList.appendChild(stepInput(i + 1, v)));
    renumberSteps();

    setPreview(r.image || "");
  }

  function collect() {
    const tags = (tagsEl.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ingredients = Array.from(ingList.querySelectorAll("input"))
      .map((x) => x.value.trim())
      .filter(Boolean);

    const steps = Array.from(stepList.querySelectorAll("textarea"))
      .map((x) => x.value.trim())
      .filter(Boolean);

    return {
      id: id || undefined,
      name: (nameEl.value || "").trim(),
      image: imageEl.value || "",
      category: (catEl.value || "ご飯").trim(),
      time: (timeEl.value || "").trim(),
      tags,
      price: Number(priceEl.value) || 0,
      published: !!pubEl.checked,
      catCover: !!catCoverEl.checked, // ✅ 追加
      ingredients,
      steps,
      memo: memoEl.value || "",
    };
  }

  addIngBtn.addEventListener("click", () => {
    ingList.appendChild(rowInput("例：卵 2個"));
  });

  addStepBtn.addEventListener("click", () => {
    stepList.appendChild(stepInput(stepList.querySelectorAll(".step").length + 1));
    renumberSteps();
  });

  fileEl.addEventListener("change", async () => {
    const file = fileEl.files && fileEl.files[0];
    if (!file) return;

    try {
      const dataUrl = await compressImageToDataURL(file, 900, 0.75);
      imageEl.value = dataUrl;
      setPreview(dataUrl);
      stateEl.textContent = "未保存";
    } catch (e) {
      console.error(e);
      alert("画像の読み込みに失敗しました");
    }
  });

  imageEl.addEventListener("change", () => {
    const v = imageEl.value.trim();
    setPreview(v);
    stateEl.textContent = "未保存";
  });

  saveBtn.addEventListener("click", () => {
    const data = collect();
    if (!data.name) {
      alert("レシピ名を入力してください");
      return;
    }

    try {
      window.AppStorage.upsertRecipe(data);
      stateEl.textContent = "保存済み";
      alert("保存しました");
      location.href = "./recipes.html";
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました（画像が大きすぎる可能性があります）");
    }
  });

  delBtn.addEventListener("click", () => {
    if (!id) {
      alert("まだ保存されていません");
      return;
    }
    if (!confirm("このレシピを削除しますか？")) return;
    window.AppStorage.deleteRecipe(id);
    alert("削除しました");
    location.href = "./recipes.html";
  });

  function compressImageToDataURL(file, maxSize = 900, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round(height * (maxSize / width));
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round(width * (maxSize / height));
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const out = canvas.toDataURL("image/jpeg", quality);
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  fill(load());
})();
