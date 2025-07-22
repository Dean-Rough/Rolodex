// background.js – Rolodex Chrome Extension
// Adds a context menu to images and sends a message when clicked

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "rolodex-save-image",
    title: "Save to MyLibrary",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "rolodex-save-image") {
    // Send image URL to backend API
    fetch("http://localhost:8000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ img_url: info.srcUrl })
    })
      .then(res => res.json())
      .then(data => {
        console.log("Rolodex: Image saved", data);
      })
      .catch(err => {
        console.error("Rolodex: Error saving image", err);
      });
  }
}); 