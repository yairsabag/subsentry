chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // פתיחת Dashboard ללא שגיאת חסימה
    if (request.action === "openDashboard") {
        chrome.tabs.create({ url: 'dashboard.html' });
    }

    // הגדרת תזכורת לסוף תקופת ניסיון
    if (request.action === "setAlarm") {
        const delay = Math.max(1, (parseInt(request.days) - 1) * 24 * 60);
        chrome.alarms.create(request.service, { delayInMinutes: delay });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Subscription Alert! 🛡️',
        message: `Your trial for ${alarm.name} expires soon. Don't forget to cancel!`,
        priority: 2
    });
});