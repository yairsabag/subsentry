console.log('🚀 SubSentry Content Script Loaded');

let isDismissed = false;
let currentUrl = window.location.href;
let lastGuardedPrice = null;

const strongSignals = ["checkout", "stripe.com", "paypal.com", "billing", "subscribe", "payment", "upgrade"];
const subKeywords = ["plan", "monthly", "annually", "pricing", "membership", "subscription", "trial"];
const dealKeywords = ["discount", "promo", "off", "sale", "coupon", "special offer"];
const categories = ["Streaming", "AI Tools", "Software", "Hosting", "Gaming", "Other"];

// פונקציה לבדיקה האם התוסף עדיין מחובר (מונע שגיאות Context Invalidated)
function isExtensionValid() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

function isSubscriptionContext() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const pageText = document.body.innerText.toLowerCase();

    const badPaths = ["/search", "/maps", "/news", "/images"];
    if (badPaths.some(p => path.includes(p))) return false;

    const hasStrongSignal = strongSignals.some(s => url.includes(s));
    const hasPaymentFields = [
        'input[autocomplete*="cc-"]', 'iframe[src*="stripe"]', 
        'iframe[src*="paypal"]', '.checkout-button', 'button[type="submit"]'
    ].some(selector => document.querySelector(selector) !== null);

    const hasKeywords = subKeywords.some(k => pageText.includes(k));

    return hasStrongSignal || hasPaymentFields || hasKeywords;
}

function extractPrice(text) {
    const priceRegex = /((?:[\$\u00A2-\u00A5\u058F\u060B\u09F2\u09F3\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6]|USD|ILS|EUR|GBP|₪|JPY)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(?:[\$\u00A2-\u00A5\u058F\u060B\u09F2\u09F3\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6]|USD|ILS|EUR|GBP|₪|JPY))/gi;
    const matches = [...text.matchAll(priceRegex)];
    if (!matches.length) return null;

    let lowest = Infinity;
    let bestStr = null;

    matches.forEach(m => {
        const valStr = m[2] || m[3];
        const val = parseFloat(valStr.replace(/,/g, ''));
        if (val > 2 && val < lowest) {
            lowest = val;
            bestStr = m[0];
        }
    });
    return bestStr;
}

function scan() {
    // אם התוסף הוסר/התעדכן והדף לא רוענן - הפסק פעילות
    if (!isExtensionValid()) return;

    if (window.location.href !== currentUrl) {
        isDismissed = false;
        lastGuardedPrice = null;
        currentUrl = window.location.href;
    }

    if (isDismissed || document.getElementById('subsentry-alert')) return;
    if (!isSubscriptionContext()) return;

    const selected = window.getSelection().toString();
    const price = selected ? extractPrice(selected) : extractPrice(document.body.innerText);

    if (price && price === lastGuardedPrice) return;
    if (price) createAlert(price);
}

function getIconURL() {
    try {
        if (isExtensionValid() && chrome.runtime.getURL) {
            return chrome.runtime.getURL('icon.png');
        }
    } catch (e) {
        console.warn('⚠️ Extension context lost. Using fallback icon.');
    }
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><circle cx="12" cy="12" r="10"/></svg>';
}

