console.log('🚀 SubSentry Background Script Loaded!');

// 1. הגדרות בעת התקנה
chrome.runtime.onInstalled.addListener((details) => {
    // הסרנו את הפקודה לפתיחת login.html כי ההתחברות עכשיו בתוך הפופאפ
    console.log('SubSentry installed. Context:', details.reason);

    // יצירת ID ייחודי למשתמש (נשמר בזיכרון המקומי)
    chrome.storage.local.get(['userId'], (data) => {
        if (!data.userId) {
            const newId = 'user_' + Math.random().toString(36).substr(2, 9);
            chrome.storage.local.set({ userId: newId });
        }
    });

    // יצירת שעון מעורר לבדיקת מנויים פעם ביום
    chrome.alarms.create('checkTrialExpirations', { periodInMinutes: 1440 });
});

// 2. מאזין לשעון המעורר (Alarms) לבדיקת מנויים
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkTrialExpirations') checkSubscriptions();
});

// 3. פתיחת הדשבורד בלחיצה על התראה
chrome.notifications.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

/**
 * פונקציה הסורקת את המנויים ושולחת התראה 24 שעות לפני סיום הניסיון
 */
function checkSubscriptions() {
    chrome.storage.local.get({ subscriptions: [] }, (data) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        data.subscriptions.forEach(sub => {
            if (sub.expiryDate) {
                const expiry = new Date(sub.expiryDate);
                if (expiry.toDateString() === tomorrow.toDateString()) {
                    showNotification(sub.service);
                }
            }
        });
    });
}

function showNotification(serviceName) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '⚠️ Trial Ending Tomorrow!',
        message: `Your trial for ${serviceName} ends in 24 hours. Click to manage.`,
        priority: 2
    });
}

// 4. מאזין להודעות מחלקים אחרים של התוסף
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openDash') {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
});