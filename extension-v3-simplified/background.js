const WEB_APP_BASE = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "capture-product",
    title: "Capture with Rolodex", 
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "capture-product") {
    const webAppUrl = `${WEB_APP_BASE}/capture?` +
      `image=${encodeURIComponent(info.srcUrl)}&` +
      `source=${encodeURIComponent(tab.url)}&` +
      `title=${encodeURIComponent(tab.title)}`;
    
    chrome.tabs.create({ url: webAppUrl });
  }
});