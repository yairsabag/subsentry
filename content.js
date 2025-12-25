function scanForSubscription() {
    const bodyText = document.body.innerText.toLowerCase();
    const url = window.location.href.toLowerCase();

    const intentKeywords = ['checkout', 'subscribe', 'payment', 'card number', 'billing', 'pay now', 'תשלום', 'אשראי', 'מנוי'];
    const hasIntent = intentKeywords.some(keyword => bodyText.includes(keyword) || url.includes(keyword));

    if (!hasIntent) return;

    const priceRegex = /([$₪£€])\s?(\d+(?:\.\d{2})?)/;
    const match = bodyText.match(priceRegex);

    if (match) {
        const price = match[0];
        const serviceName = document.title.split('|')[0].split('-')[0].trim() || "Subscription";
        showNotification(serviceName, price);
    }
}

function showNotification(service, price) {
    if (document.getElementById('subsentry-alert')) return;

    const alertDiv = document.createElement('div');
    alertDiv.id = 'subsentry-alert';
    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; direction: ltr; text-align: left;">
            <span style="font-size: 24px;">🛡️</span>
            <div style="flex-grow: 1;">
                <div style="font-weight: bold; color: #111827; font-size: 14px;">SubSentry: Track this sub?</div>
                <div style="color: #4b5563; font-size: 13px;">${service}: <b>${price}</b></div>
            </div>
            <button id="saveSub" style="background: #4F46E5; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">Track</button>
            <button id="closeSub" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px;">✕</button>
        </div>
    `;

    Object.assign(alertDiv.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
        backgroundColor: 'white', padding: '15px', borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb',
        fontFamily: 'system-ui, sans-serif', width: '320px'
    });

    document.body.appendChild(alertDiv);
    document.getElementById('closeSub').onclick = () => alertDiv.remove();
    document.getElementById('saveSub').onclick = () => {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = [...data.subscriptions, { service, price, date: new Date().toLocaleDateString() }];
            chrome.storage.local.set({ subscriptions: newList }, () => {
                alertDiv.innerHTML = '<div style="color: #059669; font-weight: bold; text-align: center;">✅ Subscription Tracked!</div>';
                setTimeout(() => alertDiv.remove(), 2000);
            });
        });
    };
}

scanForSubscription();
setTimeout(scanForSubscription, 3000);