(async () => {
  try {
    const cfg = new RolodexConfig();
    const href = await cfg.getWebAppUrl();
    const a = document.getElementById('open-app');
    if (a && href) {
      a.href = href;
      a.textContent = 'Open Rolodex Web App';
    }
  } catch (e) {
    console.error('Rolodex popup: failed to resolve web app URL', e);
  }
})();

