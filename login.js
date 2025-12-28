document.addEventListener('DOMContentLoaded', function() {
    
    // פונקציות עזר לפתיחת דפים
    const openTab = (path) => chrome.tabs.create({ url: chrome.runtime.getURL(path) });

    // בדיקת סטטוס בטעינה
    chrome.storage.local.get(['isLoggedIn', 'subscriptions', 'baseCurrency'], (data) => {
        const authView = document.getElementById('view-auth');
        const statsView = document.getElementById('view-stats');

        if (!data.isLoggedIn) {
            // הצג ממשק התחברות
            authView.classList.remove('hidden');
            statsView.classList.add('hidden');
            setupLoginLogic();
        } else {
            // הצג נתונים
            authView.classList.add('hidden');
            statsView.classList.remove('hidden');
            setupStatsView(data);
        }
    });

    /**
     * ניהול לוגיקת ההתחברות בתוך הפופאפ
     */
    function setupLoginLogic() {
        const loginBtn = document.getElementById('btn-login');
        loginBtn.onclick = () => {
            const email = document.getElementById('email-in').value;
            const pass = document.getElementById('pass-in').value;

            if (email && pass) {
                // שמירה ל-Storage וריענון הפופאפ
                chrome.storage.local.set({ 
                    isLoggedIn: true, 
                    userEmail: email,
                    isPro: false 
                }, () => {
                    location.reload(); // טוען מחדש את הפופאפ כדי להציג את הנתונים
                });
            } else {
                alert("Please enter email and password.");
            }
        };
    }

    /**
     * ניהול הצגת הנתונים (הקוד המקורי שלך)
     */
    function setupStatsView(data) {
        const totalEl = document.getElementById('popup-total');
        const listEl = document.getElementById('popup-subs');
        const subs = data.subscriptions || [];
        const base = data.baseCurrency || '₪';
        
        let total = 0;
        listEl.innerHTML = '';

        subs.forEach(sub => {
            const price = parseFloat(sub.price.replace(/[^\d.]/g, '')) || 0;
            total += price;

            const item = document.createElement('div');
            item.className = 'sub-item';
            item.innerHTML = `
                <div>
                    <div style="font-weight:700;">${sub.service}</div>
                    <div style="font-size:11px; color:#06b6d4;">${sub.price}</div>
                </div>
                <div style="font-size:10px; color:#94a3b8;">${sub.date}</div>
            `;
            listEl.appendChild(item);
        });

        totalEl.textContent = `${base}${total.toFixed(2)}`;

        // כפתורי מעבר לדשבורד
        document.getElementById('go-to-dash').onclick = () => openTab('dashboard.html');
        document.getElementById('icon-dash-btn').onclick = () => openTab('dashboard.html');
    }
});