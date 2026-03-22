import { API_KEY } from './config.js';

const API_URL = "https://8vuyfkgugj.microcms.io/api/v1/news";

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
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      headers: { "X-MICROCMS-API-KEY": API_KEY },
    });
    if (!res.ok) throw new Error('Failed to fetch detail');
    return await res.json();
  } catch (error) {
    console.error('Error fetching detail:', error);
    return null;
  }
}

// 現在のURLからIDを取得 (例: ?id=123)
const params = new URLSearchParams(window.location.search);
const newsId = params.get('id');

// 言語切り替えボタンの要素を取得
const langBtn = document.querySelector('.js-lang');

if (langBtn && newsId) {
  // 現在の言語(lang)に応じて、反対の言語のURLを生成する
  // lang が "ja" なら "en" へ、そうでなければ "ja" へ
  const targetLang = lang === "ja" ? "en" : "ja";
  
  langBtn.href = `/${targetLang}/news/detail.html?id=${newsId}`;
}

// --- 一覧表示 ---
async function renderNews() {
  const list = document.getElementById("news-list");
  if (!list) return;

  const news = await fetchNews();

  if (news.length === 0) {
    const message = lang === "ja" ? "お知らせはありません。" : "No news available.";
    list.innerHTML = `<li class="c-empty">${message}</li>`;
    return;
  }

  const isTopPage = location.pathname.match(/\/(ja|en)\/(index\.html)?$/);
  const displayNews = isTopPage ? news.slice(0, 5) : news;

  displayNews.forEach((item) => {
    const pubDate = new Date(item.publishedAt);
    const displayDate = pubDate.toLocaleDateString('ja-JP').replace(/\//g, '.');
    const isoDate = pubDate.toISOString().split('T')[0];

    // 一覧でのタイトル判定
    let title;
    if (lang === "ja") {
      title = item.title_ja || "（タイトル未設定）";
    } else {
      // 英語ページ：タイトルと本文両方あれば英語、なければ日本語を添える（運用者に気づかせる）
      const hasEnglish = !!(item.title_en?.trim() && item.body_en?.trim());
      title = hasEnglish ? item.title_en : `[JP] ${item.title_ja}`;
    }

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
  const thumbnailElem = document.getElementById("news-thumbnail");
  
  if (!titleElem || !bodyElem) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;

  const data = await fetchDetail(id);
  if (!data) {
    titleElem.textContent = lang === "ja" ? "記事が見つかりません" : "Article not found";
    bodyElem.innerHTML = lang === "ja" 
    ? '<p>お探しの記事は削除されたか、URLが間違っている可能性があります。</p>' 
    : '<p>The article might have been deleted or the URL is incorrect.</p>';
    return;
  }

  // ★ 判定ロジック：言語ごとのタイトルと本文の決定
  let title, body;
  if (lang === "ja") {
    title = data.title_ja;
    body = data.body_ja;
  } else {
    const hasTitle = !!data.title_en?.trim();
    const hasBody = !!data.body_en?.trim();

    if (hasTitle && hasBody) {
      title = data.title_en;
      body = data.body_en;
    } else if (!hasTitle && !hasBody) {
      // 両方空：準備中メッセージ
      title = "English content is currently under preparation.";
      body = `<p>We apologize for the inconvenience. The English version of this article is currently being prepared.<br>Please check back later or view the <a class="c-link" href="/ja/news/detail.html?id=${data.id}">Japanese version</a>.</p>`;
    } else {
      // 片方だけ入力がある場合（運用ミスなどのフォールバック）
      title = hasTitle ? data.title_en : "English Title: Under Preparation";
      body = hasBody ? data.body_en : `<p>English content is currently under preparation. Please refer to the <a class="c-link" href="/ja/news/detail.html?id=${data.id}">Japanese page</a> for details.</p>`;
    }
  }

  const pubDate = new Date(data.publishedAt);
  const displayDate = pubDate.toLocaleDateString('ja-JP').replace(/\//g, '.');
  const isoDate = pubDate.toISOString().split('T')[0];

  dateElem.textContent = displayDate;
  dateElem.setAttribute("datetime", isoDate);
  titleElem.textContent = title;
  bodyElem.innerHTML = body;

  if (thumbnailElem && data.thumbnail) {
    thumbnailElem.src = data.thumbnail.url;
    thumbnailElem.alt = title;
    thumbnailElem.width = data.thumbnail.width;
    thumbnailElem.height = data.thumbnail.height;
  } else if (thumbnailElem) {
    thumbnailElem.style.display = 'none';
  }

  updateMetaTags(data, title, body, pubDate);
}

function updateMetaTags(data, title, body, pubDate) {
  const currentUrl = window.location.href;
  const description = body.replace(/<[^>]*>/g, '').substring(0, 150) + '...'; // HTMLタグ除去して150文字
  const imageUrl = data.thumbnail ? data.thumbnail.url : '';

  // Title
  document.title = `${title} | STEP`;

  // Description
  setMetaTag('name', 'description', description);

  // Open Graph
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', imageUrl);
  setMetaTag('property', 'og:url', currentUrl);
  setMetaTag('property', 'og:type', 'article');
  setMetaTag('property', 'article:published_time', pubDate.toISOString());
  setMetaTag('property', 'article:modified_time', data.updatedAt);

  // Twitter Card
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', imageUrl);

  // Canonical
  setLinkTag('rel', 'canonical', currentUrl);

  // Structured Data (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title,
    "description": description,
    "image": imageUrl ? [imageUrl] : [],
    "datePublished": pubDate.toISOString(),
    "dateModified": data.updatedAt,
    "author": {
      "@type": "Organization",
      "name": "STEP"
    },
    "publisher": {
      "@type": "Organization",
      "name": "STEP"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": currentUrl
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

function setMetaTag(attr, value, content) {
  let meta = document.querySelector(`meta[${attr}="${value}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, value);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function setLinkTag(attr, value, href) {
  let link = document.querySelector(`link[${attr}="${value}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute(attr, value);
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

// 実行
renderNews();
renderDetail();
