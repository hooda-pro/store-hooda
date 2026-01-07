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

// رابط Google Apps Script الجديد (استبدله برابطك)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRvAUVfuOwKri3m3bBpVrpkTRUXfLSDdQvTrfD8wXyiuCZ-vKN4911kMA8rwZ1Y8Fx8w/exec";

// بيانات التطبيقات الافتراضية مع تحديثات
const DEFAULT_APPS = [
    {
        id: 1,
        name: "تطبيق الألعاب",
        description: "تطبيق يحتوي على مجموعة من الألعاب المسلية والمسابقات الشيقة",
        category: "ألعاب",
        icon: "fas fa-gamepad",
        iconImage: "",
        uploader: "المشرف الرئيسي",
        version: "1.2.1",
        date: "2024-01-15",
        featured: true,
        screenshots: [],
        updates: [
            {
                version: "1.2.1",
                date: "2024-03-10",
                notes: "إصلاح مشكلة في الصوت وتحسين الأداء"
            },
            {
                version: "1.2.0",
                date: "2024-02-20",
                notes: "إضافة 5 ألعاب جديدة وتحسين الواجهة"
            },
            {
                version: "1.1.0",
                date: "2024-01-30",
                notes: "إصلاح الأخطاء وتحسين الاستقرار"
            }
        ]
    },
    {
        id: 2,
        name: "موسيقى العرب",
        description: "استمع إلى أفضل الأغاني العربية والعالمية بدون انقطاع",
        category: "ترفيه",
        icon: "fas fa-music",
        iconImage: "",
        uploader: "المشرف الرئيسي",
        version: "2.0.3",
        date: "2024-02-10",
        featured: true,
        screenshots: [],
        updates: [
            {
                version: "2.0.3",
                date: "2024-03-05",
                notes: "تحسين جودة الصوت وإضافة مؤثرات جديدة"
            }
        ]
    },
    {
        id: 3,
        name: "تعلم البرمجة",
        description: "تعلم البرمجة من الصفر مع دروس تفاعلية وتمارين عملية",
        category: "تعليم",
        icon: "fas fa-code",
        iconImage: "",
        uploader: "المشرف الرئيسي",
        version: "1.5.0",
        date: "2024-03-05",
        featured: true,
        screenshots: [],
        updates: []
    },
    {
        id: 4,
        name: "تطبيق الكاميرا",
        description: "تطبيق كاميرا متقدم مع فلترات وتأثيرات رائعة",
        category: "أدوات",
        icon: "fas fa-camera",
        iconImage: "",
        uploader: "المشرف الرئيسي",
        version: "1.0.0",
        date: "2024-03-10",
        featured: false,
        screenshots: [],
        updates: []
    }
];

// حالة التطبيق
let currentUser = null;
let apps = [];
let currentOTP = "";
let nextAppId = 5;
let selectedAppForUpdate = null;
let uploadedImages = [];
let uploadedIconImage = "";

// تهيئة الموقع عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromStorage();
    setupEventListeners();
    checkLoggedInUser();
    updateDataStats();
    
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
    document.getElementById('backup-data-btn').addEventListener('click', backupToGoogleSheets);
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);
    
    // أزرار المشرف
    document.getElementById('admin-backup-btn').addEventListener('click', backupToGoogleSheets);
    document.getElementById('admin-restore-btn').addEventListener('click', restoreFromGoogleSheets);
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

// معالجة رفع أيقونة التطبيق
function handleIconUpload(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('app-icon-preview');
    const placeholder = document.getElementById('app-icon-placeholder');
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedIconImage = e.target.result;
            preview.src = uploadedIconImage;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
    }
}

