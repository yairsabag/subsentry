let isDismissed = false; 

function scan() {
    if (isDismissed || document.getElementById('subsentry-alert')) return;
    const bodyText = document.body.innerText.toLowerCase();
    const priceRegex = /([$₪£€])\s?(\d+(?:\.\d{2})?)/;
    const match = bodyText.match(priceRegex);
    if (match) createAlert(match[0]);
}

function createAlert(price) {
    const alertDiv = document.createElement('div');
    alertDiv.id = 'subsentry-alert';
    
    // עיצוב הבועה בסטייל Dark Premium
    Object.assign(alertDiv.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
        backgroundColor: '#1e293b', color: '#f8fafc', padding: '20px', 
        borderRadius: '16px', border: '1px solid #334155',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        fontFamily: "'Inter', sans-serif", width: '300px',
        display: 'flex', flexDirection: 'column', gap: '15px'
    });

    // Header עם האייקון
    const header = document.createElement('div');
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    header.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
            <img src="${chrome.runtime.getURL('icon.png')}" style="width:20px; height:20px; border-radius:4px;">
            <span style="font-weight:800; color:#8b5cf6; font-size:14px;">SubSentry</span>
        </div>
        <div style="display:flex; gap:10px;">
            <button id="alert-dash" style="background:#334155; border:1px solid #475569; color:white; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:12px;">📊</button>
            <button id="alert-close" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;">✕</button>
        </div>
    `;

    const info = document.createElement('div');
    info.innerHTML = `
        <div style="font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Price Detected</div>
        <div style="font-size:24px; font-weight:800; color:#06b6d4; margin-top:4px;">${price}</div>
    `;

    const input = document.createElement('input');
    input.placeholder = "Trial days? (Optional)";
    input.type = "number";
    input.style.cssText = "background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; color:white; font-size:13px;";

    const btn = document.createElement('button');
    btn.textContent = "Track & Save";
    btn.style.cssText = "background:linear-gradient(135deg, #8b5cf6, #d946ef); color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:800; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);";

    // לוגיקה
    alertDiv.appendChild(header);
    alertDiv.appendChild(info);
    alertDiv.appendChild(input);
    alertDiv.appendChild(btn);
    document.body.appendChild(alertDiv);

    document.getElementById('alert-dash').onclick = () => chrome.runtime.sendMessage({ action: "openDashboard" });
    document.getElementById('alert-close').onclick = () => { isDismissed = true; alertDiv.remove(); };

    btn.onclick = () => {
        const service = document.title.split('|')[0].trim();
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = [...data.subscriptions, { 
                service, price, trialDays: input.value, date: new Date().toLocaleDateString(), url: window.location.href 
            }];
            chrome.storage.local.set({ subscriptions: newList }, () => {
                if (input.value > 0) chrome.runtime.sendMessage({ action: "setAlarm", service, days: input.value });
                alertDiv.innerHTML = '<div style="text-align:center; padding:10px; color:#10b981; font-weight:bold;">🛡️ Subscription Guarded!</div>';
                setTimeout(() => alertDiv.remove(), 2000);
            });
        });
    };
}
setInterval(scan, 3000);