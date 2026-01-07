// === تحسينات CORS ===
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // إنشاء رد CORS متوافق
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    // إعداد رؤوس CORS
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    let data;
    if (e.postData) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
    
    const action = data.action;
    
    // معالجة طلبات OPTIONS (Preflight)
    if (e.parameter && e.parameter['preflight'] === 'true') {
      return output.setContent(JSON.stringify({ success: true, message: 'CORS preflight successful' }));
    }
    
    if (action === 'saveUsers') {
      const result = saveUsersToSheet(data.users);
      output.setContent(JSON.stringify(result));
    } 
    else if (action === 'getUsers') {
      const result = loadUsersFromSheet();
      output.setContent(JSON.stringify(result));
    }
    else if (action === 'saveData') {
      const result = handleBackup(data);
      output.setContent(JSON.stringify(result));
    }
    else if (action === 'loadData') {
      const result = handleRestore();
      output.setContent(JSON.stringify(result));
    }
    else if (action === 'test') {
      output.setContent(JSON.stringify({ 
        success: true, 
        message: 'Google Apps Script is working!',
        timestamp: new Date().toISOString()
      }));
    }
    else {
      output.setContent(JSON.stringify({success: false, message: 'Invalid action'}));
    }
    
    return output;
    
  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({
      success: false, 
      message: error.toString(),
      stack: error.stack
    }));
    return output;
  }
}

// === دوال النسخ الاحتياطي ===
function handleBackup(data) {
  try {
    const ss = SpreadsheetApp.openById('1H6xuC_E_yqWU9j1ARV_Vq0AHzs5IXYsXsd0HTQCEIvc');
    const sheetName = 'Backup_' + new Date().toISOString().slice(0, 10).replace(/-/g, '_') + '_' + new Date().getTime();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const backupData = data.content;
    const backupString = JSON.stringify(backupData);
    
    sheet.getRange(1, 1).setValue('Backup Date: ' + new Date().toISOString());
    sheet.getRange(2, 1).setValue('Backup By: ' + (backupData.backupBy || 'Unknown'));
    sheet.getRange(3, 1).setValue(backupString);
    
    return {success: true, message: 'Backup saved successfully', sheetName: sheetName};
    
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}

function handleRestore() {
  try {
    const ss = SpreadsheetApp.openById('1H6xuC_E_yqWU9j1ARV_Vq0AHzs5IXYsXsd0HTQCEIvc');
    const sheets = ss.getSheets();
    const backupSheets = sheets.filter(s => s.getName().startsWith('Backup_'));
    
    if (backupSheets.length === 0) {
      return {success: false, message: 'No backups found'};
    }
    
    // الحصول على آخر نسخة احتياطية
    backupSheets.sort((a, b) => {
      const timeA = parseInt(a.getName().split('_').pop()) || 0;
      const timeB = parseInt(b.getName().split('_').pop()) || 0;
      return timeB - timeA;
    });
    
    const latestSheet = backupSheets[0];
    const backupString = latestSheet.getRange(3, 1).getValue();
    
    if (!backupString) {
      return {success: false, message: 'Backup data is empty'};
    }
    
    const backupData = JSON.parse(backupString);
    
    return {success: true, data: backupData, sheetName: latestSheet.getName()};
    
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}

// === دالة حفظ المستخدمين ===
function saveUsersToSheet(usersData) {
  try {
    console.log('Saving users to sheet:', usersData);
    
    // افتح جدول البيانات باستخدام ID الخاص بك
    const ss = SpreadsheetApp.openById('1H6xuC_E_yqWU9j1ARV_Vq0AHzs5IXYsXsd0HTQCEIvc');
    let sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      sheet = ss.insertSheet('Users');
      sheet.getRange(1, 1, 1, 8).setValues([[
        'ID', 'Name', 'Email', 'Phone', 'CountryCode', 
        'Password', 'JoinDate', 'IsAdmin'
      ]]);
    }
    
    // مسح البيانات القديمة (الصفوف من 2 إلى آخر صف)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 8).clear();
    }
    
    // كتابة البيانات الجديدة
    const data = usersData.map(user => [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.countryCode || '',
      user.password || '', // إضافة كلمة المرور
      user.joinDate,
      user.isAdmin || false
    ]);
    
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, 8).setValues(data);
    }
    
    return { 
      success: true, 
      count: usersData.length, 
      message: 'Users saved successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: error.toString(),
      stack: error.stack
    };
  }
}