function createAlert(price) {
    if (!isExtensionValid()) return;

    const alertDiv = document.createElement('div');
    alertDiv.id = 'subsentry-alert';
    Object.assign(alertDiv.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
        backgroundColor: '#1e293b', color: '#f8fafc', padding: '20px', borderRadius: '16px',
        border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        fontFamily: "'Inter', sans-serif", width: '300px', display: 'flex', flexDirection: 'column', gap: '15px'
    });

    const foundDeal = dealKeywords.find(word => document.body.innerText.toLowerCase().includes(word));
    const dealBadge = foundDeal ? `<div style="background:#10b981; color:white; font-size:10px; padding:4px; border-radius:4px; text-align:center; font-weight:bold;">🎁 PROMO DETECTED: ${foundDeal.toUpperCase()}</div>` : '';

    alertDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${getIconURL()}" style="width:20px;" onerror="this.style.display='none'">
                <span style="font-weight:800; color:#8b5cf6;">SubSentry</span>
            </div>
            <button id="alert-close" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;">✕</button>
        </div>
        ${dealBadge}
        <div>
            <small style="color:#94a3b8; text-transform:uppercase; font-size:10px;">Price</small>
            <input type="text" id="price-edit" value="${price}" style="background:#0f172a; border:1px solid #334155; color:#06b6d4; font-size:22px; font-weight:800; width:100%; padding:8px; border-radius:8px; outline:none; box-sizing:border-box;">
        </div>
        <select id="cat-select" style="background:#0f172a; border:1px solid #334155; color:white; padding:10px; border-radius:8px;">
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <input type="number" id="trial-input" placeholder="Trial period (days)?" style="background:#0f172a; border:1px solid #334155; color:white; padding:10px; border-radius:8px;">
        <button id="track-btn" style="background:linear-gradient(135deg, #8b5cf6, #d946ef); color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:800;">Guard Subscription</button>
    `;

    document.body.appendChild(alertDiv);

    document.getElementById('alert-close').onclick = () => { 
        isDismissed = true; 
        alertDiv.remove(); 
    };

    document.getElementById('track-btn').onclick = () => {
    if (!isExtensionValid()) return;

    // 1. שליפת המנויים והסטטוס של המשתמש (חינם/פרו)
    chrome.storage.local.get({ subscriptions: [], isPro: false }, (data) => {
        
        // 2. בדיקה: האם המשתמש הגיע למגבלה והוא לא בגרסת פרו?
        if (!data.isPro && data.subscriptions.length >= 3) {
            // במקום לשמור, נחליף את תוכן החלון בהודעת שדרוג
            const alertDiv = document.getElementById('subsentry-alert');
            alertDiv.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div style="font-size:40px;">🔒</div>
                    <h3 style="color:#f8fafc; margin:10px 0;">Limit Reached!</h3>
                    <p style="color:#94a3b8; font-size:12px; line-height:1.5;">
                        You've protected 3 subscriptions. Upgrade to Pro for unlimited protection and advanced insights.
                    </p>
                    <button id="upgrade-btn" style="background:linear-gradient(135deg, #f59e0b, #ef4444); color:white; border:none; padding:10px; width:100%; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:10px;">
                        Upgrade Now
                    </button>
                    <button id="alert-close-limit" style="background:none; border:none; color:#94a3b8; cursor:pointer; margin-top:10px; font-size:11px;">Maybe Later</button>
                </div>
            `;
            
            // כפתור סגירה בחלון המגבלה
            document.getElementById('alert-close-limit').onclick = () => alertDiv.remove();
            
            // כפתור השדרוג (כרגע רק יפתח את הדשבורד)
            document.getElementById('upgrade-btn').onclick = () => {
                chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
            };
            return; // עוצר את השמירה
        }

        // --- מכאן זה הקוד הקיים שלך ששומר את המנוי ---
        const finalPrice = document.getElementById('price-edit').value;
        isDismissed = true; 
        lastGuardedPrice = finalPrice; 
        
        const trialDays = parseInt(document.getElementById('trial-input').value) || 0;
        const category = document.getElementById('cat-select').value;
        const service = document.title.split('|')[0].trim();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + trialDays);

        const newList = [...data.subscriptions, { 
            service, price: finalPrice, category, trialDays, 
            expiryDate: expiryDate.getTime(), 
            date: new Date().toLocaleDateString(), url: window.location.href 
        }];
        
        chrome.storage.local.set({ subscriptions: newList }, () => {
            alertDiv.innerHTML = '<div style="text-align:center; padding:10px; color:#10b981; font-weight:bold;">🛡️ Secured!</div>';
            setTimeout(() => alertDiv.remove(), 1500);
         });
      });
   };
}

setInterval(scan, 3000);