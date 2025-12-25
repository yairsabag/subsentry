let isDismissed = false; // משתנה שמונע מההתראה לחזור אחרי שטיפלנו בה

function scan() {
    // אם כבר סגרנו את ההתראה או שמרנו, או שהיא כבר מוצגת - אל תעשה כלום
    if (isDismissed || document.getElementById('subsentry-alert')) return;

    console.log("SubSentry: Scanning page...");
    const bodyText = document.body.innerText.toLowerCase();
    const priceRegex = /([$₪£€])\s?(\d+(?:\.\d{2})?)/;
    const match = bodyText.match(priceRegex);

    if (match) {
        console.log("🎯 SubSentry found price:", match[0]);
        createAlert(match[0]);
    }
}

function createAlert(price) {
    const alertDiv = document.createElement('div');
    alertDiv.id = 'subsentry-alert';
    
    // עיצוב החלונית
    Object.assign(alertDiv.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
        backgroundColor: 'white', padding: '16px', borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb',
        fontFamily: 'sans-serif', width: '300px', display: 'flex', flexDirection: 'column', gap: '12px'
    });

    // שורת כותרת עם כפתור סגירה (X)
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = document.createElement('div');
    title.textContent = "🛡️ Track Subscription?";
    title.style.fontWeight = "bold";
    title.style.fontSize = "15px";

    const closeBtn = document.createElement('button');
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none; border:none; color:#9ca3af; cursor:pointer; font-size:18px; padding:0 5px;";
    closeBtn.onclick = () => {
        isDismissed = true; // מעכשיו התוסף לא יקפוץ שוב בדף הזה
        alertDiv.remove();
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    const info = document.createElement('div');
    info.textContent = `Price detected: ${price}`;
    info.style.fontSize = "13px";
    info.style.color = "#4b5563";

    const input = document.createElement('input');
    input.placeholder = "Trial days? (Optional)";
    input.type = "number";
    input.style.cssText = "padding:8px; border:1px solid #d1d5db; border-radius:6px; font-size:13px;";

    const btn = document.createElement('button');
    btn.textContent = "Track & Save";
    btn.style.cssText = "background:#4F46E5; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:14px;";

    btn.onclick = () => {
        const service = document.title.split('|')[0].trim();
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = [...data.subscriptions, { 
                service, price, trialDays: input.value, date: new Date().toLocaleDateString(), url: window.location.href 
            }];
            chrome.storage.local.set({ subscriptions: newList }, () => {
                if (input.value > 0) {
                    chrome.runtime.sendMessage({ action: "setAlarm", service, days: input.value });
                }
                isDismissed = true; // הצלחה! אל תציג שוב
                alertDiv.textContent = "✅ Saved!";
                alertDiv.style.textAlign = "center";
                alertDiv.style.fontWeight = "bold";
                alertDiv.style.color = "#059669";
                setTimeout(() => alertDiv.remove(), 2000);
            });
        });
    };

    alertDiv.appendChild(header);
    alertDiv.appendChild(info);
    alertDiv.appendChild(input);
    alertDiv.appendChild(btn);
    document.body.appendChild(alertDiv);
}

setInterval(scan, 3000);