// معالجة رفع الصور
function handleImageUpload(e) {
    const files = e.target.files;
    const previewContainer = document.getElementById('screenshots-preview');
    previewContainer.innerHTML = '';
    uploadedImages = [];
    
    for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedImages.push(e.target.result);
            
            const imageDiv = document.createElement('div');
            imageDiv.className = 'image-preview';
            imageDiv.innerHTML = `
                <img src="${e.target.result}" alt="صورة ${i + 1}" loading="lazy">
                <button type="button" class="remove-image" data-index="${uploadedImages.length - 1}">×</button>
            `;
            
            previewContainer.appendChild(imageDiv);
            
            // إضافة حدث حذف الصورة
            imageDiv.querySelector('.remove-image').addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                uploadedImages.splice(index, 1);
                updateImagePreviews();
            });
        };
        
        reader.readAsDataURL(file);
    }
}

// تبديل قائمة الجوال
function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('active');
}

// تحديث معاينة الصور
function updateImagePreviews() {
    const previewContainer = document.getElementById('screenshots-preview');
    previewContainer.innerHTML = '';
    
    uploadedImages.forEach((image, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-preview';
        imageDiv.innerHTML = `
            <img src="${image}" alt="صورة ${index + 1}" loading="lazy">
            <button type="button" class="remove-image" data-index="${index}">×</button>
        `;
        
        previewContainer.appendChild(imageDiv);
        
        imageDiv.querySelector('.remove-image').addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-index'));
            uploadedImages.splice(idx, 1);
            updateImagePreviews();
        });
    });
}

// التحقق من وجود مستخدم مسجل الدخول
function checkLoggedInUser() {
    if (currentUser) {
        document.getElementById('auth-page').classList.remove('active');
        document.getElementById('main-page').classList.add('active');
        updateUserInfo();
        displayFeaturedApps();
        displayAllApps();
        
        if (currentUser.email === ADMIN_ACCOUNT.email) {
            document.getElementById('admin-nav').style.display = 'block';
            document.getElementById('admin-actions').style.display = 'flex';
            displayAdminApps();
            document.getElementById('admin-name').textContent = currentUser.name;
        } else {
            document.getElementById('admin-nav').style.display = 'none';
            document.getElementById('admin-actions').style.display = 'none';
        }
    } else {
        document.getElementById('auth-page').classList.add('active');
        document.getElementById('main-page').classList.remove('active');
    }
}

// التبديل بين تبويبات المصادقة
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('signup-tab').classList.add('active');
        document.getElementById('signup-form').classList.add('active');
    }
}

// عرض/إخفاء كلمة المرور
function togglePasswordVisibility(e) {
    const icon = e.target;
    const input = icon.closest('.input-group').querySelector('input[type="password"], input[type="text"]');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// معالجة تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('يرجى ملء جميع الحقول!', 'error');
        return;
    }
    
    // تسجيل الدخول كمسؤول
    if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
        currentUser = { ...ADMIN_ACCOUNT };
        saveDataToStorage();
        checkLoggedInUser();
        showMessage('تم تسجيل الدخول بنجاح كمسؤول!', 'success');
        return;
    }
    
    // تسجيل الدخول كمستخدم عادي
    const users = JSON.parse(localStorage.getItem('hooda_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        saveDataToStorage();
        checkLoggedInUser();
        showMessage('تم تسجيل الدخول بنجاح!', 'success');
    } else {
        // حاول تحميل المستخدمين من Google Sheets
        try {
            const onlineUsers = await loadUsersFromGoogleSheets();
            const onlineUser = onlineUsers.find(u => u.email === email && u.password === password);
            
            if (onlineUser) {
                // حفظ في localStorage للمرة القادمة
                const localUsers = JSON.parse(localStorage.getItem('hooda_users') || '[]');
                if (!localUsers.find(u => u.email === email)) {
                    localUsers.push(onlineUser);
                    localStorage.setItem('hooda_users', JSON.stringify(localUsers));
                }
                
                currentUser = onlineUser;
                saveDataToStorage();
                checkLoggedInUser();
                showMessage('تم تسجيل الدخول بنجاح من Google Sheets!', 'success');
            } else {
                showMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة!', 'error');
            }
        } catch (error) {
            console.error('Error loading users from Google Sheets:', error);
            showMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة!', 'error');
        }
    }
}