// === دالة جلب المستخدمين ===
function loadUsersFromSheet() {
  try {
    console.log('Loading users from sheet');
    
    const ss = SpreadsheetApp.openById('1H6xuC_E_yqWU9j1ARV_Vq0AHzs5IXYsXsd0HTQCEIvc');
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      return { success: true, users: [], message: 'No Users sheet found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, users: [], message: 'No users in sheet' };
    }
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      users.push({
        id: row[0],
        name: row[1],
        email: row[2],
        phone: row[3],
        countryCode: row[4] || '+20',
        password: row[5] || '', // استعادة كلمة المرور
        joinDate: row[6],
        isAdmin: row[7] || false
      });
    }
    
    return { 
      success: true, 
      users: users,
      count: users.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: error.toString(),
      stack: error.stack
    };
  }
}

// === دالة للاختبار ===
function testFunctions() {
  console.log('Testing Google Apps Script functions...');
  
  // اختبار حفظ المستخدمين
  const testUsers = [
    {
      id: 1,
      name: "المشرف الرئيسي",
      email: "hooda2024g1@gmail.com",
      phone: "+201000000000",
      countryCode: "+20",
      password: "M13854672m#",
      joinDate: "2024-01-01",
      isAdmin: true
    },
    {
      id: Date.now(),
      name: "مستخدم اختبار",
      email: "test@example.com",
      phone: "+966500000000",
      countryCode: "+966",
      password: "test123",
      joinDate: new Date().toISOString().split('T')[0],
      isAdmin: false
    }
  ];
  
  const saveResult = saveUsersToSheet(testUsers);
  console.log('Test saveUsers:', saveResult);
  
  // اختبار جلب المستخدمين
  const users = loadUsersFromSheet();
  console.log('Test loadUsers:', users);
  
  return "All tests completed!";
}

// كود Google Apps Script الكامل

function doPost(e) {
  try {
    // السماح بـ CORS
    const response = ContentService.createTextOutput();
    response.setMimeType(ContentService.MimeType.JSON);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    let data;
    if (e.postData) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
    
    const action = data.action;
    
    if (action === 'saveUsers') {
      const result = saveUsersToSheet(data.users);
      response.setContent(JSON.stringify(result));
    } 
    else if (action === 'getUsers') {
      const result = loadUsersFromSheet();
      response.setContent(JSON.stringify(result));
    }
    else if (action === 'saveData') {
      const result = handleBackup(data);
      response.setContent(JSON.stringify(result));
    }
    else if (action === 'loadData') {
      const result = handleRestore();
      response.setContent(JSON.stringify(result));
    }
    else {
      response.setContent(JSON.stringify({success: false, message: 'Invalid action'}));
    }
    
  } catch (error) {
    const response = ContentService.createTextOutput();
    response.setMimeType(ContentService.MimeType.JSON);
    response.setContent(JSON.stringify({success: false, message: error.toString()}));
    return response;
  }
}

function doGet(e) {
  return doPost(e);
}

