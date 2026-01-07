// البيانات الأولية
const OTP_CODES = [
    "123456", "654321", "987654", "456789", "112233",
    "998877", "554433", "667788", "223344", "889900"
];

// حساب المشرف الأساسي
const ADMIN_ACCOUNT = {
    id: 1,
    email: "hooda2024g1@gmail.com",
    password: "M13854672m#",
    name: "المشرف الرئيسي",
    phone: "+201000000000",
    countryCode: "+20",
    isAdmin: true,
    joinDate: "2024-01-01"
};

// ⭐⭐ رابط Google Apps Script الصحيح ⭐⭐
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxKXyXjSPb1MHFpPzuIN4C5zN4a6u5cWR2bn4nTp2AQbFlKWcIfgmKBDIRIJ_UfBNxn/exec";

// بيانات التطبيقات الافتراضية
const DEFAULT_APPS = [];

// حالة التطبيق
let currentUser = null;
let apps = [];
let currentOTP = "";
let nextAppId = 5;
let selectedAppForUpdate = null;
let uploadedImages = [];
let uploadedIconImage = "";

// ========== دوال Google Sheets المحسنة ==========

// دالة إرسال الطلبات مع إصلاح CORS
async function sendRequestToGoogleScript(url, options = {}) {
    console.log(`📤 إرسال طلب إلى: ${url}`);
    
    try {
        // إعداد خيارات Fetch
        const fetchOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            // لا تستخدم no-cors، دعنا نحاول بدون mode
            // mode: 'cors' // جرب بدون هذا الخط
        };
        
        // إرسال طلب Preflight أولاً لطلبات POST
        if (options.method === 'POST') {
            try {
                const preflightUrl = `${url.split('?')[0]}?preflight=true&_=${Date.now()}`;
                await fetch(preflightUrl, { method: 'OPTIONS' });
                console.log('✅ Preflight request sent');
            } catch (preflightError) {
                console.log('⚠️ Preflight failed, continuing anyway');
            }
        }
        
        // إرسال الطلب الفعلي
        const response = await fetch(url, fetchOptions);
        
        console.log('📥 حالة الاستجابة:', response.status, response.statusText);
        
        if (response.ok) {
            try {
                const data = await response.json();
                console.log('✅ بيانات الاستجابة:', data);
                return { ok: true, data: data };
            } catch (jsonError) {
                console.log('⚠️ خطأ في تحليل JSON:', jsonError);
                // حاول قراءة النص أولاً
                const text = await response.text();
                console.log('📄 نص الاستجابة:', text.substring(0, 200));
                try {
                    const data = JSON.parse(text);
                    return { ok: true, data: data };
                } catch (e) {
                    return { 
                        ok: true, 
                        data: { success: true, message: 'Request successful' } 
                    };
                }
            }
        } else {
            console.error('❌ خطأ HTTP:', response.status);
            return { 
                ok: false, 
                error: `HTTP ${response.status}: ${response.statusText}` 
            };
        }
        
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.message);
        
        // المحاولة الثانية: استخدام طريقة مختلفة
        try {
            return await sendViaProxy(url, options);
        } catch (proxyError) {
            console.error('❌ فشل Proxy أيضًا:', proxyError);
            return { ok: false, error: error.message };
        }
    }
}

// إرسال عبر Proxy لتجاوز CORS
async function sendViaProxy(url, options) {
    console.log('🔄 محاولة إرسال عبر Proxy...');
    
    // استخدم CORS Proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const proxyOptions = {
        method: options.method || 'GET',
        headers: options.headers || {}
    };
    
    if (options.body) {
        proxyOptions.body = options.body;
        proxyOptions.headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(proxyUrl, proxyOptions);
    
    if (response.ok) {
        const data = await response.json();
        return { ok: true, data: data };
    }
    
    throw new Error('Proxy request failed');
}