// جلب المستخدمين من Google Sheets
async function loadUsersFromGoogleSheets() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers&t=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.users) {
                return data.users;
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

// حفظ المستخدمين في Google Sheets
async function saveUsersToGoogleSheets(users) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveUsers',
                users: users
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.success;
        }
    } catch (error) {
        console.error('Error saving users:', error);
    }
    return false;
}

// إنشاء رمز OTP
function generateOTP() {
    const phone = document.getElementById('signup-phone').value.trim();
    const countryCode = document.getElementById('country-code').value;
    
    if (!phone) {
        showMessage('يرجى إدخال رقم الجوال!', 'error');
        return;
    }
    
    if (!countryCode) {
        showMessage('يرجى اختيار رمز الدولة!', 'error');
        return;
    }
    
    // التحقق من صحة رقم الهاتف
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(phone)) {
        showMessage('يرجى إدخال رقم هاتف صحيح (8-15 رقم)!', 'error');
        return;
    }
    
    // التحقق من أن البريد الإلكتروني غير مستخدم
    const email = document.getElementById('signup-email').value.trim();
    const users = JSON.parse(localStorage.getItem('hooda_users') || '[]');
    if (users.find(u => u.email === email)) {
        showMessage('هذا البريد الإلكتروني مسجل بالفعل!', 'error');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * OTP_CODES.length);
    currentOTP = OTP_CODES[randomIndex];
    
    const otpDisplay = document.getElementById('otp-display');
    otpDisplay.textContent = currentOTP;
    otpDisplay.style.display = 'block';
    
    document.getElementById('otp-section').style.display = 'block';
    document.getElementById('signup-submit').disabled = false;
    
    showMessage(`تم إنشاء رمز التحقق: ${currentOTP}`, 'info');
}

// معالجة إنشاء حساب جديد
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const countryCode = document.getElementById('country-code').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const otp = document.getElementById('signup-otp').value.trim();
    
    // التحقق من جميع الحقول
    if (!name || !email || !phone || !countryCode || !password || !confirmPassword || !otp) {
        showMessage('يرجى ملء جميع الحقول المطلوبة!', 'error');
        return;
    }
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('البريد الإلكتروني غير صحيح!', 'error');
        return;
    }
    
    // التحقق من تطابق كلمات المرور
    if (password !== confirmPassword) {
        showMessage('كلمتا المرور غير متطابقتين!', 'error');
        return;
    }
    
    // التحقق من قوة كلمة المرور
    if (password.length < 6) {
        showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل!', 'error');
        return;
    }
    
    // التحقق من صحة OTP
    if (otp !== currentOTP) {
        showMessage('رمز التحقق غير صحيح!', 'error');
        return;
    }
    
    // التحقق من عدم وجود حساب بنفس البريد
    const users = JSON.parse(localStorage.getItem('hooda_users') || '[]');
    if (users.find(u => u.email === email)) {
        showMessage('هذا البريد الإلكتروني مسجل بالفعل!', 'error');
        return;
    }
    
    // التحقق من عدم وجود حساب بنفس رقم الهاتف
    const fullPhone = countryCode + phone;
    if (users.find(u => u.phone === fullPhone)) {
        showMessage('رقم الهاتف هذا مسجل بالفعل!', 'error');
        return;
    }
    
    // إنشاء المستخدم الجديد
    const newUser = {
        id: Date.now(),
        name,
        email,
        phone: fullPhone,
        countryCode,
        password,
        isAdmin: false,
        joinDate: new Date().toISOString().split('T')[0]
    };
    
    // حفظ في localStorage
    users.push(newUser);
    localStorage.setItem('hooda_users', JSON.stringify(users));
    
    // حفظ في Google Sheets
    const savedToSheets = await saveUsersToGoogleSheets(users);
    
    if (savedToSheets) {
        showMessage('تم إنشاء حسابك وحفظه في Google Sheets!', 'success');
    } else {
        showMessage('تم إنشاء حسابك محلياً، لكن حدث خطأ في حفظه في السحابة', 'warning');
    }
    
    currentUser = newUser;
    saveDataToStorage();
    
    setTimeout(() => {
        checkLoggedInUser();
        updateDataStats();
    }, 1500);
}

