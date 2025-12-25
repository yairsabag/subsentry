document.addEventListener('DOMContentLoaded', function() {
  const subList = document.getElementById('subList');
  const totalAmount = document.getElementById('totalAmount');

  // שליפת המנויים ששמרנו בזיכרון של התוסף
  chrome.storage.local.get({ subscriptions: [] }, (data) => {
    if (data.subscriptions.length === 0) {
      subList.innerHTML = '<p class="empty">עדיין לא נשמרו מנויים.</p>';
      return;
    }

    let total = 0;
    subList.innerHTML = '';

    data.subscriptions.forEach(sub => {
      const div = document.createElement('div');
      div.className = 'sub-item';
      div.innerHTML = `<span>${sub.service}</span> <span>${sub.price}</span>`;
      subList.appendChild(div);

      // ניסיון לחשב סכום כולל (מנקה סימני דולר/שקל)
      const numPrice = parseFloat(sub.price.replace(/[^0-9.]/g, ''));
      if (!isNaN(numPrice)) total += numPrice;
    });

    totalAmount.innerText = `סה"כ לחודש: ${total.toFixed(2)} (משוער)`;
  });
});