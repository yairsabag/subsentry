console.log('🚀 SubSentry Content Script Loaded');

let isDismissed = false;
let currentUrl = window.location.href;
let lastGuardedPrice = null;

// הגדרות זיהוי (הקוד המקורי והחכם שלך)
const strongSignals = ["checkout", "stripe.com", "paypal.com", "billing", "subscribe", "payment", "upgrade"];
const subKeywords = ["plan", "monthly", "annually", "pricing", "membership", "subscription", "trial"];
const dealKeywords = ["discount", "promo", "off", "sale", "coupon", "special offer"];
const categories = ["Streaming", "AI Tools", "Software", "Hosting", "Gaming", "Other"];

function isExtensionValid() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

/**
 * בודק האם אנחנו בהקשר של רכישת מנוי (מונע הקפצות שווא)
 */
function isSubscriptionContext() {
    const url = window.location.href.toLowerCase();
    const pageText = document.body.innerText.toLowerCase();
    
    // מניעת הרצה בדפי חיפוש כלליים
    const badPaths = ["/search", "/maps", "/news", "/images"];
    if (badPaths.some(p => window.location.pathname.includes(p))) return false;

    const hasStrongSignal = strongSignals.some(s => url.includes(s));
    const hasKeywords = subKeywords.some(k => pageText.includes(k));
    const hasPaymentFields = [
        'input[autocomplete*="cc-"]', 'iframe[src*="stripe"]', 
        '.checkout-button', 'button[type="submit"]'
    ].some(selector => document.querySelector(selector) !== null);

    return hasStrongSignal || hasKeywords || hasPaymentFields;
}

/**
 * מחלץ מחיר בצורה חכמה (תומך בפורמטים מרובים ומטבעות)
 */
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
        return chrome.runtime.getURL('icon.png');
    } catch (e) {
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><circle cx="12" cy="12" r="10"/></svg>';
    }
}

/**
 * יצירת החלונית עם מנגנוני הגנה (Login + Pro Limit)
 */
function createAlert(price) {
    if (!isExtensionValid()) return;

    chrome.storage.local.get({ subscriptions: [], isPro: false, isLoggedIn: false }, (data) => {
        const alertDiv = document.createElement('div');
        alertDiv.id = 'subsentry-alert';
        Object.assign(alertDiv.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
            backgroundColor: '#1e293b', color: '#f8fafc', padding: '20px', borderRadius: '16px',
            border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            fontFamily: "'Inter', sans-serif", width: '300px', display: 'flex', flexDirection: 'column', gap: '15px'
        });

        // 🛡️ שלב א: בדיקה אם המשתמש מחובר
        if (!data.isLoggedIn) {
            alertDiv.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div style="font-size:40px;">🔑</div>
                    <h3 style="margin:10px 0;">Login Required</h3>
                    <p style="color:#94a3b8; font-size:12px; line-height:1.5;">Please login to your account to start securing your subscriptions.</p>
                    <button id="login-now-btn" style="background:#4f46e5; color:white; border:none; padding:12px; width:100%; border-radius:10px; cursor:pointer; font-weight:800;">Login Now</button>
                    <button id="alert-close" style="background:none; border:none; color:#64748b; margin-top:10px; cursor:pointer; font-size:11px;">Maybe Later</button>
                </div>`;
            document.body.appendChild(alertDiv);
            document.getElementById('alert-close').onclick = () => alertDiv.remove();
            document.getElementById('login-now-btn').onclick = () => chrome.runtime.sendMessage({ action: 'openDash' });
            return;
        }

        // 🛡️ שלב ב: בדיקת מגבלת 3 מנויים לגרסה החינמית
        if (!data.isPro && data.subscriptions.length >= 3) {
            alertDiv.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div style="font-size:40px;">🔒</div>
                    <h3 style="margin:10px 0;">Free Tier Limit</h3>
                    <p style="color:#94a3b8; font-size:12px; line-height:1.5;">You've protected 3 subscriptions. Upgrade to <b>Pro</b> for unlimited tracking and insights.</p>
                    <button id="upgrade-now-btn" style="background:linear-gradient(135deg, #8b5cf6, #d946ef); color:white; border:none; padding:12px; width:100%; border-radius:10px; cursor:pointer; font-weight:800; margin-top:10px;">Upgrade to Pro</button>
                    <button id="alert-close" style="background:none; border:none; color:#64748b; margin-top:10px; cursor:pointer; font-size:11px;">Close</button>
                </div>`;
            document.body.appendChild(alertDiv);
            document.getElementById('alert-close').onclick = () => alertDiv.remove();
            document.getElementById('upgrade-now-btn').onclick = () => chrome.runtime.sendMessage({ action: 'openDash' });
            return;
        }

        // ✅ שלב ג: חלונית שמירה רגילה (עבור משתמש מחובר/פרו)
        const foundDeal = dealKeywords.find(word => document.body.innerText.toLowerCase().includes(word));
        const dealBadge = foundDeal ? `<div style="background:#10b981; color:white; font-size:10px; padding:4px; border-radius:4px; text-align:center; font-weight:bold;">🎁 PROMO DETECTED: ${foundDeal.toUpperCase()}</div>` : '';

        alertDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${getIconURL()}" style="width:20px;">
                    <span style="font-weight:800; color:#8b5cf6;">SubSentry</span>
                </div>
                <button id="alert-close" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;">✕</button>
            </div>
            ${dealBadge}
            <div>
                <small style="color:#94a3b8; text-transform:uppercase; font-size:10px;">Price Detected</small>
                <input type="text" id="price-edit" value="${price}" style="background:#0f172a; border:1px solid #334155; color:#06b6d4; font-size:22px; font-weight:800; width:100%; padding:8px; border-radius:8px; outline:none;">
            </div>
            <select id="cat-select" style="background:#0f172a; border:1px solid #334155; color:white; padding:10px; border-radius:8px;">
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <input type="number" id="trial-input" placeholder="Trial period (days)?" style="background:#0f172a; border:1px solid #334155; color:white; padding:10px; border-radius:8px;">
            <button id="track-btn" style="background:linear-gradient(135deg, #8b5cf6, #d946ef); color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:800;">Guard Subscription</button>
        `;

        document.body.appendChild(alertDiv);
        document.getElementById('alert-close').onclick = () => { isDismissed = true; alertDiv.remove(); };

        document.getElementById('track-btn').onclick = () => {
            const finalPrice = document.getElementById('price-edit').value;
            const trialDays = parseInt(document.getElementById('trial-input').value) || 0;
            const category = document.getElementById('cat-select').value;
            const service = document.title.split('|')[0].split('-')[0].trim();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + trialDays);

            const newSub = { 
                service, price: finalPrice, category, trialDays, 
                expiryDate: expiryDate.getTime(), 
                date: new Date().toLocaleDateString(), url: window.location.href 
            };
            
            chrome.storage.local.set({ subscriptions: [...data.subscriptions, newSub] }, () => {
                alertDiv.innerHTML = '<div style="text-align:center; padding:10px; color:#10b981; font-weight:bold;">🛡️ Subscription Secured!</div>';
                setTimeout(() => alertDiv.remove(), 1500);
                lastGuardedPrice = finalPrice;
            });
        };
    });
}

setInterval(scan, 3000);