// معالجة تسجيل الخروج
function handleLogout() {
    currentUser = null;
    saveDataToStorage();
    checkLoggedInUser();
    showMessage('تم تسجيل الخروج بنجاح!', 'info');
}

// التبديل بين الصفحات
function switchPage(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${page}-content`).classList.add('active');
    
    if (page === 'admin') {
        displayAdminApps();
    }
}

// تحديث معلومات المستخدم
function updateUserInfo() {
    document.getElementById('user-email').textContent = currentUser.email;
}

// معالجة رفع تطبيق جديد
function handleAppUpload(e) {
    e.preventDefault();
    
    if (!currentUser || currentUser.email !== ADMIN_ACCOUNT.email) {
        showMessage('ليس لديك صلاحية رفع التطبيقات!', 'error');
        return;
    }
    
    const name = document.getElementById('app-name').value.trim();
    const description = document.getElementById('app-description').value.trim();
    const category = document.getElementById('app-category').value;
    const version = document.getElementById('app-version').value.trim();
    const file = document.getElementById('app-file').files[0];
    
    if (!name || !description || !category || !version) {
        showMessage('يرجى ملء جميع الحقول المطلوبة!', 'error');
        return;
    }
    
    if (!file) {
        showMessage('يرجى اختيار ملف التطبيق!', 'error');
        return;
    }
    
    // استخدام الأيقونة المرفوعة أو أيقونة افتراضية
    const icon = uploadedIconImage ? "" : "fas fa-mobile-alt";
    const iconImage = uploadedIconImage || "";
    
    const newApp = {
        id: nextAppId++,
        name,
        description,
        category,
        icon: icon,
        iconImage: iconImage,
        uploader: currentUser.name,
        version,
        date: new Date().toISOString().split('T')[0],
        featured: apps.length < 5,
        screenshots: [...uploadedImages],
        updates: []
    };
    
    apps.push(newApp);
    saveDataToStorage();
    
    // إعادة تعيين النموذج
    document.getElementById('upload-app-form').reset();
    document.getElementById('screenshots-preview').innerHTML = '';
    document.getElementById('app-icon-preview').style.display = 'none';
    document.getElementById('app-icon-placeholder').style.display = 'block';
    uploadedImages = [];
    uploadedIconImage = "";
    
    displayFeaturedApps();
    displayAllApps();
    displayAdminApps();
    
    showMessage('تم رفع التطبيق بنجاح!', 'success');
}

// معالجة إصدار تحديث
function handleUpdateApp(e) {
    e.preventDefault();
    
    const version = document.getElementById('update-version').value.trim();
    const notes = document.getElementById('update-notes').value.trim();
    const file = document.getElementById('update-file').files[0];
    const appId = parseInt(document.getElementById('update-app-id').value);
    
    if (!version || !notes || !file) {
        showMessage('يرجى ملء جميع الحقول المطلوبة!', 'error');
        return;
    }
    
    const app = apps.find(a => a.id === appId);
    if (!app) {
        showMessage('التطبيق غير موجود!', 'error');
        return;
    }
    
    // تحديث إصدار التطبيق
    app.version = version;
    app.date = new Date().toISOString().split('T')[0];
    
    // إضافة التحديث إلى قائمة التحديثات
    app.updates.unshift({
        version,
        date: app.date,
        notes
    });
    
    saveDataToStorage();
    
    document.getElementById('update-app-form').reset();
    document.getElementById('update-app-modal').classList.remove('active');
    
    displayFeaturedApps();
    displayAllApps();
    displayAdminApps();
    
    showMessage(`تم إصدار تحديث ${version} بنجاح!`, 'success');
}

// فتح نافذة إصدار تحديث
function openUpdateModal(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) {
        showMessage('التطبيق غير موجود!', 'error');
        return;
    }
    
    selectedAppForUpdate = app;
    document.getElementById('update-app-id').value = appId;
    document.getElementById('update-app-modal').classList.add('active');
}

// عرض التطبيقات المميزة
function displayFeaturedApps() {
    const featuredContainer = document.getElementById('featured-apps');
    const featuredApps = apps.filter(app => app.featured).slice(0, 6);
    
    if (featuredApps.length === 0) {
        featuredContainer.innerHTML = '<p class="no-apps" style="text-align: center; color: #666; padding: 20px;">لا توجد تطبيقات مميزة حالياً.</p>';
        return;
    }
    
    featuredContainer.innerHTML = featuredApps.map(app => createAppCard(app)).join('');
    
    // إضافة أحداث النقر
    document.querySelectorAll('#featured-apps .app-card').forEach(card => {
        card.addEventListener('click', function() {
            const appId = parseInt(this.getAttribute('data-app-id'));
            showAppDetails(appId);
        });
    });
    
    // إضافة أحداث لأزرار التنزيل
    document.querySelectorAll('#featured-apps .download-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const appId = parseInt(this.getAttribute('data-app-id'));
            downloadAppFromButton(appId);
        });
    });
}

// عرض جميع التطبيقات
function displayAllApps() {
    const allAppsContainer = document.getElementById('all-apps');
    
    if (apps.length === 0) {
        allAppsContainer.innerHTML = '<p class="no-apps" style="text-align: center; color: #666; padding: 20px;">لا توجد تطبيقات في المتجر حالياً.</p>';
        return;
    }
    
    allAppsContainer.innerHTML = apps.map(app => createAppCard(app)).join('');
    
    // إضافة أحداث النقر
    document.querySelectorAll('#all-apps .app-card').forEach(card => {
        card.addEventListener('click', function() {
            const appId = parseInt(this.getAttribute('data-app-id'));
            showAppDetails(appId);
        });
    });
    
    // إضافة أحداث لأزرار التنزيل
    document.querySelectorAll('#all-apps .download-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const appId = parseInt(this.getAttribute('data-app-id'));
            downloadAppFromButton(appId);
        });
    });
}

// عرض تطبيقات المشرف
function displayAdminApps() {
    const adminAppsContainer = document.getElementById('admin-apps-list');
    
    if (!currentUser || currentUser.email !== ADMIN_ACCOUNT.email) {
        adminAppsContainer.innerHTML = '<p class="no-apps" style="text-align: center; color: #666; padding: 20px;">ليس لديك صلاحية الوصول.</p>';
        return;
    }
    
    const adminApps = apps.filter(app => app.uploader === currentUser.name);
    
    if (adminApps.length === 0) {
        adminAppsContainer.innerHTML = '<p class="no-apps" style="text-align: center; color: #666; padding: 20px;">لم تقم برفع أي تطبيقات بعد.</p>';
        return;
    }
    
    adminAppsContainer.innerHTML = adminApps.map(app => `
        <div class="admin-app-item" data-app-id="${app.id}">
            <div class="admin-app-info">
                <h5>${app.name} <small>(v${app.version})</small></h5>
                <p>${app.category} - ${app.date}</p>
            </div>
            <div class="admin-app-actions">
                <button class="update-app-btn" data-app-id="${app.id}">
                    <i class="fas fa-sync-alt"></i> تحديث
                </button>
                <button class="delete-app-btn" data-app-id="${app.id}">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.update-app-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const appId = parseInt(this.getAttribute('data-app-id'));
            openUpdateModal(appId);
        });
    });
    
    document.querySelectorAll('.delete-app-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const appId = parseInt(this.getAttribute('data-app-id'));
            deleteApp(appId);
        });
    });
}

