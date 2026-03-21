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
  const thumbnailElem = document.getElementById("news-thumbnail");
  
  // 必須要素がない場合は実行しない
  if (!titleElem || !bodyElem) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;

  const data = await fetchDetail(id);
  if (!data) {
    // エラー表示
    titleElem.textContent = lang === "ja" ? "記事が見つかりません" : "Article not found";
    return;
  }

  // 日付の整形
  const pubDate = new Date(data.publishedAt);
  const displayDate = pubDate.toLocaleDateString('ja-JP').replace(/\//g, '.');
  const isoDate = pubDate.toISOString().split('T')[0];

  // 多言語対応のタイトルと本文
  const title = lang === "ja" ? data.title_ja : data.title_en;
  const body = lang === "ja" ? data.body_ja : data.body_en;

  // 画面に反映
  dateElem.textContent = displayDate;
  dateElem.setAttribute("datetime", isoDate);
  titleElem.textContent = title;
  bodyElem.innerHTML = body;

  // サムネイル表示
  if (thumbnailElem && data.thumbnail) {
    thumbnailElem.src = data.thumbnail.url;
    thumbnailElem.alt = title;
    thumbnailElem.width = data.thumbnail.width;
    thumbnailElem.height = data.thumbnail.height;

    // Preload thumbnail for better performance
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = data.thumbnail.url;
    document.head.appendChild(link);
  } else if (thumbnailElem) {
    thumbnailElem.style.display = 'none';
  }

  // SEO対策
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
