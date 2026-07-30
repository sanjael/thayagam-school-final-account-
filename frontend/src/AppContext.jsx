import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    students: "Students",
    classes: "Classes",
    feeStructure: "Fee Structure",
    payments: "Payments",
    reports: "Reports",
    settings: "Settings",
    logout: "Log Out",
    
    // Login
    portalTitle: "Sri Thayagam Matriculation School",
    portalSubtitle: "Administrative Fee Management Portal",
    username: "Username",
    password: "Password",
    showPassword: "Show Password",
    rememberMe: "Remember Me",
    signIn: "Sign In to Portal",
    signingIn: "Authenticating...",
    invalidCredentials: "Invalid username or password ",
    accountDisabled: "This account has been disabled ",
    tamilError: "கடவுச்சொல் அல்லது பயனர்பெயர் தவறு ",
    
    // Dashboard
    welcomeTitle: "Dashboard Overview",
    welcomeSubtitle: "Welcome back. Here is an overview of school finances for active academic year.",
    todayCollected: "Today Collected",
    pendingFees: "Pending Dues",
    totalStudents: "Total Students",
    thisMonth: "This Month Collected",
    receipts: "Total Receipts",
    recentActivity: "Recent Fee Receipts",
    recentSub: "List of the latest school payments recorded.",
    viewAll: "View all payments",
    
    // Fee Collection
    feePayments: "Fee Payments",
    recordPayment: "Record New Payment",
    studentLookup: "Student Lookup",
    studentSearchPlaceholder: "Type name or admission number...",
    term: "Term",
    academicYear: "Academic Year",
    amountPaid: "Payment Amount",
    paymentDate: "Payment Date",
    paymentMode: "Payment Mode",
    notes: "Notes",
    notesPlaceholder: "Optional transaction details...",
    cancel: "Cancel",
    savePrint: "Save & Print Receipt",
    feeRecordStatus: "Fee Record Status",
    noFeeDefined: "No fee structure is defined for this class term/year.",
    paidInFull: "Paid in Full! ",
    due: "Due",
    successToast: "Fee collected successfully! ",
    
    // Common / Table Headers
    receiptCol: "Receipt",
    studentCol: "Student",
    classCol: "Class",
    termCol: "Term",
    totalFeeCol: "Total Fee",
    amountPaidCol: "Amount Paid",
    balanceCol: "Outstanding Balance",
    dateCol: "Date",
    modeCol: "Mode",
    printCol: "Print",
    actionsCol: "Actions",
    
    // Students Page
    addStudent: "Add New Student",
    editStudent: "Edit Student Details",
    registerStudent: "Register New Student",
    parentName: "Parent Name",
    phone: "Phone Number",
    gender: "Gender",
    dob: "Date of Birth",
    address: "Residential Address",
    searchStudentPlaceholder: "Search by name or admission no...",
    editBtn: "Edit",
    deactivateBtn: "Deactivate",
    activeStudents: "active students enrolled",
    
    // Classes Page
    classesHeading: "Classes Configuration",
    classSub: "Configure academic classes and grade sections.",
    className: "Class Grade Name",
    sectionName: "Section (Optional)",
    addClassBtn: "Add Class",
    
    // Reports Page
    reportsHeading: "Financial Reports",
    reportsSub: "Review school fee collection and outstanding balances.",
    pendingDuesTab: " Pending Dues",
    classCollectionsTab: " Class Collections",
    collectNow: "Collect Now",
    sendReminder: "Send Reminder",
    whatsappSent: "WhatsApp reminder template generated for parent! ",
    
    // Settings Page
    settingsSub: "Configure school properties shown on receipts and portal headers.",
    saveSettings: "Save School Configuration",
    schoolProfile: "Institution Profile",
    schoolNameLabel: "School Name",
    logoLabel: "School Logo",
    correspondent: "Correspondent Name",
    principal: "Principal Name",
  },
  ta: {
    // Navigation
    dashboard: "முகப்பு",
    students: "மாணவர்கள்",
    classes: "வகுப்புகள்",
    feeStructure: "கட்டண அமைப்பு",
    payments: "கட்டணங்கள்",
    reports: "அறிக்கைகள்",
    settings: "அமைப்புகள்",
    logout: "வெளியேறு",
    
    // Login
    portalTitle: "ஸ்ரீ தாயகம் மெட்ரிகுலேஷன் பள்ளி",
    portalSubtitle: "நிர்வாகக் கட்டண மேலாண்மை தளம்",
    username: "பயனர் பெயர்",
    password: "கடவுச்சொல்",
    showPassword: "கடவுச்சொல்லைக் காட்டு",
    rememberMe: "என்னை நினைவில் கொள்",
    signIn: "உள்நுழையவும்",
    signingIn: "சரிபார்க்கிறது...",
    invalidCredentials: "தவறான பயனர் பெயர் அல்லது கடவுச்சொல் ",
    accountDisabled: "இந்த கணக்கு முடக்கப்பட்டுள்ளது ",
    tamilError: "கடவுச்சொல் அல்லது பயனர்பெயர் தவறு ",
    
    // Dashboard
    welcomeTitle: "நிர்வாக முகப்புப்பலகை",
    welcomeSubtitle: "நல்வரவு. நடப்பு கல்வியாண்டிற்கான நிதி நிலைமை பற்றிய கண்ணோட்டம்.",
    todayCollected: "இன்று வசூலானது",
    pendingFees: "நிலுவைக் கட்டணம்",
    totalStudents: "மொத்த மாணவர்கள்",
    thisMonth: "இந்த மாத வசூல்",
    receipts: "மொத்த ரசீதுகள்",
    recentActivity: "சமீபத்திய கட்டண ரசீதுகள்",
    recentSub: "பதிவு செய்யப்பட்ட சமீபத்திய கட்டணங்களின் பட்டியல்.",
    viewAll: "அனைத்து கட்டணங்களையும் காண்க",
    
    // Fee Collection
    feePayments: "கட்டண ரசீதுகள்",
    recordPayment: "புதிய கட்டணம் செலுத்து",
    studentLookup: "மாணவர் தேடல்",
    studentSearchPlaceholder: "மாணவர் பெயர் அல்லது சேர்க்கை எண்...",
    term: "பருவம் (Term)",
    academicYear: "கல்வியாண்டு",
    amountPaid: "செலுத்தப்படும் தொகை",
    paymentDate: "செலுத்தப்பட்ட தேதி",
    paymentMode: "பணம் செலுத்தும் முறை",
    notes: "குறிப்புகள்",
    notesPlaceholder: "கூடுதல் பரிவர்த்தனை விபரங்கள்...",
    cancel: "ரத்து செய்",
    savePrint: "சேமித்து ரசீதை அச்சிடு",
    feeRecordStatus: "கல்விக் கட்டண விபரம்",
    noFeeDefined: "இந்த வகுப்பிற்கு இந்த பருவத்திற்கான கட்டணம் இன்னும் வரையறுக்கப்படவில்லை.",
    paidInFull: "முழுமையாக செலுத்தப்பட்டது! ",
    due: "நிலுவை",
    successToast: "கட்டணம் வெற்றிகரமாகப் பெறப்பட்டது! ",
    
    // Common / Table Headers
    receiptCol: "ரசீது எண்",
    studentCol: "மாணவர் பெயர்",
    classCol: "வகுப்பு",
    termCol: "பருவம்",
    totalFeeCol: "மொத்தக் கட்டணம்",
    amountPaidCol: "செலுத்திய தொகை",
    balanceCol: "நிலுவைத் தொகை",
    dateCol: "தேதி",
    modeCol: "வகை",
    printCol: "அச்சிடு",
    actionsCol: "செயல்கள்",
    
    // Students Page
    addStudent: "புதிய மாணவர் சேர்க்கை",
    editStudent: "மாணவர் விபரம் திருத்துக",
    registerStudent: "மாணவர் விபரங்களைச் சேமி",
    parentName: "பெற்றோர் பெயர்",
    phone: "தொலைபேசி எண்",
    gender: "பாலினம்",
    dob: "பிறந்த தேதி",
    address: "வீட்டு முகவரி",
    searchStudentPlaceholder: "பெயர் அல்லது சேர்க்கை எண் கொண்டு தேடுக...",
    editBtn: "திருத்து",
    deactivateBtn: "நீக்கு",
    activeStudents: "மாணவர்கள் சேர்க்கப்பட்டுள்ளனர்",
    
    // Classes Page
    classesHeading: "வகுப்புகள் கட்டமைப்பு",
    classSub: "பள்ளி வகுப்புகள் மற்றும் பிரிவுகளை நிர்வகித்தல்.",
    className: "வகுப்பின் பெயர்",
    sectionName: "பிரிவு (விருப்பத்திற்குரியது)",
    addClassBtn: "வகுப்பைச் சேர்",
    
    // Reports Page
    reportsHeading: "நிர்வாக அறிக்கைகள்",
    reportsSub: "பள்ளிக் கட்டண வசூல் மற்றும் நிலுவைத் தொகைகளை ஆய்வு செய்க.",
    pendingDuesTab: " நிலுவைக் கட்டணங்கள்",
    classCollectionsTab: " வகுப்புவாரியான வசூல்",
    collectNow: "கட்டணம் பெறு",
    sendReminder: "நினைவூட்டல்",
    whatsappSent: "பெற்றோருக்கு நினைவூட்டல் செய்தி அனுப்பப்பட்டது! ",
    
    // Settings Page
    settingsSub: "ரசீதுகள் மற்றும் முகப்புத் தலைப்பில் காட்டப்படும் பள்ளி விபரங்களை மாற்றுக.",
    saveSettings: "பள்ளி விபரங்களைச் சேமி",
    schoolProfile: "பள்ளியின் விபரம்",
    schoolNameLabel: "பள்ளியின் பெயர்",
    logoLabel: "பள்ளி லோகோ",
    correspondent: "தாளாளர் பெயர்",
    principal: "முதல்வர் பெயர்",
  }
};

export function AppProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || 'en');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const t = (key) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <AppContext.Provider value={{
      language, setLanguage,
      darkMode, setDarkMode,
      selectedStudentForPayment, setSelectedStudentForPayment,
      globalSearchQuery, setGlobalSearchQuery,
      t
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