// إنشاء بطاقة تطبيق
function createAppCard(app) {
    const iconHTML = app.iconImage 
        ? `<img src="${app.iconImage}" alt="${app.name}" class="app-icon-img">`
        : `<i class="${app.icon || 'fas fa-mobile-alt'}"></i>`;
    
    return `
        <div class="app-card" data-app-id="${app.id}">
            <div class="app-icon-container">
                ${iconHTML}
                ${app.version ? `<div class="app-version">v${app.version}</div>` : ''}
            </div>
            <div class="app-info">
                <h4>${app.name}</h4>
                <p class="app-category">${app.category}</p>
                <p class="app-description">${app.description}</p>
                <div class="app-footer">
                    <span class="app-uploader">بواسطة: ${app.uploader}</span>
                    <button class="download-btn" data-app-id="${app.id}">
                        <i class="fas fa-download"></i> تنزيل
                    </button>
                </div>
            </div>
        </div>
    `;
}

// تنزيل التطبيق من الزر
function downloadAppFromButton(appId) {
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
        showMessage('التطبيق غير موجود!', 'error');
        return;
    }
    
    showMessage(`جاري تنزيل ${app.name} v${app.version}...`, 'info');
}

// حذف تطبيق
function deleteApp(appId) {
    if (!confirm('هل أنت متأكد من حذف هذا التطبيق؟')) {
        return;
    }
    
    const appIndex = apps.findIndex(app => app.id === appId);
    
    if (appIndex === -1) {
        showMessage('التطبيق غير موجود!', 'error');
        return;
    }
    
    apps.splice(appIndex, 1);
    saveDataToStorage();
    
    displayFeaturedApps();
    displayAllApps();
    displayAdminApps();
    
    showMessage('تم حذف التطبيق بنجاح!', 'success');
}