// === دالة حفظ المستخدمين ===
function saveUsersToSheet(usersData) {
  try {
    // افتح جدول البيانات باستخدام ID الخاص بك
    const ss = SpreadsheetApp.openById('1WybtwCEAh71CiMegfPHRMICKSB-MneAmZHQu8zzd91U');
    let sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      sheet = ss.insertSheet('Users');
      sheet.getRange(1, 1, 1, 7).setValues([['ID', 'Name', 'Email', 'Phone', 'CountryCode', 'JoinDate', 'IsAdmin']]);
    }
    
    // مسح البيانات القديمة (الصفوف من 2 إلى آخر صف)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 7).clear();
    }
    
    // كتابة البيانات الجديدة (بدون كلمة المرور لأسباب أمنية)
    const data = usersData.map(user => [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.countryCode || '',
      user.joinDate,
      user.isAdmin || false
    ]);
    
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, 7).setValues(data);
    }
    
    return { success: true, count: usersData.length, message: 'Users saved successfully' };
    
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// === دالة جلب المستخدمين ===
function loadUsersFromSheet() {
  try {
    const ss = SpreadsheetApp.openById('1WybtwCEAh71CiMegfPHRMICKSB-MneAmZHQu8zzd91U');
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      return { success: true, users: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, users: [] };
    }
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      users.push({
        id: row[0],
        name: row[1],
        email: row[2],
        phone: row[3],
        countryCode: row[4] || '+20',
        joinDate: row[5],
        isAdmin: row[6] || false,
        // كلمة المرور غير مخزنة في Google Sheets لأسباب أمنية
        // سيتم إضافتها يدوياً أو من خلال آلية أخرى
      });
    }
    
    return { success: true, users: users };
    
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// === دوال النسخ الاحتياطي ===
function handleBackup(data) {
  try {
    const ss = SpreadsheetApp.openById('1WybtwCEAh71CiMegfPHRMICKSB-MneAmZHQu8zzd91U');
    const sheetName = 'Backup_' + new Date().toISOString().slice(0, 10).replace(/-/g, '_') + '_' + new Date().getTime();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const backupData = data.content;
    const backupString = JSON.stringify(backupData);
    
    sheet.getRange(1, 1).setValue('Backup Date: ' + new Date().toISOString());
    sheet.getRange(2, 1).setValue('Backup By: ' + (backupData.backupBy || 'Unknown'));
    sheet.getRange(3, 1).setValue(backupString);
    
    return {success: true, message: 'Backup saved successfully', sheetName: sheetName};
    
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}

function handleRestore() {
  try {
    const ss = SpreadsheetApp.openById('1WybtwCEAh71CiMegfPHRMICKSB-MneAmZHQu8zzd91U');
    const sheets = ss.getSheets();
    const backupSheets = sheets.filter(s => s.getName().startsWith('Backup_'));
    
    if (backupSheets.length === 0) {
      return {success: false, message: 'No backups found'};
    }
    
    // الحصول على آخر نسخة احتياطية (مرتبة حسب الوقت)
    backupSheets.sort((a, b) => {
      const timeA = parseInt(a.getName().split('_').pop());
      const timeB = parseInt(b.getName().split('_').pop());
      return timeB - timeA;
    });
    
    const latestSheet = backupSheets[0];
    const backupString = latestSheet.getRange(3, 1).getValue();
    
    if (!backupString) {
      return {success: false, message: 'Backup data is empty'};
    }
    
    const backupData = JSON.parse(backupString);
    
    return {success: true, data: backupData, sheetName: latestSheet.getName()};
    
  } catch (error) {
    return {success: false, message: error.toString()};
  }
}

// === دالة للاختبار ===
function testFunctions() {
  console.log('Testing Google Apps Script functions...');
  
  // اختبار حفظ المستخدمين
  const testUsers = [
    {
      id: 1,
      name: "المشرف الرئيسي",
      email: "hooda2024g1@gmail.com",
      phone: "+201000000000",
      countryCode: "+20",
      joinDate: "2024-01-01",
      isAdmin: true
    },
    {
      id: Date.now(),
      name: "مستخدم اختبار",
      email: "test@example.com",
      phone: "+966500000000",
      countryCode: "+966",
      joinDate: new Date().toISOString().split('T')[0],
      isAdmin: false
    }
  ];
  
  const saveResult = saveUsersToSheet(testUsers);
  console.log('Test saveUsers:', saveResult);
  
  // اختبار جلب المستخدمين
  const users = loadUsersFromSheet();
  console.log('Test loadUsers:', users);
  
  // اختبار النسخ الاحتياطي
  const testBackupData = {
    users: testUsers,
    apps: [{name: "Test App", version: "1.0.0"}],
    backupDate: new Date().toISOString(),
    backupBy: "Test Script"
  };
  
  const backupResult = handleBackup({content: testBackupData});
  console.log('Test backup:', backupResult);
  
  // اختبار الاستعادة
  const restoreResult = handleRestore();
  console.log('Test restore:', restoreResult);
  
  return "All tests completed!";
}