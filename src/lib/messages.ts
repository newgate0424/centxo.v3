export type SupportedLanguage = 'en' | 'th';

// Centralized message catalog for UI strings
export const messages: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.launch': 'Launch Campaign',
    'nav.campaigns': 'All Campaigns',
    'nav.accounts': 'Ad Accounts',
    'nav.settings': 'Settings',
    
    // Header
    'header.settings': 'Settings',
    'header.logout': 'Log out',
    
    // Language
    'language.th': 'Thai',
    'language.en': 'English',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Monitor your campaign performance',
    'dashboard.overview': 'Campaign Overview',
    'dashboard.totalCampaigns': 'Total Campaigns',
    'dashboard.totalSpend': 'Total Spend',
    'dashboard.totalMessages': 'Total Messages',
    'dashboard.activeCampaigns': 'Active Campaigns',
    'dashboard.averageCPC': 'Average CPC',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.recentCampaigns': 'Recent Campaigns',
    'dashboard.viewAll': 'View All',
    
    // Campaigns
    'campaigns.title': 'All Campaigns',
    'campaigns.subtitle': 'Manage and optimize your campaigns',
    'campaigns.newCampaign': 'New Campaign',
    'campaigns.tabs.campaigns': 'Campaigns',
    'campaigns.tabs.adsets': 'Ad Sets',
    'campaigns.tabs.ads': 'Ads',
    'campaigns.search': 'Search campaigns...',
    'campaigns.filter.allStatus': 'All Status',
    'campaigns.filter.active': 'Active',
    'campaigns.filter.paused': 'Paused',
    'campaigns.refresh': 'Refresh',
    'campaigns.export': 'Export',
    'campaigns.columns.number': '#',
    'campaigns.columns.toggle': 'ปิด/เปิด',
    'campaigns.columns.adAccount': 'Ad Acc',
    'campaigns.columns.name': 'Name',
    'campaigns.columns.status': 'Status',
    'campaigns.columns.spend': 'Spend',
    'campaigns.columns.messages': 'Messages',
    'campaigns.columns.costPerMessage': 'Cost/Msg',
    'campaigns.columns.budget': 'Budget',
    'campaigns.columns.created': 'Created',
    'campaigns.columns.actions': 'Actions',
    'campaigns.noCampaigns': 'No campaigns yet',
    'campaigns.noMatch': 'No campaigns match your filters',
    'campaigns.createFirst': 'Create Your First Campaign',
    
    // Launch
    'launch.title': 'Launch New Campaign',
    'launch.subtitle': 'Quick setup - AI handles the rest automatically',
    'launch.step1': '1. Upload File (One at a time)',
    'launch.step2': '2. Select Ad Account',
    'launch.step3': '3. Select Campaign Objective',
    'launch.step4': '4. Select Facebook Page',
    'launch.step5': '5. Set Budget',
    'launch.budgetType': 'Budget Type',
    'launch.dailyBudget': 'Daily Budget',
    'launch.lifetimeBudget': 'Lifetime Budget',
    'launch.amount': 'Amount',
    'launch.startDate': 'Start Date',
    'launch.endDate': 'End Date',
    'launch.create': 'Create Campaign',
    
    // Accounts
    'accounts.title': 'Ad Accounts',
    'accounts.subtitle': 'Manage your connected ad accounts',
    'accounts.connectNew': 'Connect New Account',
    'accounts.noAccounts': 'No ad accounts connected',
    'accounts.accountName': 'Account Name',
    'accounts.accountId': 'Account ID',
    'accounts.status': 'Status',
    'accounts.connected': 'Connected',
    'accounts.pages': 'Pages',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account settings',
    'settings.profile': 'Profile Settings',
    'settings.account': 'Account',
    'settings.name': 'Name',
    'settings.email': 'Email',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.saveChanges': 'Save Changes',
    'settings.saved': 'Settings saved successfully',
    'settings.danger': 'Danger Zone',
    'settings.deleteAccount': 'Delete Account',
    'settings.deleteWarning': 'This action cannot be undone. Please be certain.',
  },
  th: {
    // Navigation
    'nav.dashboard': 'แดชบอร์ด',
    'nav.launch': 'สร้างแคมเปญ',
    'nav.campaigns': 'แคมเปญทั้งหมด',
    'nav.accounts': 'บัญชีโฆษณา',
    'nav.settings': 'ตั้งค่า',
    
    // Header
    'header.settings': 'ตั้งค่า',
    'header.logout': 'ออกจากระบบ',
    
    // Language
    'language.th': 'ไทย',
    'language.en': 'อังกฤษ',
    
    // Dashboard
    'dashboard.title': 'แดชบอร์ด',
    'dashboard.subtitle': 'ตรวจสอบประสิทธิภาพของแคมเปญของคุณ',
    'dashboard.overview': 'ภาพรวมแคมเปญ',
    'dashboard.totalCampaigns': 'จำนวนแคมเปญทั้งหมด',
    'dashboard.totalSpend': 'ค่าใช้จ่ายทั้งหมด',
    'dashboard.totalMessages': 'จำนวนข้อความทั้งหมด',
    'dashboard.activeCampaigns': 'แคมเปญที่ใช้งาน',
    'dashboard.averageCPC': 'ค่า CPC เฉลี่ย',
    'dashboard.recentActivity': 'กิจกรรมล่าสุด',
    'dashboard.recentCampaigns': 'แคมเปญล่าสุด',
    'dashboard.viewAll': 'ดูทั้งหมด',
    
    // Campaigns
    'campaigns.title': 'แคมเปญทั้งหมด',
    'campaigns.subtitle': 'จัดการและปรับปรุงแคมเปญของคุณ',
    'campaigns.newCampaign': 'สร้างแคมเปญใหม่',
    'campaigns.tabs.campaigns': 'แคมเปญ',
    'campaigns.tabs.adsets': 'ชุดโฆษณา',
    'campaigns.tabs.ads': 'โฆษณา',
    'campaigns.search': 'ค้นหาแคมเปญ...',
    'campaigns.filter.allStatus': 'สถานะทั้งหมด',
    'campaigns.filter.active': 'ใช้งาน',
    'campaigns.filter.paused': 'หยุด',
    'campaigns.refresh': 'รีเฟรช',
    'campaigns.export': 'ส่งออก',
    'campaigns.columns.number': '#',
    'campaigns.columns.toggle': 'ปิด/เปิด',
    'campaigns.columns.adAccount': 'บัญชีโฆษณา',
    'campaigns.columns.name': 'ชื่อ',
    'campaigns.columns.status': 'สถานะ',
    'campaigns.columns.spend': 'ค่าใช้จ่าย',
    'campaigns.columns.messages': 'ข้อความ',
    'campaigns.columns.costPerMessage': 'ราคา/ข้อความ',
    'campaigns.columns.budget': 'งบประมาณ',
    'campaigns.columns.created': 'สร้างวันที่',
    'campaigns.columns.actions': 'การดำเนิน',
    'campaigns.noCampaigns': 'ยังไม่มีแคมเปญ',
    'campaigns.noMatch': 'ไม่มีแคมเปญที่ตรงกับตัวกรองของคุณ',
    'campaigns.createFirst': 'สร้างแคมเปญแรก',
    
    // Launch
    'launch.title': 'สร้างแคมเปญใหม่',
    'launch.subtitle': 'การตั้งค่าที่รวดเร็ว - AI จัดการอื่นๆ โดยอัตโนมัติ',
    'launch.step1': '1. อัปโหลดไฟล์ (ทีละไฟล์)',
    'launch.step2': '2. เลือกบัญชีโฆษณา',
    'launch.step3': '3. เลือกวัตถุประสงค์แคมเปญ',
    'launch.step4': '4. เลือก Facebook Page',
    'launch.step5': '5. กำหนดงบประมาณ',
    'launch.budgetType': 'ประเภทงบประมาณ',
    'launch.dailyBudget': 'งบประมาณต่อวัน',
    'launch.lifetimeBudget': 'งบประมาณตลอดอายุ',
    'launch.amount': 'จำนวน',
    'launch.startDate': 'วันเริ่มต้น',
    'launch.endDate': 'วันสิ้นสุด',
    'launch.create': 'สร้างแคมเปญ',
    
    // Accounts
    'accounts.title': 'บัญชีโฆษณา',
    'accounts.subtitle': 'จัดการบัญชีโฆษณาที่เชื่อมต่อ',
    'accounts.connectNew': 'เชื่อมต่อบัญชีใหม่',
    'accounts.noAccounts': 'ยังไม่มีบัญชีโฆษณาเชื่อมต่อ',
    'accounts.accountName': 'ชื่อบัญชี',
    'accounts.accountId': 'ID บัญชี',
    'accounts.status': 'สถานะ',
    'accounts.connected': 'เชื่อมต่อ',
    'accounts.pages': 'หน้า',
    
    // Settings
    'settings.title': 'ตั้งค่า',
    'settings.subtitle': 'จัดการการตั้งค่าบัญชีของคุณ',
    'settings.profile': 'การตั้งค่าโปรไฟล์',
    'settings.account': 'บัญชี',
    'settings.name': 'ชื่อ',
    'settings.email': 'อีเมล',
    'settings.language': 'ภาษา',
    'settings.theme': 'ธีม',
    'settings.saveChanges': 'บันทึกการเปลี่ยนแปลง',
    'settings.saved': 'บันทึกการตั้งค่าสำเร็จ',
    'settings.danger': 'โซนอันตราย',
    'settings.deleteAccount': 'ลบบัญชี',
    'settings.deleteWarning': 'ไม่สามารถยกเลิกการดำเนินการนี้ได้ โปรดตรวจสอบให้แน่ใจ',
  },
};

export function getMessage(lang: SupportedLanguage, key: string, fallback?: string): string {
  const parts = key.split('.');
  let current: any = messages[lang];

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback ?? key;
    }
  }

  return typeof current === 'string' ? current : fallback ?? key;
}