// تصفية التطبيقات حسب البحث
function filterApps() {
    const searchTerm = document.getElementById('app-search').value.toLowerCase();
    const allAppsContainer = document.getElementById('all-apps');
    
    const filteredApps = apps.filter(app => 
        app.name.toLowerCase().includes(searchTerm) || 
        app.description.toLowerCase().includes(searchTerm) ||
        app.category.toLowerCase().includes(searchTerm)
    );
    
    if (filteredApps.length === 0) {
        allAppsContainer.innerHTML = '<p class="no-apps" style="text-align: center; color: #666; padding: 20px;">لا توجد تطبيقات تطابق بحثك.</p>';
        return;
    }
    
    allAppsContainer.innerHTML = filteredApps.map(app => createAppCard(app)).join('');
    
    // إضافة أحداث النقر
    document.querySelectorAll('#all-apps .app-card').forEach(card => {
        card.addEventListener('click', function() {
            const appId = parseInt(this.getAttribute('data-app-id'));
            showAppDetails(appId);
        });
    });
    
    // إضافة أحداث لأزرار التنزيل
    document.querySelectorAll('#all-apps .download-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const appId = parseInt(this.getAttribute('data-app-id'));
            downloadAppFromButton(appId);
        });
    });
}

// عرض تفاصيل التطبيق
function showAppDetails(appId) {
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
        showMessage('التطبيق غير موجود!', 'error');
        return;
    }
    
    document.getElementById('modal-app-title').textContent = app.name;
    document.getElementById('modal-app-name').textContent = app.name;
    document.getElementById('modal-app-category').textContent = `الفئة: ${app.category}`;
    document.getElementById('modal-app-description').textContent = app.description;
    document.getElementById('modal-app-uploader').textContent = `الرافع: ${app.uploader}`;
    document.getElementById('modal-app-date').textContent = `تاريخ الإصدار: ${app.date}`;
    document.getElementById('modal-app-version').textContent = `v${app.version}`;
    
    const modalIconFallback = document.getElementById('modal-app-icon-fallback');
    const modalIconImg = document.getElementById('modal-app-icon-img');
    
    if (app.iconImage) {
        modalIconImg.src = app.iconImage;
        modalIconImg.style.display = 'block';
        modalIconFallback.style.display = 'none';
    } else {
        modalIconFallback.className = app.icon || 'fas fa-mobile-alt';
        modalIconFallback.style.display = 'flex';
        modalIconImg.style.display = 'none';
    }
    
    document.getElementById('download-app-btn').setAttribute('data-app-id', appId);
    
    // عرض الصور إذا وجدت
    const screenshotsGallery = document.getElementById('screenshots-gallery');
    const galleryContainer = document.getElementById('gallery-container');
    
    if (app.screenshots && app.screenshots.length > 0) {
        screenshotsGallery.style.display = 'block';
        galleryContainer.innerHTML = app.screenshots.map((img, index) => `
            <div class="gallery-image">
                <img src="${img}" alt="صورة ${index + 1}" loading="lazy">
            </div>
        `).join('');
    } else {
        screenshotsGallery.style.display = 'none';
    }
    
    // عرض التحديثات إذا وجدت
    const updatesContainer = document.getElementById('updates-container');
    const updatesList = document.getElementById('updates-list');
    
    if (app.updates && app.updates.length > 0) {
        updatesContainer.style.display = 'block';
        updatesList.innerHTML = app.updates.map(update => `
            <div class="update-item">
                <div class="update-header">
                    <span class="update-version">الإصدار ${update.version}</span>
                    <span class="update-date">${update.date}</span>
                </div>
                <div class="update-notes">${update.notes}</div>
            </div>
        `).join('');
    } else {
        updatesContainer.style.display = 'none';
    }
    
    document.getElementById('app-details-modal').classList.add('active');
}

