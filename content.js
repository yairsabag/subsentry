let isDismissed = false; 
const subKeywords = ['subscription', 'subscribe', 'membership', 'monthly', 'annually', 'plan', 'billing', 'recurring', 'upgrade', 'pricing', 'server', 'credits'];
const categories = ['Streaming', 'AI Tools', 'Software', 'Hosting', 'Gaming', 'Fitness', 'Other'];

function isSubscriptionContext() {
    const pageText = document.body.innerText.toLowerCase();
    const url = window.location.href.toLowerCase();
    const hasKeyword = subKeywords.some(keyword => pageText.includes(keyword) || url.includes(keyword));
    const hasPaymentElements = ['input[autocomplete*="cc-"]', 'input[name*="cardnumber"]', '[role="dialog"]', '.modal'].some(s => document.querySelector(s) !== null);
    return hasKeyword || hasPaymentElements;
}

function findBestPrice(text) {
    // רג'קס מורחב לכל המטבעות החדשים
    const priceRegex = /((?:[\$\u00A2-\u00A5\u058F\u060B\u09F2\u09F3\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6]|USD|ILS|EUR|GBP|₪|JPY|CHF|CAD|AUD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(?:[\$\u00A2-\u00A5\u058F\u060B\u09F2\u09F3\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6]|USD|ILS|EUR|GBP|₪|JPY|CHF|CAD|AUD))/gi;
    const matches = [...text.matchAll(priceRegex)];
    if (matches.length === 0) return null;
    let lowestPriceValue = Infinity;
    let bestPriceStr = null;
    for (const match of matches) {
        const valStr = match[2] || match[3];
        const cleanValue = parseFloat(valStr.replace(/,/g, ''));
        if (cleanValue > 2 && cleanValue < lowestPriceValue) {
            lowestPriceValue = cleanValue;
            bestPriceStr = match[0];
        }
    }
    return bestPriceStr;
}

function scan() {
    if (isDismissed || document.getElementById('subsentry-alert')) return;
    if (!isSubscriptionContext()) return; 
    const selectedText = window.getSelection().toString();
    let priceToDisplay = selectedText ? findBestPrice(selectedText) : findBestPrice(document.body.innerText);
    if (priceToDisplay) createAlert(priceToDisplay);
}

function createAlert(price) {
    const alertDiv = document.createElement('div');
    alertDiv.id = 'subsentry-alert';
    Object.assign(alertDiv.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
        backgroundColor: '#1e293b', color: '#f8fafc', padding: '20px', borderRadius: '16px', 
        border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', width: '300px',
        fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: '12px'
    });

    let catOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    alertDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${chrome.runtime.getURL('icon.png')}" style="width:20px; height:20px;">
                <span style="font-weight:800; color:#8b5cf6;">SubSentry</span>
            </div>
            <button id="alert-close" style="background:none; border:none; color:#94a3b8; cursor:pointer;">✕</button>
        </div>
        <input type="text" id="price-edit" value="${price}" style="background:#0f172a; border:1px solid #334155; border-radius:8px; font-size:22px; font-weight:800; color:#06b6d4; padding:8px; width:100%; box-sizing:border-box;">
        <select id="cat-select" style="background:#0f172a; border:1px solid #334155; color:white; padding:8px; border-radius:8px;">${catOptions}</select>
        <input type="number" id="trial-input" placeholder="Trial days?" style="background:#0f172a; border:1px solid #334155; color:white; padding:8px; border-radius:8px;">
        <button id="save-sub" style="background:linear-gradient(135deg, #8b5cf6, #d946ef); color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:800;">Guard Subscription</button>
    `;

    document.body.appendChild(alertDiv);
    document.getElementById('alert-close').onclick = () => { isDismissed = true; alertDiv.remove(); };
    document.getElementById('save-sub').onclick = () => {
        const finalPrice = document.getElementById('price-edit').value;
        const category = document.getElementById('cat-select').value;
        const trialDays = document.getElementById('trial-input').value;
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = [...data.subscriptions, { 
                service: document.title.split('|')[0].trim(), price: finalPrice, category, trialDays, date: new Date().toLocaleDateString(), url: window.location.href 
            }];
            chrome.storage.local.set({ subscriptions: newList }, () => {
                alertDiv.innerHTML = '<div style="text-align:center; color:#10b981; font-weight:bold;">🛡️ Secured!</div>';
                setTimeout(() => alertDiv.remove(), 1500);
            });
        });
    };
}
setInterval(scan, 3000);