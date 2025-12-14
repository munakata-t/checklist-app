const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const list = document.getElementById("taskList");

const templateSelect = document.getElementById("templateSelect");
const applyTemplateBtn = document.getElementById("applyTemplateBtn");

// テンプレ定義
const TEMPLATES = {
  out: [
    "外観チェック（割れ・欠け）",
    "数量・品番確認",
    "付属品確認",
    "動作確認",
    "積み込み固定"
  ],
  return: [
    "数量・品番確認",
    "破損・欠品の確認",
    "付属品確認",
    "返却伝票の確認",
    "置き場へ戻す"
  ],
  clean: [
    "大きな汚れを除去",
    "拭き上げ（取っ手・操作部）",
    "ゴミ/異物の確認",
    "乾燥・水気確認",
    "清掃完了報告"
  ],
  fork: [
    "タイヤ空気圧/損傷",
    "フォーク爪の損傷",
    "ライト/警告灯",
    "ブレーキ確認",
    "異音・油漏れ確認"
  ],
  washer: [
    "電源/非常停止",
    "水位・水漏れ確認",
    "フィルター清掃",
    "異音・振動確認",
    "周辺安全確認"
  ],
  end: [
    "戸締まり確認",
    "火気/電源OFF",
    "整理整頓（通路確保）",
    "廃棄物の処理",
    "日報/引継ぎ"
  ]
};

// いま開いているテンプレ（＝いまのリスト）
let currentTemplateKey = ""; // 例: "out"

// テンプレごとに保存先を分ける
function storageKeyFor(key) {
  return `checklist_items_v1__${key}`;
}

// ---------- 保存 / 読み込み ----------
function saveItems(key, items) {
  localStorage.setItem(storageKeyFor(key), JSON.stringify(items));
}

function loadItems(key) {
  try {
    const raw = localStorage.getItem(storageKeyFor(key));
    if (!raw) return null; // ←保存が無い
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// UIから現在の状態を配列にする
function collectItemsFromUI() {
  return Array.from(list.querySelectorAll("li")).map((li) => {
    const checkbox = li.querySelector('input[type="checkbox"]');
    const span = li.querySelector("span");
    return {
      text: span?.textContent ?? "",
      checked: Boolean(checkbox?.checked)
    };
  });
}

// UI更新
function renderList(items) {
  list.innerHTML = "";
  for (const item of items) {
    if (!item?.text) continue;
    createItem(item.text, Boolean(item.checked));
  }
  updateProgress();
}

// UIが変わったら即保存（テンプレ別）
function persist() {
  if (!currentTemplateKey) return;
  const items = collectItemsFromUI();
  saveItems(currentTemplateKey, items);
  updateProgress();
}

// 進捗
function updateProgress() {
  const items = collectItemsFromUI();
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const bar = document.getElementById("progressBar");
  const text = document.getElementById("progressText");
  if (bar) bar.value = percent;
  if (text) text.textContent = `完了率: ${percent}%（${done}/${total}）`;
}

// ---------- 重複防止 ----------
function getExistingTexts() {
  return new Set(
    Array.from(list.querySelectorAll("li span")).map((span) => span.textContent)
  );
}

// ---------- UI生成 ----------
function createItem(text, checked = false) {
  const li = document.createElement("li");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;

  const span = document.createElement("span");
  span.textContent = text;

  function applyStyle() {
    if (checkbox.checked) {
      span.style.textDecoration = "line-through";
      span.style.color = "#888";
    } else {
      span.style.textDecoration = "none";
      span.style.color = "#000";
    }
  }

  checkbox.addEventListener("change", () => {
    applyStyle();
    persist();
  });

  li.appendChild(checkbox);
  li.appendChild(span);
  list.appendChild(li);

  applyStyle();
}

// 1件追加（重複防止＋保存）
function addSingle(text) {
  const t = text.trim();
  if (t === "") return;
  if (!currentTemplateKey) return;

  const existing = getExistingTexts();
  if (existing.has(t)) return;

  createItem(t, false);
  persist();
}

// ---------- テンプレ切り替えの核心 ----------
// 選んだテンプレの「保存データがあればそれを表示」
// 無ければ「テンプレ初期項目を表示して保存」する
function openTemplate(key) {
  if (!key) return;

  currentTemplateKey = key;

  const saved = loadItems(key);
  if (saved) {
    renderList(saved);
    return;
  }

  // 保存がない＝初回。テンプレ初期項目で作る
  const base = (TEMPLATES[key] || []).map((t) => ({ text: t, checked: false }));
  saveItems(key, base);
  renderList(base);
}

// ---------- 起動時 ----------
(function init() {
  // 初期表示：まず select の値が入っていればそれを開く。
  // 空なら、とりあえず "out" を初期にする（好きなら変えてOK）
  const initial = templateSelect.value || "out";
  templateSelect.value = initial;
  openTemplate(initial);
})();

// ---------- イベント ----------
addBtn.addEventListener("click", () => {
  addSingle(input.value);
  input.value = "";
});

// 「テンプレ投入」ボタンは「そのテンプレに切り替える」動きにする
applyTemplateBtn.addEventListener("click", () => {
  const key = templateSelect.value;
  if (!key) return;
  openTemplate(key);
});

// 選んだだけで即切り替えたいなら、これを有効化（好み）
// templateSelect.addEventListener("change", () => {
//   const key = templateSelect.value;
//   if (!key) return;
//   openTemplate(key);
// });

clearBtn.addEventListener("click", () => {
  if (!currentTemplateKey) return;

  const ok = confirm("全ての項目を削除します。よろしいですか？");
  if (!ok) return;

  list.innerHTML = "";
  localStorage.removeItem(storageKeyFor(currentTemplateKey));
  updateProgress();
});