// تنزيل التطبيق (محاكاة)
function downloadApp() {
    const appId = parseInt(document.getElementById('download-app-btn').getAttribute('data-app-id'));
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
        showMessage('التطبيق غير موجود!', 'error');
        return;
    }
    
    showMessage(`جاري تنزيل ${app.name} v${app.version}...`, 'info');
    
    setTimeout(() => {
        document.getElementById('app-details-modal').classList.remove('active');
    }, 2000);
}

// حفظ بيانات احتياطية على Google Sheets
async function backupToGoogleSheets() {
    if (!confirm('هل تريد إنشاء نسخة احتياطية للبيانات على Google Sheets؟')) {
        return;
    }
    
    try {
        showSyncStatus('جاري إنشاء نسخة احتياطية...', 'info');
        
        const users = JSON.parse(localStorage.getItem('hooda_users') || '[]');
        const appsData = JSON.parse(localStorage.getItem('hooda_apps') || '[]');
        
        const dataToSave = {
            users: users,
            apps: appsData,
            backupDate: new Date().toISOString(),
            backupBy: currentUser ? currentUser.email : 'غير مسجل'
        };
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveData',
                type: 'backup',
                content: dataToSave
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showSyncStatus('تم إنشاء النسخة الاحتياطية بنجاح!', 'success');
                showMessage('تم حفظ البيانات على Google Sheets', 'success');
            } else {
                throw new Error(result.message);
            }
        } else {
            throw new Error('فشل الاتصال بالسيرفر');
        }
        
    } catch (error) {
        console.error('Error backing up data:', error);
        showSyncStatus('فشل في إنشاء النسخة الاحتياطية', 'error');
        showMessage('حدث خطأ أثناء حفظ البيانات: ' + error.message, 'error');
        
        // بديل: حفظ البيانات محلياً كملف
        saveLocalBackup(dataToSave);
    }
}

// حفظ نسخة احتياطية محلية
function saveLocalBackup(data) {
    try {
        const backupData = {
            ...data,
            localBackup: true,
            backupDate: new Date().toISOString()
        };
        
        localStorage.setItem('hooda_backup', JSON.stringify(backupData));
        showMessage('تم حفظ نسخة احتياطية محلية', 'info');
    } catch (e) {
        console.error('Error saving local backup:', e);
    }
}

