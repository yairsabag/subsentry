// הגדרות Firebase האמיתיות שלך
const firebaseConfig = {
  apiKey: "AIzaSyBeoz6Zk4IMS4zR1xnVPC6YmXDKux_epjY",
  authDomain: "subsentry-a9824.firebaseapp.com",
  projectId: "subsentry-a9824",
  storageBucket: "subsentry-a9824.firebasestorage.app",
  messagingSenderId: "328482516042",
  appId: "1:328482516042:web:624f313cbea9c01f220ab3",
  measurementId: "G-HW0MGLJC20"
};

// אתחול Firebase
firebase.initializeApp(firebaseConfig);

document.addEventListener('DOMContentLoaded', function() {
    const authView = document.getElementById('view-auth');
    const statsView = document.getElementById('view-stats');
    const switchBtn = document.getElementById('btn-switch');
    const submitBtn = document.getElementById('btn-auth-submit');
    const googleBtn = document.getElementById('btn-google');
    const logoutBtn = document.getElementById('btn-logout');
    
    let isLoginMode = true;

    // --- שלב 1: בדיקה שקטה ברגע שפותחים את הפופאפ ---
    // זה פותר את הבעיה שהפופאפ נסגר במהלך בחירת החשבון
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
        if (token && !firebase.auth().currentUser) {
            const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
            firebase.auth().signInWithCredential(credential).catch(err => {
                console.log("Silent login failed, waiting for user.");
            });
        }
    });

    // --- שלב 2: האזנה לשינוי סטטוס התחברות (Real-time) ---
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            chrome.storage.local.set({ 
                isLoggedIn: true, 
                userName: user.displayName || user.email.split('@')[0],
                userEmail: user.email
            }, () => {
                showStatsView(user);
            });
        } else {
            authView.classList.remove('hidden');
            statsView.classList.add('hidden');
            setupAuthUI();
        }
    });

    /**
     * ניהול ממשק המשתמש של האימות
     */
    function setupAuthUI() {
        switchBtn.onclick = (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            document.getElementById('auth-title').textContent = isLoginMode ? "Welcome Back!" : "Join SubSentry";
            submitBtn.textContent = isLoginMode ? "Login" : "Register";
            document.getElementById('mode-text').innerHTML = isLoginMode ? 
                `Don't have an account? <b id="btn-switch">Register</b>` : 
                `Already have an account? <b id="btn-switch">Login</b>`;
            document.getElementById('btn-switch').onclick = switchBtn.onclick;
        };

        submitBtn.onclick = () => {
            const email = document.getElementById('email-in').value;
            const pass = document.getElementById('pass-in').value;
            if (!email || !pass) return alert("Please fill in all fields.");
            
            const authAction = isLoginMode ? 
                firebase.auth().signInWithEmailAndPassword(email, pass) : 
                firebase.auth().createUserWithEmailAndPassword(email, pass);

            authAction.catch(error => alert("Auth Error: " + error.message));
        };

        googleBtn.onclick = () => {
            chrome.identity.getAuthToken({ interactive: true }, function(token) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
                firebase.auth().signInWithCredential(credential).catch(error => {
                    alert("Google Login Error: " + error.message);
                });
            });
        };
    }

    /**
     * פונקציית Logout - ניקוי מלא
     */
    logoutBtn.onclick = () => {
        firebase.auth().signOut().then(() => {
            chrome.identity.getAuthToken({ interactive: false }, function(token) {
                if (token) {
                    chrome.identity.removeCachedAuthToken({ token: token }, function() {
                        console.log("Google token cleared.");
                    });
                }
            });
            chrome.storage.local.set({ isLoggedIn: false, userName: null, userEmail: null }, () => {
                window.location.reload();
            });
        }).catch(err => console.error("Logout Failed", err));
    };

    /**
     * הצגת נתונים למשתמש מחובר - כולל פירוט מנויים!
     */
    function showStatsView(user) {
        authView.classList.add('hidden');
        statsView.classList.remove('hidden');
        document.getElementById('user-name').textContent = user.displayName || user.email.split('@')[0];
        
        // טעינת המנויים מה-Storage והצגתם ברשימה
        chrome.storage.local.get({ subscriptions: [], baseCurrency: '₪' }, (data) => {
            renderList(data);
        });
    }

    function renderList(data) {
        const totalEl = document.getElementById('popup-total');
        const listEl = document.getElementById('popup-subs');
        const subs = data.subscriptions || [];
        const base = data.baseCurrency || '₪';
        
        let total = 0;
        listEl.innerHTML = ''; // ניקוי הרשימה לפני מילוי

        subs.forEach(sub => {
            const priceVal = parseFloat(sub.price.replace(/[^\d.]/g, '')) || 0;
            total += priceVal;
            
            // יצירת אלמנט לכל מנוי (כמו Netflix $25)
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

        // הצגת סכום כולל
        totalEl.textContent = `${base}${total.toFixed(2)}`;

        // הודעה אם אין מנויים
        if(subs.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:12px; margin-top:10px;">No active subscriptions yet.</div>`;
        }
    }

    const openDash = () => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    document.getElementById('go-to-dash').onclick = openDash;
    document.getElementById('icon-dash-btn').onclick = openDash;
});