// جلب المستخدمين من Google Sheets
async function loadUsersFromGoogleSheets() {
    console.log('🔄 جاري تحميل المستخدمين من Google Sheets...');
    
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getUsers&_=${Date.now()}`;
        console.log('🔗 الرابط:', url);
        
        const result = await sendRequestToGoogleScript(url);
        
        if (result.ok && result.data && result.data.success) {
            console.log(`✅ تم تحميل ${result.data.users ? result.data.users.length : 0} مستخدم`);
            
            if (result.data.users) {
                // حفظ المستخدمين في localStorage
                localStorage.setItem('hooda_users', JSON.stringify(result.data.users));
                localStorage.setItem('last_sync', new Date().toISOString());
                
                return result.data.users;
            }
        } else {
            console.error('❌ فشل في تحميل المستخدمين:', result.error || result.data?.message);
        }
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
    }
    
    // استخدام البيانات المحلية كبديل
    const localUsers = JSON.parse(localStorage.getItem('hooda_users') || '[]');
    console.log(`📝 استخدام ${localUsers.length} مستخدم من localStorage`);
    return localUsers;
}

// حفظ المستخدمين في Google Sheets
async function saveUsersToGoogleSheets(users) {
    console.log('💾 جاري حفظ المستخدمين في Google Sheets:', users.length, 'مستخدم');
    
    try {
        // تحضير البيانات
        const dataToSend = {
            action: 'saveUsers',
            users: users
        };
        
        console.log('📤 البيانات المرسلة:', JSON.stringify(dataToSend).substring(0, 200) + '...');
        
        // المحاولة الأولى: إرسال مباشر
        let result = await sendRequestToGoogleScript(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(dataToSend)
        });
        
        console.log('📥 نتيجة الحفظ:', result);
        
        if (result.ok && result.data && result.data.success) {
            console.log('✅ تم الحفظ بنجاح:', result.data);
            showMessage('تم حفظ البيانات على Google Sheets بنجاح! ✓', 'success');
            
            // تحديث وقت المزامنة الأخير
            localStorage.setItem('last_sync', new Date().toISOString());
            
            return true;
        }
        
        // المحاولة الثانية: استخدام FormData
        console.log('🔄 المحاولة الثانية: استخدام FormData...');
        
        const formData = new FormData();
        formData.append('data', JSON.stringify(dataToSend));
        
        const formResult = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: formData,
            // mode: 'no-cors'
        });
        
        console.log('📥 نتيجة FormData:', formResult.status);
        
        if (formResult.ok || formResult.status === 200) {
            showMessage('تم إرسال البيانات إلى Google Sheets! ✓', 'success');
            return true;
        }
        
        throw new Error('فشلت جميع المحاولات');
        
    } catch (error) {
        console.error('❌ خطأ في حفظ المستخدمين:', error);
        showMessage('⚠️ تم الحفظ محلياً فقط. فشل الاتصال بالسحابة.', 'warning');
        return false;
    }
}

// اختبار اتصال Google Sheets
async function testGoogleSheetsConnection() {
    console.log('🔗 اختبار اتصال Google Sheets...');
    
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=test&_=${Date.now()}`;
        console.log('🔗 رابط الاختبار:', url);
        
        // اختبار بسيط
        const response = await fetch(url);
        console.log('📥 استجابة الاختبار:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ اختبار ناجح:', data);
            showMessage(`✅ الاتصال ناجح! ${data.message}`, 'success');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ فشل الاتصال:', error);
        showMessage(`❌ فشل الاتصال: ${error.message}`, 'error');
        return false;
    }
}

// ========== نهاية دوال Google Sheets ==========

// تهيئة الموقع عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromStorage();
    setupEventListeners();
    checkLoggedInUser();
    updateDataStats();
    
    // اختبار الاتصال بعد تحميل الصفحة
    setTimeout(() => {
        testGoogleSheetsConnection();
    }, 1000);
    
    // إضافة class للجسم للتحكم في اللمس
    document.body.classList.add('loaded');
});

