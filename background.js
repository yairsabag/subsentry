console.log('🚀 SubSentry Background Script Loaded!');

// 1. יצירת בדיקה יומית כשהתוסף מותקן
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed/updated!');
    
    // לשימוש בייצור (Production): בדיקה פעם ביום (1440 דקות)
    // לצרכי בדיקה בלבד, ניתן לשנות זמנית ל-1
    chrome.alarms.create('checkTrialExpirations', { periodInMinutes: 1440 });
    
    console.log('🔍 Running initial check...');
    checkSubscriptions();
});

// 2. מאזין לשעון המעורר (Alarm)
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('⏰ Alarm triggered:', alarm.name);
    if (alarm.name === 'checkTrialExpirations') {
        checkSubscriptions();
    }
});

// 3. הפיצ'ר החדש: מה קורה כשלוחצים על ההתראה
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('🖱️ Notification clicked:', notificationId);
    chrome.tabs.create({
        url: chrome.runtime.getURL('dashboard.html')
    });
});

/**
 * פונקציה לבדיקת מנויים שתוקפם פג מחר
 */
function checkSubscriptions() {
    console.log('🔍 Checking subscriptions in storage...');
    
    chrome.storage.local.get({ subscriptions: [] }, (data) => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        
        console.log('📅 Checking for expiry on:', tomorrow.toDateString());

        if (data.subscriptions.length === 0) {
            console.log('⚠️ No subscriptions found');
            return;
        }

        data.subscriptions.forEach(sub => {
            if (sub.expiryDate) {
                const expiry = new Date(sub.expiryDate);
                
                if (expiry.toDateString() === tomorrow.toDateString()) {
                    console.log('🚨 Trial ending tomorrow for:', sub.service);
                    showNotification(sub.service);
                }
            }
        });
    });
}

/**
 * יצירת ההתראה הויזואלית
 */
function showNotification(serviceName) {
    console.log('📢 Creating notification for:', serviceName);
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '⚠️ Trial Ending Tomorrow!',
        message: `Your trial for ${serviceName} ends in 24 hours. Click here to manage it!`,
        priority: 2,
        isClickable: true // חשוב: הופך את ההתראה ללחיצה
    }, (id) => {
        console.log('✅ Notification displayed with ID:', id);
    });
}

// מאזין להודעות ידניות (למשל מה-Popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'manualCheck') {
        console.log('👆 Manual check triggered');
        checkSubscriptions();
        sendResponse({ status: 'Check completed' });
    }
});