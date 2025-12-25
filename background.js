// לוג פשוט כדי לוודא שהשירות עלה
console.log("SubSentry Service Worker is active! 🛡️");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setAlarm") {
        // לצורך בדיקה מיידית נשתמש בדקה אחת. בייצור: (ימים-1) * 24 * 60
        const delay = Math.max(1, (parseInt(request.days) - 1) * 24 * 60);
        
        chrome.alarms.create(request.service, { delayInMinutes: delay });
        console.log(`Alarm set for ${request.service} in ${delay} minutes.`);
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Subscription Alert!',
        message: `Your trial for ${alarm.name} expires soon. Don't forget to cancel!`,
        priority: 2
    });
});