// تحميل البيانات من localStorage
function loadDataFromStorage() {
    const storedApps = localStorage.getItem('hooda_apps');
    if (storedApps) {
        apps = JSON.parse(storedApps);
    } else {
        apps = [...DEFAULT_APPS];
        localStorage.setItem('hooda_apps', JSON.stringify(apps));
    }
    
    const maxId = apps.reduce((max, app) => Math.max(max, app.id), 0);
    nextAppId = maxId + 1;
    
    const storedUser = localStorage.getItem('hooda_current_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
    
    const storedUsers = localStorage.getItem('hooda_users');
    if (!storedUsers) {
        const initialUsers = [ADMIN_ACCOUNT];
        localStorage.setItem('hooda_users', JSON.stringify(initialUsers));
    }
}

// حفظ البيانات في localStorage
function saveDataToStorage() {
    localStorage.setItem('hooda_apps', JSON.stringify(apps));
    if (currentUser) {
        localStorage.setItem('hooda_current_user', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('hooda_current_user');
    }
    updateDataStats();
}

// تحديث إحصائيات البيانات
function updateDataStats() {
    const users = JSON.parse(localStorage.getItem('hooda_users') || '[]');
    document.getElementById('users-count').textContent = users.length;
    document.getElementById('apps-count').textContent = apps.length;
}

// إعداد معالجات الأحداث
function setupEventListeners() {
    // مصادقة
    document.getElementById('login-tab').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('signup-tab').addEventListener('click', () => switchAuthTab('signup'));
    document.getElementById('go-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthTab('signup');
    });
    document.getElementById('go-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthTab('login');
    });
    
    document.getElementById('toggle-login-password').addEventListener('click', togglePasswordVisibility);
    document.getElementById('toggle-signup-password').addEventListener('click', togglePasswordVisibility);
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('request-otp-btn').addEventListener('click', generateOTP);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    
    // التنقل
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('backup-data-btn').addEventListener('click', handleBackup);
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);
    
    // أزرار المشرف
    document.getElementById('admin-backup-btn').addEventListener('click', handleBackup);
    document.getElementById('admin-restore-btn').addEventListener('click', handleRestore);
    document.getElementById('admin-clear-data-btn').addEventListener('click', clearAllData);
    
    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', function(e) {
        const mainNav = document.getElementById('main-nav');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        
        if (window.innerWidth <= 768 && 
            mainNav.classList.contains('active') && 
            !mainNav.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            mainNav.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            switchPage(page);
            
            // إغلاق القائمة على الجوال
            if (window.innerWidth <= 768) {
                document.getElementById('main-nav').classList.remove('active');
            }
        });
    });
    
    document.getElementById('explore-apps-btn').addEventListener('click', () => {
        switchPage('apps');
        if (window.innerWidth <= 768) {
            document.getElementById('main-nav').classList.remove('active');
        }
    });
    
    // تطبيقات
    document.getElementById('upload-app-form').addEventListener('submit', handleAppUpload);
    document.getElementById('app-search').addEventListener('input', filterApps);
    document.getElementById('app-screenshots').addEventListener('change', handleImageUpload);
    document.getElementById('app-icon-file').addEventListener('change', handleIconUpload);
    
    // نوافذ منبثقة
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('app-details-modal').classList.remove('active');
        });
    });
    
    document.querySelectorAll('.close-update-modal, .close-update-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('update-app-modal').classList.remove('active');
        });
    });
    
    document.getElementById('download-app-btn').addEventListener('click', downloadApp);
    
    document.getElementById('app-details-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
    
    document.getElementById('update-app-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
    
    document.getElementById('update-app-form').addEventListener('submit', handleUpdateApp);
    
    // إعادة ضبط النماذج عند تبديل التبويبات
    document.getElementById('login-tab').addEventListener('click', function() {
        document.getElementById('login-form').reset();
    });
    
    document.getElementById('signup-tab').addEventListener('click', function() {
        document.getElementById('signup-form').reset();
        document.getElementById('otp-section').style.display = 'none';
        document.getElementById('otp-display').style.display = 'none';
        document.getElementById('signup-submit').disabled = true;
    });
    
    // إصلاح مشكلة اللمس على iOS
    document.querySelectorAll('button, a, input, select, textarea').forEach(el => {
        el.addEventListener('touchstart', function() {}, { passive: true });
    });
}

// معالجة النسخ الاحتياطي
async function handleBackup() {
    try {
        const users = JSON.parse(localStorage.getItem('hooda_users') || '[]');
        const appsData = JSON.parse(localStorage.getItem('hooda_apps') || '[]');
        
        const success = await saveUsersToGoogleSheets(users);
        
        if (success) {
            showMessage('✅ تم إنشاء نسخة احتياطية في Google Sheets!', 'success');
        }
        
    } catch (error) {
        console.error('Error in backup:', error);
        showMessage('⚠️ حدث خطأ في النسخ الاحتياطي', 'warning');
    }
}

// معالجة الاستعادة
async function handleRestore() {
    if (!confirm('هل تريد استعادة البيانات من Google Sheets؟')) {
        return;
    }
    
    try {
        const users = await loadUsersFromGoogleSheets();
        if (users && users.length > 0) {
            localStorage.setItem('hooda_users', JSON.stringify(users));
            showMessage(`✅ تم استعادة ${users.length} مستخدم من Google Sheets`, 'success');
            updateDataStats();
        }
    } catch (error) {
        console.error('Error in restore:', error);
        showMessage('❌ فشل في استعادة البيانات', 'error');
    }
}

// ... (بقية الدوال تبقى كما هي بدون تغيير) ...

// عرض رسالة للمستخدم
function showMessage(message, type = 'info') {
    // إزالة أي رسائل سابقة
    document.querySelectorAll('.message').forEach(msg => {
        msg.classList.remove('show');
        setTimeout(() => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        }, 300);
    });
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="message-close" type="button">&times;</button>
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.classList.add('show');
    }, 10);
    
    messageEl.querySelector('.message-close').addEventListener('click', () => {
        messageEl.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    });
    
    setTimeout(() => {
        if (document.body.contains(messageEl)) {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(messageEl)) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }
    }, 5000);
}