// استعادة البيانات من Google Sheets
async function restoreFromGoogleSheets() {
    if (!confirm('هل تريد استعادة البيانات من النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية.')) {
        return;
    }
    
    try {
        showSyncStatus('جاري استعادة البيانات...', 'info');
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=loadData&type=backup&t=${Date.now()}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data) {
                const backupData = data.data;
                
                // استعادة المستخدمين
                if (backupData.users) {
                    localStorage.setItem('hooda_users', JSON.stringify(backupData.users));
                }
                
                // استعادة التطبيقات
                if (backupData.apps) {
                    localStorage.setItem('hooda_apps', JSON.stringify(backupData.apps));
                    apps = backupData.apps;
                    
                    // تحديث nextAppId
                    const maxId = apps.reduce((max, app) => Math.max(max, app.id), 0);
                    nextAppId = maxId + 1;
                }
                
                // تحديث الواجهة
                loadDataFromStorage();
                displayFeaturedApps();
                displayAllApps();
                
                if (currentUser && currentUser.email === ADMIN_ACCOUNT.email) {
                    displayAdminApps();
                }
                
                showSyncStatus('تم استعادة البيانات بنجاح!', 'success');
                showMessage('تم استعادة البيانات من النسخة الاحتياطية', 'success');
                
            } else {
                throw new Error('No backup data found');
            }
            
        } else {
            throw new Error('فشل الاتصال بالسيرفر');
        }
        
    } catch (error) {
        console.error('Error restoring data:', error);
        
        // محاولة الاستعادة من النسخة المحلية
        try {
            const localBackup = localStorage.getItem('hooda_backup');
            if (localBackup) {
                const backupData = JSON.parse(localBackup);
                
                if (backupData.users) {
                    localStorage.setItem('hooda_users', JSON.stringify(backupData.users));
                }
                
                if (backupData.apps) {
                    localStorage.setItem('hooda_apps', JSON.stringify(backupData.apps));
                    apps = backupData.apps;
                    
                    const maxId = apps.reduce((max, app) => Math.max(max, app.id), 0);
                    nextAppId = maxId + 1;
                }
                
                loadDataFromStorage();
                displayFeaturedApps();
                displayAllApps();
                
                if (currentUser && currentUser.email === ADMIN_ACCOUNT.email) {
                    displayAdminApps();
                }
                
                showSyncStatus('تم استعادة البيانات من النسخة المحلية!', 'success');
                showMessage('تم استعادة البيانات من النسخة المحلية', 'success');
            } else {
                throw new Error('لا توجد نسخة احتياطية');
            }
        } catch (localError) {
            showSyncStatus('فشل في استعادة البيانات', 'error');
            showMessage('لم يتم العثور على نسخة احتياطية', 'error');
        }
    }
}

// مسح جميع البيانات (للمشرف فقط)
function clearAllData() {
    if (!currentUser || currentUser.email !== ADMIN_ACCOUNT.email) {
        showMessage('ليس لديك صلاحية مسح البيانات!', 'error');
        return;
    }
    
    if (!confirm('هل أنت متأكد من مسح جميع البيانات؟ سيتم حذف جميع الحسابات والتطبيقات!')) {
        return;
    }
    
    // حفظ نسخة احتياطية قبل المسح
    backupToGoogleSheets();
    
    // مسح البيانات المحلية
    localStorage.removeItem('hooda_users');
    localStorage.removeItem('hooda_current_user');
    localStorage.removeItem('hooda_apps');
    
    currentUser = null;
    apps = [...DEFAULT_APPS];
    nextAppId = 5;
    uploadedImages = [];
    uploadedIconImage = "";
    
    const initialUsers = [ADMIN_ACCOUNT];
    localStorage.setItem('hooda_users', JSON.stringify(initialUsers));
    localStorage.setItem('hooda_apps', JSON.stringify(apps));
    
    checkLoggedInUser();
    updateDataStats();
    
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    document.getElementById('otp-section').style.display = 'none';
    document.getElementById('otp-display').style.display = 'none';
    document.getElementById('signup-submit').disabled = true;
    
    showMessage('تم مسح جميع البيانات بنجاح!', 'info');
}

// عرض حالة المزامنة
function showSyncStatus(message, type) {
    const statusEl = document.getElementById('sync-status');
    statusEl.textContent = message;
    statusEl.className = `sync-status sync-${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

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

// إصلاحات للجوال
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        document.getElementById('main-nav').classList.remove('active');
    }
});