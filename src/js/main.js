const API_URL = "https://8vuyfkgugj.microcms.io/api/v1/news";
const API_KEY = "Sf2eEr7xvFuODPHoCJEQTkc7DuZLi0kRUz76";

// 共通：言語判定
const lang = location.pathname.includes("/en") ? "en" : "ja";

async function fetchNews() {
  const res = await fetch(API_URL, {
    headers: { "X-MICROCMS-API-KEY": API_KEY },
  });
  const data = await res.json();
  return data.contents;
}

async function fetchDetail(id) {
  const res = await fetch(`${API_URL}/${id}`, {
    headers: { "X-MICROCMS-API-KEY": API_KEY },
  });
  return await res.json();
}

// --- 一覧表示 ---
async function renderNews() {
  const list = document.getElementById("news-list");
  if (!list) return; // 要素がないページ（詳細ページなど）では何もしない

  const news = await fetchNews();

  // 1. 記事が1件もない場合の処理
  if (news.length === 0) {
    const message = lang === "ja" ? "お知らせはありません。" : "No news available.";
    list.innerHTML = `<li class="c-empty">${message}</li>`;
    return;
  }

  // パスが "/ja/" または "/en/" で終わる、もしくは直後に "index.html" が来る場合のみトップとみなす
  const isTopPage = location.pathname.match(/\/(ja|en)\/(index\.html)?$/);

  // トップページなら5件、それ以外（ニュース一覧ページなど）なら全件
  const displayNews = isTopPage ? news.slice(0, 5) : news;

  displayNews.forEach((item) => {
    // 1. 公開日をオブジェクト化
    const pubDate = new Date(item.publishedAt);
    
    // 見た目用（2026.03.21）
    const displayDate = pubDate.toLocaleDateString('ja-JP').replace(/\//g, '.');
    
    // 属性用（2026-03-21）
    const isoDate = pubDate.toISOString().split('T')[0];

    const title = lang === "ja" ? item.title_ja : item.title_en;

    const li = document.createElement("li");
    li.innerHTML = `
      <a href="/${lang}/news/detail.html?id=${item.id}">
        <time datetime="${isoDate}">${displayDate}</time>
        <span>${title}</span>
      </a>
    `;
    list.appendChild(li);
  });
}

// --- 詳細表示 ---
async function renderDetail() {
  const titleElem = document.getElementById("news-title");
  const bodyElem = document.getElementById("news-body");
  const dateElem = document.getElementById("news-date");
  
  // 必須要素がない場合は実行しない
  if (!titleElem || !bodyElem) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;

  const data = await fetchDetail(id);

  // 日付の整形
  const pubDate = new Date(data.publishedAt);
  const displayDate = pubDate.toLocaleDateString('ja-JP').replace(/\//g, '.');
  const isoDate = pubDate.toISOString().split('T')[0];

  // 画面に反映（タイトル・本文は多言語対応）
  dateElem.textContent = displayDate;
  dateElem.setAttribute("datetime", isoDate);
  titleElem.textContent = lang === "ja" ? data.title_ja : data.title_en;
  bodyElem.innerHTML = lang === "ja" ? data.body_ja : data.body_en;
}

// 実行
renderNews();
renderDetail();
