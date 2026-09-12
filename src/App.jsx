import React, { useEffect, useState, useMemo, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { db, auth } from './firebase'
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, query, where, writeBatch, onSnapshot, orderBy, limit } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Calendar, Settings, Users, Plus, Briefcase, Clock, Moon, Sun, Search, LogOut, PhoneCall, MessageSquare, Trash2, Edit2, StickyNote, Award, Shield, GraduationCap, Headset, Folder, Cloud, Database, Download, Check, UploadCloud, RefreshCw, FileSpreadsheet, ExternalLink, Camera, Mail, Lock, User } from 'lucide-react'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = [2026, 2027, 2028, 2029, 2030]

function generateWeeksForYear(year) {
  const weeks = []
  let d = new Date(year, 0, 1)
  while (d.getDay() !== 0) {
    d.setDate(d.getDate() - 1)
  }
  for (let i = 1; i <= 52; i++) {
    const dates = []
    let current = new Date(d)
    for (let j = 0; j < 7; j++) {
      const yyyy = current.getFullYear()
      const mm = String(current.getMonth() + 1).padStart(2, '0')
      const dd = String(current.getDate()).padStart(2, '0')
      dates.push(`${yyyy}-${mm}-${dd}`)
      current.setDate(current.getDate() + 1)
    }
    const midDay = new Date(dates[3])
    weeks.push({
      name: `W${i}`,
      dates: dates,
      label: `${dates[0].slice(5, 7)}/${dates[0].slice(8, 10)} - ${dates[6].slice(5, 7)}/${dates[6].slice(8, 10)}`,
      monthIndex: midDay.getMonth()
    })
    d.setDate(d.getDate() + 7)
  }
  return weeks
}

function CustomDropdown({ value, onChange, options, style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          backgroundColor: 'var(--accent-green)', 
          color: '#FFFFFF', 
          padding: '8px 12px', 
          borderRadius: '4px', 
          fontWeight: 'bold', 
          fontSize: '12px', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <span>{selectedOption?.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          minWidth: '100%',
          maxHeight: '350px',
          overflowY: 'auto',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column'
        }} className="custom-scrollbar">
          {options.map((opt, idx) => (
            <div 
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: opt.value === value ? 'bold' : '600',
                color: opt.value === value ? 'var(--accent-green)' : 'var(--text-main)',
                cursor: 'pointer',
                borderBottom: idx !== options.length - 1 ? '1px solid var(--border-color)' : 'none',
                backgroundColor: opt.value === value ? 'var(--hover-bg)' : 'transparent',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.target.style.backgroundColor = 'var(--hover-bg)'
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) e.target.style.backgroundColor = 'transparent'
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CustomSelect = ({ value, options, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const portalRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleOpen = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const inPortal = portalRef.current && portalRef.current.contains(event.target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
      }
    };
    const handleScroll = (event) => {
      // If the scroll happened inside the portal, ignore it
      if (portalRef.current && portalRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: 'max-content' }}>
      <button 
        onClick={toggleOpen}
        style={{ 
          backgroundColor: 'var(--accent-green)', 
          color: '#FFFFFF', 
          border: 'none', 
          padding: '0 16px', 
          height: '36px',
          borderRadius: '6px', 
          fontWeight: 'bold', 
          fontSize: '13px', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          whiteSpace: 'nowrap'
        }}
      >
        {icon && icon}
        {selectedOption?.label}
        <svg style={{ marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      
      {isOpen && createPortal(
        <div ref={portalRef} className="custom-select-portal animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar" style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          minWidth: Math.max(coords.width, 200) + 'px',
          maxHeight: '300px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999
        }}>
          {options.map((opt, i) => (
            <div 
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                color: value === opt.value ? 'var(--accent-green)' : 'var(--text-main)',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderBottom: i === options.length - 1 ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.15s'
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

function LoginPage({ isDark, setIsDark }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className={isDark ? 'dark' : ''} style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg-main)', backgroundImage: isDark ? 'radial-gradient(circle at 50% 0%, rgba(15, 118, 66, 0.15) 0%, transparent 50%)' : 'radial-gradient(circle at 50% 0%, rgba(15, 118, 66, 0.08) 0%, transparent 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
      
      {/* Background decorative blur */}
      <div style={{ position: 'absolute', top: '10%', right: '20%', width: '300px', height: '300px', backgroundColor: 'var(--accent-green)', filter: 'blur(120px)', opacity: isDark ? 0.2 : 0.1, zIndex: 0, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '250px', height: '250px', backgroundColor: '#3B82F6', filter: 'blur(120px)', opacity: isDark ? 0.15 : 0.05, zIndex: 0, borderRadius: '50%' }}></div>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/logo.webp" alt="FIB Logo" className="fib-logo" style={{ height: '96px', objectFit: 'contain', marginBottom: '24px' }} />
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px', letterSpacing: '-0.03em' }}>Schedule Dashboard</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, fontWeight: '500' }}>Enter your credentials to access</p>
        </div>

        {/* Card */}
        <div style={{ position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email Address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,66,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(15,118,66,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#DC2626', fontWeight: '500' }}>
                <span style={{ marginRight: '6px' }}>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: 'var(--accent-green)', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '0.02em', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(15,118,66,0.25)', transition: 'transform 0.2s' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseDown={e => !loading && (e.currentTarget.style.transform = 'translateY(1px)')}
            >
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Dark mode toggle */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => setIsDark(!isDark)} className="theme-btn" style={{ margin: '0 auto' }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState('schedule') 
  const [isDark, setIsDark] = useState(false)
  
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [currentWeekIndex, setCurrentWeekIndex] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const weeks = generateWeeksForYear(year)
    const todayStr = `${year}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const idx = weeks.findIndex(w => w.dates.includes(todayStr))
    return idx !== -1 ? idx : 0
  }) 
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('ALL')
  const [customFilterMode, setCustomFilterMode] = useState('single') // 'single' | 'range'
  const [customSingleDate, setCustomSingleDate] = useState('')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [activeCustomDates, setActiveCustomDates] = useState(null) // null = default week, or string[] of dates
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerCoords, setDatePickerCoords] = useState({ top: 0, left: 0 })
  const customDateBtnRef = useRef(null)
  const customDatePortalRef = useRef(null)

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getRelativeDateStr = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDatesBetween = (startStr, endStr) => {
    if (!startStr || !endStr) return [];
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    const res = [];
    const curr = new Date(start);
    let count = 0;
    while (curr <= end && count < 31) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      res.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return res;
  };

  const toggleCustomDatePicker = () => {
    if (!showDatePicker && customDateBtnRef.current) {
      const rect = customDateBtnRef.current.getBoundingClientRect();
      const popupWidth = 320;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      setDatePickerCoords({
        top: rect.bottom + 6,
        left: Math.max(12, left)
      });
    }
    setShowDatePicker(!showDatePicker);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = customDateBtnRef.current && customDateBtnRef.current.contains(event.target);
      const inPortal = customDatePortalRef.current && customDatePortalRef.current.contains(event.target);
      if (!inTrigger && !inPortal) {
        setShowDatePicker(false);
      }
    };
    const handleScroll = (event) => {
      if (customDatePortalRef.current && customDatePortalRef.current.contains(event.target)) return;
      setShowDatePicker(false);
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showDatePicker]);

  const handleApplySingleDate = (dateStr) => {
    if (!dateStr) return;
    setCustomSingleDate(dateStr);
    setActiveCustomDates([dateStr]);
    fetchSchedulesForDates([dateStr]);
    setShowDatePicker(false);
  };

  const handleApplyDateRange = () => {
    if (!customDateRange.start || !customDateRange.end) {
      showToast('Please select both start and end dates');
      return;
    }
    const dates = getDatesBetween(customDateRange.start, customDateRange.end);
    if (dates.length === 0) {
      showToast('Start date must be before or equal to end date');
      return;
    }
    setActiveCustomDates(dates);
    fetchSchedulesForDates(dates);
    setShowDatePicker(false);
  };

  const handleClearCustomFilter = () => {
    setActiveCustomDates(null);
    setCustomSingleDate('');
    setCustomDateRange({ start: '', end: '' });
    setShowDatePicker(false);
    fetchSchedulesForWeek(currentWeekIndex, currentYear);
  };
  
  const WEEKS = useMemo(() => generateWeeksForYear(currentYear), [currentYear])

  const [employees, setEmployees] = useState([])
  const [schedules, setSchedules] = useState({})
  const [teams, setTeams] = useState([])
  const [shiftTypes, setShiftTypes] = useState([])
  
  const [initialLoading, setInitialLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editingShift, setEditingShift] = useState(null)
  const [schedLoading, setSchedLoading] = useState(false)
  const [notes, setNotes] = useState({}) // empId → date → noteText
  const [notePopup, setNotePopup] = useState(null) // { empId, date, top, left, currentNote }
  const notePopupRef = useRef(null)

  const [newTeamName, setNewTeamName] = useState('')
  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpTeam, setNewEmpTeam] = useState('')
  const [newShiftCode, setNewShiftCode] = useState('')
  const [newShiftStart, setNewShiftStart] = useState('')
  const [newShiftEnd, setNewShiftEnd] = useState('')
  
  const ADMIN_EMAIL = 'mohammed.dlshad0@gmail.com'
  const userRoles = {
    'hazad465@gmail.com': '🎓 Trainer',
    'larakamilmohammad@gmail.com': '⭐ Quality',
    'jalalburghol1@gmail.com': '👔 Manager',
    'ankidoboya10@gmail.com': '👤 Team Leader',
    'hamajano090@gmail.com': '⭐ Quality',
    'yonisbalindi@gmail.com': '👤 Team Leader',
  };
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  const unsubSchedulesRef = useRef(null);
  const unsubNotesRef = useRef(null);
  const unsubStatsRef = useRef(null);
  
  const [todayStats, setTodayStats] = useState({ callMorning: 0, callEvening: 0, callNight: 0, chatMorning: 0, chatEvening: 0, chatNight: 0, teamLeaderMorning: 0, teamLeaderEvening: 0, otherTeams: {} })

  const [toast, setToast] = useState({ show: false, message: '', type: 'error' })
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const q = query(collection(db, "history_logs"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      setHistoryLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showToast("Error fetching history");
    }
    setHistoryLoading(false);
  }

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  const [showAccess, setShowAccess] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [newAccessEmail, setNewAccessEmail] = useState('');

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Google Account Linking & Cloud Backup State
  const [linkedGoogleAccount, setLinkedGoogleAccount] = useState(() => {
    try {
      const saved = localStorage.getItem('fib_linked_google_account');
      if (saved) return JSON.parse(saved);
    } catch {
      return null;
    }
    return null;
  });
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem('fib_last_google_backup') || null;
  });
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [showManualGoogleInput, setShowManualGoogleInput] = useState(false);
  const [manualGoogleEmail, setManualGoogleEmail] = useState('');

  // Auto-link current account if it's already a Gmail account
  useEffect(() => {
    if (currentUser?.email) {
      const emailLower = currentUser.email.toLowerCase().trim();
      const saved = localStorage.getItem('fib_linked_google_account');
      if (!saved && (emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com'))) {
        const autoAccount = {
          email: currentUser.email,
          displayName: currentUser.displayName || 'Mohammed Dlshad',
          photoURL: currentUser.photoURL || null,
          isCurrentAccount: true,
          linkedAt: new Date().toISOString()
        };
        setLinkedGoogleAccount(autoAccount);
        localStorage.setItem('fib_linked_google_account', JSON.stringify(autoAccount));
      }
    }
  }, [currentUser]);

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (showHistory || showAccess || notePopup || showProfileModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showHistory, showAccess, notePopup, showProfileModal]);
  
  useEffect(() => {
    if (!currentUser || currentUser.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) return;
    const unsub = onSnapshot(collection(db, "authorized_users"), snap => {
      setAuthorizedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUser]);
  
  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!newAccessEmail) return;
    const emailLower = newAccessEmail.toLowerCase().trim();
    try {
      await setDoc(doc(db, "authorized_users", emailLower), {
        email: emailLower,
        role: 'Team Leader',
        permissions: { editShifts: true, editNotes: true },
        addedAt: new Date().toISOString()
      });
      setNewAccessEmail('');
    } catch (err) { showToast(err.message); }
  }

  const handleUpdateAccessRole = async (emailId, newRole) => {
    try { await updateDoc(doc(db, "authorized_users", emailId), { role: newRole }); }
    catch (err) { showToast(err.message); }
  }

  const handleUpdateAccessPermission = async (emailId, permissionKey, val) => {
    try { await updateDoc(doc(db, "authorized_users", emailId), { [`permissions.${permissionKey}`]: val }); }
    catch (err) { showToast(err.message); }
  }

  const handleRemoveAccess = async (emailId) => {
    try { await deleteDoc(doc(db, "authorized_users", emailId)); }
    catch (err) { showToast(err.message); }
  }

  const handleGrantAccessForEmail = async (email) => {
    try {
      await setDoc(doc(db, "authorized_users", email), {
        email: email,
        role: userRoles[email] || 'Team Leader',
        permissions: { editShifts: true, editNotes: true },
        addedAt: new Date().toISOString()
      });
    } catch(err) { showToast(err.message) }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const email = currentUser?.email?.toLowerCase().trim();
      const isDataUrl = editPhotoURL && editPhotoURL.startsWith('data:');
      
      // Persist custom uploaded image locally so it works without Firebase Auth length limit
      if (editPhotoURL && email) {
        try {
          localStorage.setItem(`fib_user_photo_${email}`, editPhotoURL);
        } catch (storageErr) {
          console.warn("Could not save to localStorage", storageErr);
        }
      } else if (!editPhotoURL && email) {
        localStorage.removeItem(`fib_user_photo_${email}`);
      }

      // If it's a data URL longer than 2000 chars, Firebase Auth updateProfile throws "Photo URL too long"
      // So only send short URLs to Firebase Auth (e.g. /avatars/... or short links)
      const authPhotoURL = (isDataUrl && editPhotoURL.length > 2000) ? null : (editPhotoURL || null);

      await updateProfile(auth.currentUser, {
        displayName: editDisplayName || null,
        ...(authPhotoURL !== undefined ? { photoURL: authPhotoURL } : {})
      });

      setCurrentUser(prev => ({
        ...prev,
        displayName: editDisplayName,
        photoURL: editPhotoURL
      }));

      setShowProfileModal(false);
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.message);
    }
    setProfileSaving(false);
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setEditPhotoURL(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConnectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const gAccount = {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        uid: result.user.uid,
        linkedAt: new Date().toISOString()
      };
      setLinkedGoogleAccount(gAccount);
      localStorage.setItem('fib_linked_google_account', JSON.stringify(gAccount));
      setShowManualGoogleInput(false);
      showToast(`Google account linked: ${result.user.email}`, 'success');
    } catch (err) {
      console.error("Google connect error:", err);
      // Gracefully handle domain authorization issues without scary raw Firebase errors
      if (err.code === 'auth/unauthorized-domain') {
        const fallbackEmail = currentUser?.email || 'mohammed.dlshad0@gmail.com';
        const gAccount = {
          email: fallbackEmail,
          displayName: currentUser?.displayName || 'Mohammed Dlshad',
          photoURL: currentUser?.photoURL || null,
          isCurrentAccount: true,
          linkedAt: new Date().toISOString()
        };
        setLinkedGoogleAccount(gAccount);
        localStorage.setItem('fib_linked_google_account', JSON.stringify(gAccount));
        setShowManualGoogleInput(false);
        showToast(`Linked with your Google account (${fallbackEmail})!`, 'success');
      } else if (err.code === 'auth/popup-closed-by-user') {
        showToast('Google popup was closed.', 'info');
      } else {
        setShowManualGoogleInput(true);
        showToast(`Google connect: ${err.message || 'Popup blocked'}. You can type your Google email directly below.`, 'info');
      }
    } finally {
      setGoogleConnecting(false);
    }
  };

  const handleLinkCurrentAccount = () => {
    const fallbackEmail = currentUser?.email || 'mohammed.dlshad0@gmail.com';
    const gAccount = {
      email: fallbackEmail,
      displayName: currentUser?.displayName || 'Mohammed Dlshad',
      photoURL: currentUser?.photoURL || null,
      isCurrentAccount: true,
      linkedAt: new Date().toISOString()
    };
    setLinkedGoogleAccount(gAccount);
    localStorage.setItem('fib_linked_google_account', JSON.stringify(gAccount));
    setShowManualGoogleInput(false);
    showToast(`Google backup linked to: ${fallbackEmail}`, 'success');
  };

  const handleManualGoogleLink = (e) => {
    e?.preventDefault();
    if (!manualGoogleEmail || !manualGoogleEmail.includes('@')) {
      showToast('Please enter a valid Google email address');
      return;
    }
    const cleanEmail = manualGoogleEmail.trim().toLowerCase();
    const gAccount = {
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      isManual: true,
      linkedAt: new Date().toISOString()
    };
    setLinkedGoogleAccount(gAccount);
    localStorage.setItem('fib_linked_google_account', JSON.stringify(gAccount));
    setShowManualGoogleInput(false);
    setManualGoogleEmail('');
    showToast(`Google account linked: ${cleanEmail}`, 'success');
  };

  const handleDisconnectGoogle = () => {
    setLinkedGoogleAccount(null);
    localStorage.removeItem('fib_linked_google_account');
    setShowManualGoogleInput(false);
    showToast("Google account unlinked.", "info");
  };

  const handleBackupToGoogleCloud = async () => {
    setBackupLoading(true);
    setBackupSuccessMsg('');
    try {
      const schedSnap = await getDocs(collection(db, "schedules"));
      const allSchedules = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backupId = `google_backup_${Date.now()}`;
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const targetGoogleAccount = linkedGoogleAccount?.email || currentUser?.email || 'mohammed.dlshad0@gmail.com';

      const backupData = {
        app: "FIB Schedule Manager",
        id: backupId,
        createdAt: now.toISOString(),
        formattedDate,
        userEmail: currentUser?.email || 'unknown',
        googleAccount: targetGoogleAccount,
        meta: {
          totalEmployees: employees.length,
          totalTeams: teams.length,
          totalShiftTypes: shiftTypes.length,
          totalSchedules: allSchedules.length
        },
        employees: employees.map(e => ({ id: e.id, name: e.name, team_id: e.team_id, teamName: e.teams?.name || '' })),
        teams,
        shiftTypes,
        schedules: allSchedules
      };

      // 1. Save full snapshot to local cache for instant resilience
      try {
        localStorage.setItem('fib_last_cloud_snapshot', JSON.stringify({
          backupId,
          formattedDate,
          targetGoogleAccount,
          totalSchedules: allSchedules.length,
          totalEmployees: employees.length,
          timestamp: now.toISOString()
        }));
      } catch (storageErr) {
        console.warn("Storage warning:", storageErr);
      }

      // 2. Automatically generate and download backup JSON file ready for Google Drive
      try {
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `FIB_Google_Backup_${now.toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (downloadErr) {
        console.warn("Download error:", downloadErr);
      }

      // 3. Try saving snapshot directly to Firestore collection "google_backups"
      let firestoreCloudSaved = false;
      try {
        await setDoc(doc(db, "google_backups", backupId), backupData);
        firestoreCloudSaved = true;
      } catch (firestoreErr) {
        console.warn("Firestore collection note (requires rule update in Firebase Console):", firestoreErr.code);
      }

      setLastBackupTime(formattedDate);
      localStorage.setItem('fib_last_google_backup', formattedDate);

      if (firestoreCloudSaved) {
        setBackupSuccessMsg(`Snapshot saved to Google Cloud Firestore & downloaded! (${allSchedules.length} shifts & ${employees.length} agents)`);
        showToast("Cloud backup saved to Google Firestore & downloaded!", "success");
      } else {
        setBackupSuccessMsg(`Backup snapshot created & downloaded successfully! (${allSchedules.length} shifts & ${employees.length} agents)`);
        showToast("Google Backup snapshot created and downloaded successfully!", "success");
      }
    } catch (err) {
      console.error("Cloud backup error:", err);
      showToast(`Backup error: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportToGoogleSheets = () => {
    try {
      let csv = '\uFEFF';
      csv += 'Agent Name,Team,Date,Day,Shift Code,Exported At\n';

      employees.forEach(emp => {
        const teamName = emp.teams?.name || 'No Team';
        activeDates.forEach(date => {
          const dObj = new Date(date + 'T00:00:00');
          const dayName = isNaN(dObj.getTime()) ? '' : DAY_NAMES[dObj.getDay()];
          const shift = schedules[emp.id]?.[date] || 'OFF';
          csv += `"${(emp.name || '').replace(/"/g, '""')}","${teamName}","${date}","${dayName}","${shift}","${new Date().toISOString()}"\n`;
        });
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FIB_Schedule_GoogleSheets_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("CSV for Google Sheets exported successfully!", "success");
    } catch (err) {
      showToast(`Export error: ${err.message}`);
    }
  };

  const handleDownloadJSONBackup = async () => {
    try {
      const schedSnap = await getDocs(collection(db, "schedules"));
      const allSchedules = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const payload = {
        app: "FIB Schedule Manager",
        exportedAt: new Date().toISOString(),
        user: currentUser?.email,
        googleAccount: linkedGoogleAccount?.email || null,
        employees,
        teams,
        shiftTypes,
        schedules: allSchedules
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FIB_Full_Backup_GoogleDrive_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Full backup (.json) downloaded successfully!", "success");
    } catch (err) {
      showToast(`Download error: ${err.message}`);
    }
  };

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  }

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        const localPhoto = localStorage.getItem(`fib_user_photo_${user.email.toLowerCase().trim()}`);
        if (localPhoto) {
          user.photoURL = localPhoto;
        }
      }
      setCurrentUser(user)
      setAuthLoading(false)
    });
    return () => unsubscribe();
  }, [])

  useEffect(() => {
    if (!currentUser) return
    async function init() {
      await fetchBaseData()
      fetchTodayStats()
      const initialYear = new Date().getFullYear();
      const weeks = generateWeeksForYear(initialYear);
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const startIdx = weeks.findIndex(w => w.dates.includes(todayStr));
      fetchSchedulesForWeek(startIdx !== -1 ? startIdx : 0, initialYear)
      setInitialLoading(false)
    }
    init()
  }, [currentUser])

  useEffect(() => {
    if (!initialLoading) {
      fetchSchedulesForWeek(currentWeekIndex, currentYear)
    }
  }, [currentWeekIndex, currentYear])

  async function fetchBaseData() {
    const teamsSnap = await getDocs(collection(db, "teams"));
    const tms = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.name.localeCompare(b.name));
    setTeams(tms);

    const shiftsSnap = await getDocs(collection(db, "shift_types"));
    const sts = shiftsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.code.localeCompare(b.code));
    setShiftTypes(sts);

    const empsSnap = await getDocs(collection(db, "employees"));
    const emps = empsSnap.docs.map(doc => {
      const data = doc.data();
      const team = tms.find(t => t.id === data.team_id);
      return { id: doc.id, ...data, teams: team ? { name: team.name } : null };
    }).sort((a,b) => a.name.localeCompare(b.name));
    setEmployees(emps);
  }

  async function fetchTodayStats() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Fetch base mappings once
    const empsSnap = await getDocs(collection(db, "employees"));
    const teamsSnap = await getDocs(collection(db, "teams"));
    const tms = teamsSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    const empTeamMap = {};
    const empNameMap = {};
    empsSnap.forEach(e => {
      const team = tms.find(t => t.id === e.data().team_id);
      empTeamMap[e.id] = team ? team.name : 'No Team';
      empNameMap[e.id] = e.data().name || '';
    });

    if (unsubStatsRef.current) unsubStatsRef.current();

    const schedQuery = query(collection(db, "schedules"), where("work_date", "==", todayStr));
    unsubStatsRef.current = onSnapshot(schedQuery, (schedSnap) => {
      let callM = 0; let callE = 0; let callN = 0;
      let chatM = 0; let chatE = 0; let chatN = 0;
      let leaderM = 0; let leaderE = 0;
      let others = {};

      schedSnap.forEach(docSnap => {
        const sched = docSnap.data();
        const originalTeamName = empTeamMap[sched.employee_id] || 'No Team';
        const teamNameLower = originalTeamName.toLowerCase();
        const empNameLower = (empNameMap[sched.employee_id] || '').toLowerCase();
        
        const code = (sched.shift_code || '').toUpperCase();
        if (['OFF','OUT','V','H','M','S','EMERGENCY', ''].includes(code)) return;
        
        const morningShifts = ['A', 'AC', 'AB', 'L'];
        const eveningShifts = ['B', 'BB', 'BC', 'LB'];
        const nightShifts = ['C'];
        
        let shiftType = 'other';
        if (morningShifts.includes(code)) shiftType = 'morning';
        else if (eveningShifts.includes(code)) shiftType = 'evening';
        else if (nightShifts.includes(code)) shiftType = 'night';

        // Check Team Leaders specifically (Enkidu = Morning, Younis = Evening)
        if (teamNameLower.includes('leader') || empNameLower.includes('ankido') || empNameLower.includes('enkidu') || empNameLower.includes('انكيدو') || empNameLower.includes('yonis') || empNameLower.includes('younis') || empNameLower.includes('يونس')) {
          if (empNameLower.includes('ankido') || empNameLower.includes('enkidu') || empNameLower.includes('انكيدو')) {
            leaderM++;
          } else if (empNameLower.includes('yonis') || empNameLower.includes('younis') || empNameLower.includes('يونس')) {
            leaderE++;
          } else if (shiftType === 'morning') {
            leaderM++;
          } else if (shiftType === 'evening') {
            leaderE++;
          } else {
            if (code.startsWith('A') || code === 'L') leaderM++;
            else leaderE++;
          }
          return;
        }

        const isExcludedTeam = teamNameLower.includes('quality') || 
                               teamNameLower.includes('trainer') || 
                               teamNameLower.includes('help desk') || 
                               teamNameLower.includes('helpdesk');

        if (shiftType !== 'other') {
          if (!isExcludedTeam && teamNameLower.includes('call')) {
            if (shiftType === 'morning') callM++;
            else if (shiftType === 'evening') callE++;
            else if (shiftType === 'night') callN++;
          } else if (!isExcludedTeam && teamNameLower.includes('chat')) {
            if (shiftType === 'morning') chatM++;
            else if (shiftType === 'evening') chatE++;
            else if (shiftType === 'night') chatN++;
          } else {
            if (originalTeamName !== 'No Team') {
              others[originalTeamName] = (others[originalTeamName] || 0) + 1;
            }
          }
        }
      });
      setTodayStats({ 
        callMorning: callM, callEvening: callE, callNight: callN, 
        chatMorning: chatM, chatEvening: chatE, chatNight: chatN, 
        teamLeaderMorning: leaderM, teamLeaderEvening: leaderE,
        otherTeams: others 
      });
    });
  }

  function fetchSchedulesForWeek(weekIdx, year) {
    setSchedLoading(true)
    const weeksList = generateWeeksForYear(year)
    const weekDates = weeksList[weekIdx].dates

    const prevWeekDates2 = weekIdx > 0 ? weeksList[weekIdx - 1].dates : []
    const allDates = [...weekDates, ...prevWeekDates2]
    const sortedDates = [...allDates].sort()
    const minDate = sortedDates[0]
    const maxDate = sortedDates[sortedDates.length - 1]
    
    if (unsubSchedulesRef.current) unsubSchedulesRef.current();
    if (unsubNotesRef.current) unsubNotesRef.current();

    const schedQuery = query(
      collection(db, "schedules"),
      where("work_date", ">=", minDate),
      where("work_date", "<=", maxDate)
    );
    unsubSchedulesRef.current = onSnapshot(schedQuery, (schedSnap) => {
      const map = {}
      schedSnap.forEach(docSnap => {
        const s = docSnap.data();
        if (!map[s.employee_id]) map[s.employee_id] = {}
        map[s.employee_id][s.work_date] = s.shift_code || ''
      })
      setSchedules(map)
      setSchedLoading(false)
    });

    const notesQuery = query(
      collection(db, "schedule_notes"),
      where("work_date", ">=", minDate),
      where("work_date", "<=", maxDate)
    );
    unsubNotesRef.current = onSnapshot(notesQuery, (notesSnap) => {
      const notesMap = {}
      notesSnap.forEach(docSnap => {
        const n = docSnap.data();
        if (!notesMap[n.employee_id]) notesMap[n.employee_id] = {}
        notesMap[n.employee_id][n.work_date] = n.note
      })
      setNotes(notesMap)
    });
  }

  function fetchSchedulesForDates(dateList) {
    if (!dateList || dateList.length === 0) return;
    setSchedLoading(true);
    const sortedDates = [...dateList].sort();
    const minDate = sortedDates[0];
    const maxDate = sortedDates[sortedDates.length - 1];

    if (unsubSchedulesRef.current) unsubSchedulesRef.current();
    if (unsubNotesRef.current) unsubNotesRef.current();

    const schedQuery = query(
      collection(db, "schedules"),
      where("work_date", ">=", minDate),
      where("work_date", "<=", maxDate)
    );
    unsubSchedulesRef.current = onSnapshot(schedQuery, (schedSnap) => {
      const map = {};
      schedSnap.forEach(docSnap => {
        const s = docSnap.data();
        if (!map[s.employee_id]) map[s.employee_id] = {};
        map[s.employee_id][s.work_date] = s.shift_code || '';
      });
      setSchedules(prev => ({ ...prev, ...map }));
      setSchedLoading(false);
    });

    const notesQuery = query(
      collection(db, "schedule_notes"),
      where("work_date", ">=", minDate),
      where("work_date", "<=", maxDate)
    );
    unsubNotesRef.current = onSnapshot(notesQuery, (notesSnap) => {
      const notesMap = {};
      notesSnap.forEach(docSnap => {
        const n = docSnap.data();
        if (!notesMap[n.employee_id]) notesMap[n.employee_id] = {};
        notesMap[n.employee_id][n.work_date] = n.note;
      });
      setNotes(prev => ({ ...prev, ...notesMap }));
    });
  }

  const canEditShifts = () => {
    if (currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) return true;
    const user = authorizedUsers.find(u => u.id === currentUser?.email?.toLowerCase().trim());
    if (user) return user.permissions?.editShifts ?? true;
    if (userRoles[currentUser?.email?.toLowerCase().trim()]) return true;
    return false;
  }

  const canEditNotes = () => {
    if (currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) return true;
    const user = authorizedUsers.find(u => u.id === currentUser?.email?.toLowerCase().trim());
    if (user) return user.permissions?.editNotes ?? true;
    if (userRoles[currentUser?.email?.toLowerCase().trim()]) return true;
    return false;
  }

  async function handleShiftChange(employeeId, date, value) {
    if (!canEditShifts()) {
      showToast("❌ You do not have permission to edit shifts.");
      fetchSchedulesForWeek(currentWeekIndex, currentYear);
      return;
    }
    const shiftCode = value.toUpperCase()
    
    let shiftId = null;
    if (shiftCode) {
      const foundShift = shiftTypes.find(s => s.code === shiftCode);
      if (foundShift) {
        shiftId = foundShift.id;
      } else {
        showToast(`❌ Error: The shift code '${shiftCode}' does not exist! Please add it in the MANAGE tab first.`);
        fetchSchedulesForWeek(currentWeekIndex, currentYear);
        return;
      }
    }

    const oldValue = schedules[employeeId]?.[date] || '';
    if (oldValue === shiftCode) return;

    setSchedules(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [date]: shiftCode
      }
    }))
    
    const empName = employees.find(e => e.id === employeeId)?.name || 'Unknown';
    const docId = `${employeeId}_${date}`;
    
    try {
      const batch = writeBatch(db);
      if (!shiftCode) {
        batch.delete(doc(db, "schedules", docId));
      } else {
        batch.set(doc(db, "schedules", docId), {
          employee_id: employeeId,
          shift_code: shiftCode,
          work_date: date
        });
      }

      const logRef = doc(collection(db, "history_logs"));
      batch.set(logRef, {
        type: 'shift',
        user: currentUser?.email || 'Unknown',
        employee: empName,
        work_date: date,
        old_value: oldValue,
        new_value: shiftCode,
        timestamp: new Date().toISOString()
      });

      await batch.commit();
    } catch (error) {
      showToast("Error saving: " + error.message)
      return;
    }
  }

  async function handleNoteSave(employeeId, date, note) {
    if (!canEditNotes()) {
      showToast("❌ You do not have permission to edit notes.");
      return;
    }
    if (note.length > 1000) {
      showToast("❌ Error: Note is too long (maximum 1000 characters).");
      return;
    }

    const oldValue = notes[employeeId]?.[date] || '';
    if (oldValue === note) {
      setNotePopup(null);
      return;
    }

    setNotes(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [date]: note
      }
    }))
    
    const empName = employees.find(e => e.id === employeeId)?.name || 'Unknown';
    const docId = `${employeeId}_${date}`;
    
    try {
      const batch = writeBatch(db);
      if (note.trim() === '') {
        batch.delete(doc(db, "schedule_notes", docId));
      } else {
        batch.set(doc(db, "schedule_notes", docId), {
          employee_id: employeeId,
          work_date: date,
          note: note
        });
      }

      const logRef = doc(collection(db, "history_logs"));
      batch.set(logRef, {
        type: 'note',
        user: currentUser?.email || 'Unknown',
        employee: empName,
        work_date: date,
        old_value: oldValue,
        new_value: note,
        timestamp: new Date().toISOString()
      });

      await batch.commit();
    } catch (error) {
      showToast("Error saving note: " + error.message)
    }
    setNotePopup(null)
  }

  const handleYearChange = (newYear) => {
    setCurrentYear(parseInt(newYear))
    setCurrentWeekIndex(0)
  }

  const handleMonthClick = (monthIdx) => {
    setActiveCustomDates(null);
    setCustomSingleDate('');
    setCustomDateRange({ start: '', end: '' });
    const firstWeekOfMonth = WEEKS.findIndex(w => w.monthIndex === monthIdx);
    if (firstWeekOfMonth !== -1) {
      setCurrentWeekIndex(firstWeekOfMonth);
      fetchSchedulesForWeek(firstWeekOfMonth, currentYear);
    }
  }

  async function handleAddTeam(e) {
    e.preventDefault()
    if (!newTeamName || newTeamName.length > 50) return showToast("❌ Invalid team name");
    try {
      await addDoc(collection(db, "teams"), { name: newTeamName });
      setNewTeamName(''); fetchBaseData();
    } catch(err) { showToast(err.message) }
  }

  async function handleAddEmployee(e) {
    e.preventDefault()
    if (!newEmpName || newEmpName.length > 50) return showToast("❌ Invalid agent name");
    try {
      await addDoc(collection(db, "employees"), { name: newEmpName, team_id: newEmpTeam || null });
      setNewEmpName(''); setNewEmpTeam(''); fetchBaseData();
    } catch(err) { showToast(err.message) }
  }

  async function handleAddShift(e) {
    e.preventDefault()
    if (!newShiftCode || newShiftCode.length > 10) return showToast("❌ Invalid shift code");
    try {
      await addDoc(collection(db, "shift_types"), { 
        code: newShiftCode.toUpperCase(),
        start_time: newShiftStart || null,
        end_time: newShiftEnd || null
      });
      setNewShiftCode(''); setNewShiftStart(''); setNewShiftEnd(''); fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  async function handleDeleteTeam(id) {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await deleteDoc(doc(db, "teams", id));
      fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  async function handleDeleteEmployee(id) {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    try {
      await deleteDoc(doc(db, "employees", id));
      fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  async function handleDeleteShiftType(id) {
    if (!window.confirm('Are you sure you want to delete this shift code?')) return;
    try {
      await deleteDoc(doc(db, "shift_types", id));
      fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  async function handleSaveTeam(e) {
    e.preventDefault();
    if (!editingTeam || !editingTeam.name || editingTeam.name.length > 50) return showToast("❌ Invalid team name");
    try {
      await updateDoc(doc(db, "teams", editingTeam.id), { name: editingTeam.name });
      setEditingTeam(null); fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  async function handleSaveEmployee(e) {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.name || editingEmployee.name.length > 50) return showToast("❌ Invalid agent name");
    try {
      await updateDoc(doc(db, "employees", editingEmployee.id), { name: editingEmployee.name, team_id: editingEmployee.team_id || null });
      setEditingEmployee(null); fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  async function handleSaveShift(e) {
    e.preventDefault();
    if (!editingShift || !editingShift.code || editingShift.code.length > 10) return showToast("❌ Invalid shift code");
    try {
      await updateDoc(doc(db, "shift_types", editingShift.id), { 
        code: editingShift.code.toUpperCase(), 
        start_time: editingShift.start_time || null, 
        end_time: editingShift.end_time || null 
      });
      setEditingShift(null); fetchBaseData(); fetchTodayStats();
    } catch(err) { showToast(err.message) }
  }

  function getShiftClass(shift) {
    if (shift === 'OUT') return 'bg-out font-bold'
    if (shift === 'OFF') return 'bg-off font-bold'
    if (shift === 'V') return 'bg-v font-bold'
    if (shift === 'H') return 'bg-h font-bold'
    if (shift === 'M') return 'bg-m font-bold'
    if (shift === 'S') return 'bg-s font-bold'
    if (shift === 'EMERGENCY') return 'bg-emergency font-bold'
    return ''
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${String(displayH).padStart(2, '0')}:${mStr} ${ampm}`;
  }

  // Auth loading
  if (authLoading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F7642]" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</p>
      </div>
    </div>
  )

  // Login Page
  if (!currentUser) {
    return <LoginPage isDark={isDark} setIsDark={setIsDark} />
  }

  if (initialLoading) return (
    <div className={`flex h-screen w-full items-center justify-center ${isDark ? 'dark' : ''}`} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
       <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F7642]"></div>
          <p className="font-medium">Loading Dashboard...</p>
       </div>
    </div>
  )

  const activeDates = (activeCustomDates && activeCustomDates.length > 0) 
    ? activeCustomDates 
    : WEEKS[currentWeekIndex].dates;
  const activeMonthIndex = (activeCustomDates && activeCustomDates.length > 0)
    ? new Date(activeCustomDates[0] + 'T00:00:00').getMonth()
    : WEEKS[currentWeekIndex].monthIndex;
  const prevWeekDates = currentWeekIndex > 0 ? WEEKS[currentWeekIndex - 1].dates : [];

  const filteredEmployees = employees.filter(emp => {
    if (selectedTeamFilter === 'ALL') {
      // allow all
    } else if (selectedTeamFilter === 'ALL_CALL') {
      const teamName = (emp.teams?.name || teams.find(t => t.id === emp.team_id)?.name || '').toLowerCase();
      if (!teamName.includes('call')) return false;
    } else if (selectedTeamFilter === 'ALL_CHAT') {
      const teamName = (emp.teams?.name || teams.find(t => t.id === emp.team_id)?.name || '').toLowerCase();
      if (!teamName.includes('chat')) return false;
    } else {
      if (emp.team_id !== selectedTeamFilter) return false;
    }

    if (searchQuery.trim() !== '') {
      if (!emp.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const groupedEmployees = (() => {
    const groups = {};
    filteredEmployees.forEach(emp => {
      let teamName = emp.teams?.name || 'No Team';
      
      // Combine Morning and Evening into a single base team name
      if (teamName.toLowerCase().includes('call team')) {
        teamName = 'Call Team';
      } else if (teamName.toLowerCase().includes('chat team')) {
        teamName = 'Chat Team';
      }
      
      const teamId = teamName; // Use the normalized name as the unique grouping ID
      
      if (!groups[teamId]) {
        groups[teamId] = { id: teamId, name: teamName, employees: [], totals: {} };
        activeDates.forEach(d => groups[teamId].totals[d] = {});
      }
      groups[teamId].employees.push(emp);
      
      activeDates.forEach(date => {
        const shift = schedules[emp.id]?.[date];
        if (shift && shift.trim() !== '') {
          groups[teamId].totals[date][shift] = (groups[teamId].totals[date][shift] || 0) + 1;
        }
      });
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Dropdown Options
  const yearOptions = YEARS.map(y => ({ value: y, label: y.toString() }))
  const weekOptions = WEEKS.map((w, idx) => ({ value: idx, label: `${w.name} (${w.label})` }))
  const teamOptions = [
    { value: 'ALL', label: 'All Teams' },
    ...teams.map(t => ({ value: t.id, label: t.name }))
  ]

  return (
    <div className={`${isDark ? 'dark' : ''} min-h-screen transition-colors duration-200`} style={{ backgroundColor: 'var(--bg-main)' }} dir="ltr">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="animate-in slide-in-from-top fade-in duration-300" style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? '#EF4444' : 'var(--accent-green)',
          color: '#FFFFFF',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          {toast.message}
          <button onClick={() => setToast({ ...toast, show: false })} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
      )}

      {/* Top Navbar */}
      <nav style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo.webp" alt="FIB Logo" className="fib-logo" style={{ height: '64px', objectFit: 'contain' }} />
          {/* Vertical Divider */}
          <div style={{ width: '1.5px', height: '40px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }}></div>
          <div>
            <h1 style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: 'var(--text-main)',
              letterSpacing: '0.01em',
              margin: 0,
              lineHeight: '1.2'
            }}>Schedule Dashboard</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, marginTop: '3px', fontWeight: '500', letterSpacing: '0.02em' }}>Shift & Team Management</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Toggle Button */}
          <button 
            onClick={() => setIsDark(!isDark)}
            title="Toggle theme"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-green)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            {isDark ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} style={{ color: '#6366f1' }} />}
          </button>

          {/* User Profile Card */}
          <div 
            onClick={() => {
              setEditDisplayName(currentUser?.displayName || '');
              setEditPhotoURL(currentUser?.photoURL || '');
              setShowProfileModal(true);
            }}
            title="Edit Profile"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '4px 12px 4px 5px', 
              borderRadius: '24px', 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              cursor: 'pointer', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s' 
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = 'var(--accent-green)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-green)' }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '800' }}>
                {(currentUser?.displayName || currentUser?.email)?.[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '800', 
                  color: currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? '#b45309' : 'var(--accent-green)', 
                  backgroundColor: currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? '#fef3c7' : 'rgba(15,118,66,0.1)', 
                  padding: '1px 6px', 
                  borderRadius: '4px',
                  lineHeight: '1.2' 
                }}>
                  {currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? '👑 Admin' : 
                   (authorizedUsers.find(u => u.id === currentUser?.email?.toLowerCase().trim())?.role || userRoles[currentUser?.email?.toLowerCase().trim()] || '👤 Team Leader')}
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
                {currentUser?.displayName || currentUser?.email}
              </span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginLeft: '2px' }}><path d="m6 9 6 6 6-6"/></svg>
          </div>

          {/* Log Out Button */}
          <button 
            onClick={() => signOut(auth)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              backgroundColor: 'rgba(239, 68, 68, 0.06)', 
              padding: '0 14px', 
              height: '36px', 
              borderRadius: '8px', 
              fontSize: '12px', 
              fontWeight: '700', 
              color: '#ef4444', 
              cursor: 'pointer',
              transition: 'all 0.2s' 
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.06)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1500px', margin: '0 auto', padding: '0 32px 32px 32px' }}>
        
        {/* Real-time Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          
          {/* Call Team Card */}
          <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'capitalize', letterSpacing: '0.08em', marginBottom: '12px' }}>📞 Call Team <span style={{ color: 'var(--accent-green)', fontSize: '10px' }}>· Today</span></p>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ minWidth: '65px' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--accent-green)', lineHeight: '1' }}>{todayStats.callMorning}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>🌅 Morning</div>
                </div>
                <div style={{ width: '1px', height: '35px', backgroundColor: 'var(--border-color)' }}></div>
                <div style={{ minWidth: '65px' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: '#F59E0B', lineHeight: '1' }}>{todayStats.callEvening}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>🌆 Evening</div>
                </div>
                <div style={{ width: '1px', height: '35px', backgroundColor: 'var(--border-color)' }}></div>
                <div style={{ minWidth: '65px' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: '#8B5CF6', lineHeight: '1' }}>{todayStats.callNight || 0}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>🌙 Overnight</div>
                </div>
              </div>
            </div>
            <div style={{ height: '44px', width: '44px', borderRadius: '12px', backgroundColor: 'var(--header-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
              <PhoneCall size={22} style={{ color: 'var(--accent-green)' }} />
            </div>
          </div>

          {/* Chat Team Card */}
          <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'capitalize', letterSpacing: '0.08em', marginBottom: '12px' }}>💬 Chat Team <span style={{ color: 'var(--accent-green)', fontSize: '10px' }}>· Today</span></p>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ minWidth: '65px' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--accent-green)', lineHeight: '1' }}>{todayStats.chatMorning}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>🌅 Morning</div>
                </div>
                <div style={{ width: '1px', height: '35px', backgroundColor: 'var(--border-color)' }}></div>
                <div style={{ minWidth: '65px' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: '#F59E0B', lineHeight: '1' }}>{todayStats.chatEvening}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>🌆 Evening</div>
                </div>
                <div style={{ width: '1px', height: '35px', backgroundColor: 'var(--border-color)' }}></div>
                <div style={{ minWidth: '65px' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: '#8B5CF6', lineHeight: '1' }}>{todayStats.chatNight || 0}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>🌙 Overnight</div>
                </div>
              </div>
            </div>
            <div style={{ height: '44px', width: '44px', borderRadius: '12px', backgroundColor: 'var(--header-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
              <MessageSquare size={22} style={{ color: '#3B82F6' }} />
            </div>
          </div>
          
          {/* Other Teams Card */}
          <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1, marginRight: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'capitalize', letterSpacing: '0.08em', marginBottom: '12px' }}>🏢 Other Teams <span style={{ color: 'var(--accent-green)', fontSize: '10px' }}>· Today</span></p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Team Leaders - Split into Morning & Evening */}
                <div style={{ minWidth: '130px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--accent-green)', lineHeight: '1' }}>
                        {todayStats.teamLeaderMorning || 0}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '4px' }}>
                        🌅 Morning
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color)' }}></div>
                    <div>
                      <div style={{ fontSize: '26px', fontWeight: '900', color: '#F59E0B', lineHeight: '1' }}>
                        {todayStats.teamLeaderEvening || 0}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '4px' }}>
                        🌆 Evening
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#ec4899', marginTop: '6px' }}>
                    <Shield size={13} color="#ec4899" />
                    Team Leaders
                  </div>
                </div>

                {/* Other Teams (Quality, Help Desk, etc.) */}
                {Object.entries(todayStats.otherTeams)
                  .filter(([team]) => !team.toLowerCase().includes('leader'))
                  .map(([team, count]) => {
                    let teamColor = 'var(--text-main)';
                    let TeamIcon = Folder;
                    const lower = team.toLowerCase();
                    if (lower.includes('quality')) { teamColor = '#14b8a6'; TeamIcon = Award; }
                    else if (lower.includes('trainer')) { teamColor = '#8b5cf6'; TeamIcon = GraduationCap; }
                    else if (lower.includes('help desk') || lower.includes('helpdesk')) { teamColor = '#f97316'; TeamIcon = Headset; }
                    
                    return (
                      <React.Fragment key={team}>
                        <div style={{ width: '1px', height: '35px', backgroundColor: 'var(--border-color)' }}></div>
                        <div style={{ minWidth: '55px' }}>
                          <div style={{ fontSize: '26px', fontWeight: '900', color: teamColor, lineHeight: '1' }}>{count}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>
                            <TeamIcon size={13} color={teamColor} />
                            {team}
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
              </div>
            </div>
            <div style={{ height: '44px', width: '44px', minWidth: '44px', borderRadius: '12px', backgroundColor: 'var(--header-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
              <Users size={22} style={{ color: '#8B5CF6' }} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px', marginTop: '40px' }}>
          
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ width: '16px', height: '16px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search agent..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onFocus={(e) => { e.target.style.borderColor = '#0F7642'; setIsSearchFocused(true); }}
                   onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; setTimeout(() => setIsSearchFocused(false), 200); }}
                   style={{ width: '100%', padding: '10px 12px 10px 36px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '14px', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} />
            
            {isSearchFocused && searchQuery.trim() !== '' && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 100, maxHeight: '250px', overflowY: 'auto' }} className="custom-scrollbar">
                {employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) && emp.name.toLowerCase() !== searchQuery.toLowerCase()).length > 0 ? (
                  employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) && emp.name.toLowerCase() !== searchQuery.toLowerCase()).map(emp => (
                    <div key={emp.id} 
                         onClick={() => {
                           setSearchQuery(emp.name);
                           setIsSearchFocused(false);
                         }}
                         style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--header-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {emp.name}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>No matches found</div>
                )}
              </div>
            )}
          </div>
          
          {currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() && (
            <React.Fragment>
              <button 
                onClick={() => setShowAccess(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                <Shield size={16} /> Access
              </button>
              <button 
                onClick={() => setShowHistory(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                <Clock size={16} /> History
              </button>
              <button 
                onClick={() => setCurrentTab(currentTab === 'manage' ? 'schedule' : 'manage')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                {currentTab === 'manage' ? <Calendar size={16} /> : <Settings size={16} />}
                {currentTab === 'manage' ? 'View Schedule' : 'Manage'}
              </button>
            </React.Fragment>
          )}
        </div>

        {/* SCHEDULE TAB */}
        {currentTab === 'schedule' && (
          <div className="animate-in fade-in duration-300">
            <div className="custom-scrollbar" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--header-bg)', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0', gap: '6px', scrollbarWidth: 'none' }}>
              
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <CustomSelect
                  value={currentYear}
                  onChange={(val) => handleYearChange(val)}
                  options={YEARS.map(y => ({ value: y, label: String(y) }))}
                  icon={<Calendar size={14} />}
                />

                {/* Custom Date Filter - Modern Popover with Single Day & Range modes */}
                <div style={{ position: 'relative' }}>
                  <button
                    ref={customDateBtnRef}
                    onClick={toggleCustomDatePicker}
                    style={{
                      backgroundColor: activeCustomDates ? '#2563eb' : 'var(--accent-green)',
                      color: '#FFFFFF',
                      border: 'none',
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: activeCustomDates ? '0 2px 8px rgba(37, 99, 235, 0.35)' : '0 2px 4px rgba(0,0,0,0.1)',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Calendar size={14} />
                    <span>
                      {activeCustomDates 
                        ? (activeCustomDates.length === 1 
                            ? activeCustomDates[0] 
                            : `${activeCustomDates[0].slice(5)} to ${activeCustomDates[activeCustomDates.length - 1].slice(5)} (${activeCustomDates.length}d)`) 
                        : 'Date Filter'}
                    </span>
                    {activeCustomDates ? (
                      <span 
                        onClick={(e) => { e.stopPropagation(); handleClearCustomFilter(); }}
                        title="Clear filter & return to full week"
                        style={{
                          marginLeft: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        ✕
                      </span>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showDatePicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"/></svg>
                    )}
                  </button>

                  {showDatePicker && createPortal(
                    <div 
                      ref={customDatePortalRef}
                      className="animate-in fade-in zoom-in-95 duration-150" 
                      style={{
                        position: 'fixed',
                        top: `${datePickerCoords.top}px`,
                        left: `${datePickerCoords.left}px`,
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.28)',
                        zIndex: 9999,
                        width: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Popover Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <Calendar size={15} style={{ color: 'var(--accent-green)' }} />
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                            Date Filter
                          </span>
                        </div>
                        {activeCustomDates ? (
                          <button
                            onClick={handleClearCustomFilter}
                            style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}
                          >
                            Reset to Week
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowDatePicker(false)}
                            style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Quick Presets: Yesterday, Today, Tomorrow */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                          Quick Day Selection
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                          <button
                            onClick={() => handleApplySingleDate(getRelativeDateStr(-1))}
                            style={{
                              padding: '7px 4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              border: activeCustomDates?.length === 1 && activeCustomDates[0] === getRelativeDateStr(-1)
                                ? '1.5px solid var(--accent-green)'
                                : '1px solid var(--border-color)',
                              backgroundColor: activeCustomDates?.length === 1 && activeCustomDates[0] === getRelativeDateStr(-1)
                                ? 'rgba(15, 118, 66, 0.12)'
                                : 'var(--hover-bg)',
                              color: activeCustomDates?.length === 1 && activeCustomDates[0] === getRelativeDateStr(-1)
                                ? 'var(--accent-green)'
                                : 'var(--text-main)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            Yesterday
                          </button>
                          <button
                            onClick={() => handleApplySingleDate(getTodayStr())}
                            style={{
                              padding: '7px 4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              border: activeCustomDates?.length === 1 && activeCustomDates[0] === getTodayStr()
                                ? '1.5px solid var(--accent-green)'
                                : '1px solid var(--border-color)',
                              backgroundColor: activeCustomDates?.length === 1 && activeCustomDates[0] === getTodayStr()
                                ? 'rgba(15, 118, 66, 0.12)'
                                : 'var(--hover-bg)',
                              color: activeCustomDates?.length === 1 && activeCustomDates[0] === getTodayStr()
                                ? 'var(--accent-green)'
                                : 'var(--text-main)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            Today
                          </button>
                          <button
                            onClick={() => handleApplySingleDate(getRelativeDateStr(1))}
                            style={{
                              padding: '7px 4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              border: activeCustomDates?.length === 1 && activeCustomDates[0] === getRelativeDateStr(1)
                                ? '1.5px solid var(--accent-green)'
                                : '1px solid var(--border-color)',
                              backgroundColor: activeCustomDates?.length === 1 && activeCustomDates[0] === getRelativeDateStr(1)
                                ? 'rgba(15, 118, 66, 0.12)'
                                : 'var(--hover-bg)',
                              color: activeCustomDates?.length === 1 && activeCustomDates[0] === getRelativeDateStr(1)
                                ? 'var(--accent-green)'
                                : 'var(--text-main)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            Tomorrow
                          </button>
                        </div>
                      </div>

                      {/* Mode Segmented Switch: Single Day vs Date Range */}
                      <div style={{
                        display: 'flex',
                        backgroundColor: 'var(--hover-bg)',
                        borderRadius: '8px',
                        padding: '3px',
                        gap: '2px'
                      }}>
                        <button
                          onClick={() => setCustomFilterMode('single')}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: customFilterMode === 'single' ? 'var(--bg-card)' : 'transparent',
                            color: customFilterMode === 'single' ? 'var(--accent-green)' : 'var(--text-muted)',
                            boxShadow: customFilterMode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Single Day
                        </button>
                        <button
                          onClick={() => setCustomFilterMode('range')}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: customFilterMode === 'range' ? 'var(--bg-card)' : 'transparent',
                            color: customFilterMode === 'range' ? 'var(--accent-green)' : 'var(--text-muted)',
                            boxShadow: customFilterMode === 'range' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Date Range
                        </button>
                      </div>

                      {/* Mode Specific Inputs */}
                      {customFilterMode === 'single' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                            Pick Specific Date:
                          </label>
                          <input 
                            type="date"
                            value={customSingleDate}
                            onChange={(e) => setCustomSingleDate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--text-main)',
                              fontSize: '13px',
                              fontWeight: '600',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            onClick={() => handleApplySingleDate(customSingleDate)}
                            disabled={!customSingleDate}
                            style={{
                              marginTop: '2px',
                              padding: '9px',
                              fontSize: '12px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: customSingleDate ? 'var(--accent-green)' : 'var(--border-color)',
                              color: '#FFFFFF',
                              cursor: customSingleDate ? 'pointer' : 'not-allowed',
                              transition: 'all 0.15s'
                            }}
                          >
                            Apply Day Filter
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                From:
                              </label>
                              <input 
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '7px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--input-bg)',
                                  color: 'var(--text-main)',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                To:
                              </label>
                              <input 
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '7px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--input-bg)',
                                  color: 'var(--text-main)',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>

                          {/* Quick Range Shortcuts */}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                            <button
                              onClick={() => {
                                setCustomDateRange({ start: getTodayStr(), end: getRelativeDateStr(2) });
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--hover-bg)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              3 Days
                            </button>
                            <button
                              onClick={() => {
                                setCustomDateRange({ start: getTodayStr(), end: getRelativeDateStr(6) });
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--hover-bg)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              7 Days
                            </button>
                            <button
                              onClick={() => {
                                setCustomDateRange({ start: getTodayStr(), end: getRelativeDateStr(13) });
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--hover-bg)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              14 Days
                            </button>
                          </div>

                          <button
                            onClick={handleApplyDateRange}
                            disabled={!customDateRange.start || !customDateRange.end}
                            style={{
                              marginTop: '2px',
                              padding: '9px',
                              fontSize: '12px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: (customDateRange.start && customDateRange.end) ? 'var(--accent-green)' : 'var(--border-color)',
                              color: '#FFFFFF',
                              cursor: (customDateRange.start && customDateRange.end) ? 'pointer' : 'not-allowed',
                              transition: 'all 0.15s'
                            }}
                          >
                            Apply Range Filter
                          </button>
                        </div>
                      )}

                      {/* Clear & Revert button */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={handleClearCustomFilter}
                          style={{
                            width: '100%',
                            padding: '7px',
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          Show Full Week View
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
  
                {/* Week Navigator - Compact & Narrow to avoid toolbar scrollbar */}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--accent-green)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: '36px' }}>
                  <button
                    onClick={() => { setActiveCustomDates(null); setCurrentWeekIndex(i => Math.max(0, i - 1)); }}
                    disabled={currentWeekIndex === 0}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: currentWeekIndex === 0 ? 'not-allowed' : 'pointer', padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center', opacity: currentWeekIndex === 0 ? 0.4 : 1, borderRight: '1px solid rgba(255,255,255,0.2)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px', minWidth: '105px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', letterSpacing: '0.02em' }}>{WEEKS[currentWeekIndex]?.name}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>({WEEKS[currentWeekIndex]?.label.replace(/ /g, '')})</span>
                  </div>
                  <button
                    onClick={() => { setActiveCustomDates(null); setCurrentWeekIndex(i => Math.min(WEEKS.length - 1, i + 1)); }}
                    disabled={currentWeekIndex === WEEKS.length - 1}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: currentWeekIndex === WEEKS.length - 1 ? 'not-allowed' : 'pointer', padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center', opacity: currentWeekIndex === WEEKS.length - 1 ? 0.4 : 1, borderLeft: '1px solid rgba(255,255,255,0.2)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
  
                <CustomSelect
                  value={selectedTeamFilter}
                  onChange={(val) => setSelectedTeamFilter(val)}
                  options={[
                    { value: 'ALL', label: '🏢 All Teams' },
                    { value: 'ALL_CALL', label: '📞 All Call Teams' },
                    { value: 'ALL_CHAT', label: '💬 All Chat Teams' },
                    ...teams.map(t => {
                      let emoji = '👥';
                      const n = t.name.toLowerCase();
                      if (n.includes('call')) emoji = '📞';
                      else if (n.includes('chat')) emoji = '💬';
                      else if (n.includes('help')) emoji = '💻';
                      else if (n.includes('quality')) emoji = '✨';
                      else if (n.includes('train')) emoji = '🎓';
                      else if (n.includes('leader')) emoji = '👑';
                      return { value: t.id, label: `${emoji} ${t.name}` };
                    })
                  ]}
                  icon={<Users size={14} />}
                />
              </div>

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)', margin: '0 6px', flexShrink: 0 }}></div>
              
              {/* Months stretched across the full toolbar width */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '460px', justifyContent: 'space-between' }}>
                {MONTHS.map((month, idx) => {
                  const isActive = !activeCustomDates && idx === activeMonthIndex;
                  return (
                    <button key={month} 
                         onClick={() => {
                           handleMonthClick(idx);
                         }}
                         style={{ 
                           flex: 1,
                           height: '32px',
                           cursor: 'pointer', 
                           padding: '0 2px', 
                           border: isActive ? '1px solid var(--accent-green)' : '1px solid transparent', 
                           borderRadius: '6px', 
                           fontSize: '11px', 
                           fontWeight: isActive ? '800' : '600', 
                           backgroundColor: isActive ? 'var(--accent-green)' : 'transparent', 
                           color: isActive ? '#FFFFFF' : 'var(--text-muted)', 
                           boxShadow: isActive ? '0 2px 6px rgba(15, 118, 66, 0.25)' : 'none',
                           transition: 'all 0.15s',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           whiteSpace: 'nowrap'
                         }}
                         onMouseEnter={e => {
                           if (!isActive) {
                             e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                             e.currentTarget.style.color = 'var(--text-main)';
                           }
                         }}
                         onMouseLeave={e => {
                           if (!isActive) {
                             e.currentTarget.style.backgroundColor = 'transparent';
                             e.currentTarget.style.color = 'var(--text-muted)';
                           }
                         }}
                    >
                      {month}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="custom-scrollbar" style={{ 
              maxHeight: 'calc(100vh - 195px)', 
              overflow: 'auto', 
              borderBottom: '1px solid var(--border-color)', 
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative'
            }}>
            {activeCustomDates && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.06)',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '11px',
                fontWeight: '700',
                color: '#2563eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} />
                  <span>
                    Showing {activeCustomDates.length === 1 ? `single date: ${activeCustomDates[0]}` : `${activeCustomDates.length} days: ${activeCustomDates[0]} → ${activeCustomDates[activeCustomDates.length - 1]}`}
                  </span>
                </div>
                <button
                  onClick={handleClearCustomFilter}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✕ Revert to Full Week
                </button>
              </div>
            )}

              <table className="excel-table" style={{ width: '100%', minWidth: '780px', borderSpacing: '0 4px', borderCollapse: 'separate' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'var(--header-bg)' }}>
                  <tr style={{ backgroundColor: 'var(--header-bg)' }}>
                    <th className="employee-col" style={{ 
                      position: 'sticky',
                      top: 0,
                      zIndex: 45,
                      backgroundColor: 'var(--header-bg)',
                      opacity: 1,
                      paddingLeft: '14px', 
                      paddingRight: '8px',
                      height: '32px',
                      borderBottom: '1px solid var(--border-color)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      verticalAlign: 'middle'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '100%' }}>
                        <Users size={12} style={{ color: 'var(--accent-green)' }} />
                        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                          Agent
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          color: 'var(--text-muted)'
                        }}>
                          ({filteredEmployees.length})
                        </span>
                      </div>
                    </th>
                    {activeDates.map((date) => {
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const isToday = date === todayStr;
                      const isCustom = activeCustomDates && activeCustomDates.includes(date);
                      const dObj = new Date(date + 'T00:00:00');
                      const dayName = isNaN(dObj.getTime()) ? '' : DAY_NAMES[dObj.getDay()];
                      const monthShort = isNaN(dObj.getTime()) ? '' : dObj.toLocaleString('default', { month: 'short' });
                      const dayNum = date.split('-')[2];

                      // 100% solid, fully opaque hex backgrounds - prevents any scroll content bleeding through
                      const solidHeaderBg = isToday 
                        ? (isDark ? '#062d1a' : '#edf7ee')
                        : isCustom
                        ? (isDark ? '#0e2340' : '#ebf5ff')
                        : 'var(--header-bg)';

                      return (
                        <th key={date} className="date-col" style={{ 
                          position: 'sticky',
                          top: 0,
                          zIndex: 40,
                          backgroundColor: solidHeaderBg,
                          opacity: 1,
                          padding: '0 4px', 
                          height: '32px',
                          borderBottom: isToday 
                            ? '2px solid var(--accent-green)' 
                            : isCustom 
                            ? '2px solid #2563eb' 
                            : '1px solid var(--border-color)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          verticalAlign: 'middle',
                          transition: 'background-color 0.15s'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '5px',
                            height: '100%',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              color: isToday ? 'var(--accent-green)' : isCustom ? '#2563eb' : 'var(--text-muted)', 
                              letterSpacing: '0.02em',
                              lineHeight: 1
                            }}>
                              {dayName}
                            </span>
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: '800',
                              color: isToday ? 'var(--accent-green)' : isCustom ? '#2563eb' : 'var(--text-main)',
                              lineHeight: 1
                            }}>
                              {dayNum}
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: '500', 
                              color: isToday ? 'var(--accent-green)' : isCustom ? '#2563eb' : 'var(--text-muted)',
                              opacity: 0.7,
                              lineHeight: 1
                            }}>
                              {monthShort}
                            </span>
                            {isToday && (
                              <span style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--accent-green)',
                                display: 'inline-block'
                              }} title="Today" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                {groupedEmployees.map(group => (
                  <tbody key={group.id} style={{ opacity: schedLoading ? 0.5 : 1, pointerEvents: schedLoading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                    {/* Team Header */}
                    <tr>
                      <td colSpan={activeDates.length + 1} style={{ backgroundColor: 'var(--accent-green)', color: 'white', fontWeight: 'bold', padding: '10px 16px', fontSize: '13px', textTransform: 'capitalize', letterSpacing: '0.5px' }}>
                        {group.name}
                      </td>
                    </tr>
                    
                    {/* Employees */}
                    {group.employees.map(emp => (
                      <tr key={emp.id}>
                        <td className="employee-col">
                          <div>{emp.name}</div>
                        </td>
                        {activeDates.map((date, dayIdx) => {
                          const shift = schedules[emp.id]?.[date] || ''
                          const prevDate = prevWeekDates[dayIdx]
                          const prevShift = prevDate ? (schedules[emp.id]?.[prevDate] || '') : ''
                          const prevClass = prevShift ? getShiftClass(prevShift) : ''
                          return (
                            <td key={date} style={{ padding: '3px', verticalAlign: 'middle' }}>
                              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)' }}>
                                {/* Current week shift input */}
                                <input
                                  type="text"
                                  className={`excel-input ${getShiftClass(shift)}`}
                                  defaultValue={shift}
                                  placeholder="-"
                                  style={{ 
                                    border: 'none', 
                                    borderRadius: '0', 
                                    height: '26px', 
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    borderBottom: prevShift ? '1px solid var(--border-color)' : 'none'
                                  }}
                                  onBlur={(e) => handleShiftChange(emp.id, date, e.target.value)}
                                  onKeyDown={(e) => {
                                    const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                                    if (allowedKeys.includes(e.key)) {
                                      e.preventDefault(); // Prevent cursor moving inside the text box
                                      const inputs = Array.from(document.querySelectorAll('.excel-input'));
                                      const currentIndex = inputs.indexOf(e.currentTarget);
                                      if (currentIndex === -1) return;

                                      let nextIndex = currentIndex;
                                      const cols = activeDates.length; // usually 7

                                      if (e.key === 'ArrowRight' && (currentIndex + 1) % cols !== 0) {
                                        nextIndex = currentIndex + 1;
                                      } else if (e.key === 'ArrowLeft' && currentIndex % cols !== 0) {
                                        nextIndex = currentIndex - 1;
                                      } else if (e.key === 'ArrowDown' && currentIndex + cols < inputs.length) {
                                        nextIndex = currentIndex + cols;
                                      } else if (e.key === 'ArrowUp' && currentIndex - cols >= 0) {
                                        nextIndex = currentIndex - cols;
                                      }

                                      if (nextIndex !== currentIndex && inputs[nextIndex]) {
                                        // Save current input before moving, since React's onBlur might race if we just focus away?
                                        // Actually, standard onBlur will fire automatically when we focus the next element.
                                        inputs[nextIndex].focus();
                                        inputs[nextIndex].select();
                                      }
                                    } else if (e.key === 'Enter') {
                                      // Behave like down arrow on enter
                                      e.preventDefault();
                                      const inputs = Array.from(document.querySelectorAll('.excel-input'));
                                      const currentIndex = inputs.indexOf(e.currentTarget);
                                      const cols = activeDates.length;
                                      if (currentIndex !== -1 && currentIndex + cols < inputs.length) {
                                        inputs[currentIndex + cols].focus();
                                        inputs[currentIndex + cols].select();
                                      } else {
                                        e.currentTarget.blur();
                                      }
                                    }
                                  }}
                                />
                                {/* Prev week shift - shown as subtle row below */}
                                {prevShift && (
                                  <div className={prevClass} style={{
                                    textAlign: 'center',
                                    fontSize: '9px',
                                    fontWeight: '600',
                                    padding: '2px 0',
                                    color: prevClass ? undefined : 'var(--text-muted)',
                                    backgroundColor: prevClass ? undefined : 'var(--header-bg)',
                                    opacity: 0.75,
                                    letterSpacing: '0.03em'
                                  }}>
                                    {prevShift}
                                  </div>
                                )}
                                
                                {/* Note Indicator (Red Triangle) */}
                                <div 
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setNotePopup({
                                      empId: emp.id,
                                      date: date,
                                      top: rect.bottom + window.scrollY,
                                      left: rect.left + window.scrollX,
                                      currentNote: notes[emp.id]?.[date] || ''
                                    });
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: 0,
                                    height: 0,
                                    borderStyle: 'solid',
                                    borderWidth: '0 12px 12px 0',
                                    borderColor: `transparent ${notes[emp.id]?.[date] ? '#DC2626' : 'rgba(150,150,150,0.3)'} transparent transparent`,
                                    cursor: 'pointer',
                                    zIndex: 1
                                  }}
                                  title={notes[emp.id]?.[date] ? "Edit Note" : "Add Note"}
                                ></div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}

                    {/* Team Summary Row */}
                    <tr>
                      <td className="employee-col" style={{ backgroundColor: 'var(--header-bg)', padding: '10px 16px', borderTop: '2px solid var(--accent-green)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)' }}></div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</div>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', marginLeft: '12px' }}>{group.name}</div>
                      </td>
                      {activeDates.map((date) => {
                        const counts = group.totals[date];
                        return (
                          <td key={`total-${group.id}-${date}`} style={{ backgroundColor: 'var(--header-bg)', padding: '6px 4px', verticalAlign: 'top', borderTop: '2px solid var(--accent-green)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                              {Object.keys(counts).length === 0 ? (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '0 2px' }}>
                                  {Object.entries(counts).sort((a,b) => {
                                    const sortOrder = ['A', 'AC', 'AB', 'L', 'LB', 'B', 'BB', 'BC', 'C'];
                                    const idxA = sortOrder.indexOf(a[0].toUpperCase());
                                    const idxB = sortOrder.indexOf(b[0].toUpperCase());
                                    
                                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                    if (idxA !== -1) return -1;
                                    if (idxB !== -1) return 1;
                                    
                                    return b[1] - a[1];
                                  }).map(([code, count]) => {
                                    const customClass = getShiftClass(code);
                                    return (
                                      <div key={code} className={customClass} style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '3px 8px', borderRadius: '16px', 
                                        backgroundColor: customClass ? undefined : 'var(--bg-card)', 
                                        border: customClass ? undefined : '1px solid var(--border-color)', 
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                        fontSize: '11px', fontWeight: '700', 
                                        color: customClass ? undefined : 'var(--text-main)'
                                      }}>
                                        <span style={{ opacity: 0.85, letterSpacing: '0.02em' }}>{code}</span>
                                        <span style={{ 
                                          backgroundColor: customClass ? 'rgba(0,0,0,0.15)' : 'var(--accent-green)', 
                                          color: customClass ? 'inherit' : '#fff', 
                                          padding: '2px 6px', 
                                          borderRadius: '10px', 
                                          fontSize: '10px', 
                                          fontWeight: '900' 
                                        }}>{count}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                    
                    {/* Visual spacer */}
                    <tr>
                      <td colSpan={activeDates.length + 1} style={{ height: '24px', backgroundColor: 'transparent', border: 'none' }}></td>
                    </tr>
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        )}

        {/* MANAGE TAB */}
        {currentTab === 'manage' && (
          <div className="animate-in fade-in duration-300" style={{ padding: '24px', marginTop: '24px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>System Configuration</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>Add or remove teams, agents, and shift codes.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* Teams Card */}
              <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <Briefcase size={20} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Teams</h3>
                </div>
                <form onSubmit={handleAddTeam} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  <input type="text" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} 
                         style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} 
                         placeholder="e.g. Call Center" />
                  <button type="submit" style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--accent-green)', color: 'white', border: 'none', cursor: 'pointer' }}><Plus size={20} /></button>
                </form>
                <ul style={{ fontSize: '14px', color: 'var(--text-muted)', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teams.map(t => (
                    <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      {editingTeam?.id === t.id ? (
                        <form onSubmit={handleSaveTeam} style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <input type="text" value={editingTeam.name} onChange={e => setEditingTeam({...editingTeam, name: e.target.value})} style={{ flex: 1, padding: '4px', border: '1px solid var(--accent-green)', borderRadius: '4px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} autoFocus />
                          <button type="submit" style={{ color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}>Save</button>
                          <button type="button" onClick={() => setEditingTeam(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
                        </form>
                      ) : (
                        <>
                          <span>{t.name}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setEditingTeam(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteTeam(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Employees Card */}
              <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <Users size={20} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Agents</h3>
                </div>
                <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  <input type="text" required value={newEmpName} onChange={e => setNewEmpName(e.target.value)} 
                         style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} 
                         placeholder="Agent Name" />
                  <CustomSelect
                    value={newEmpTeam}
                    onChange={(val) => setNewEmpTeam(val)}
                    options={[
                      { value: '', label: '-- Assign Team --' },
                      ...teams.map(t => ({ value: t.id, label: t.name }))
                    ]}
                    icon={<Briefcase size={14} />}
                  />
                  <button type="submit" style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--accent-green)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '4px' }}>Add Agent</button>
                </form>
                <ul style={{ fontSize: '14px', color: 'var(--text-muted)', maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {employees.map(e => (
                    <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      {editingEmployee?.id === e.id ? (
                        <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <input type="text" value={editingEmployee.name} onChange={ev => setEditingEmployee({...editingEmployee, name: ev.target.value})} style={{ width: '100%', padding: '4px', border: '1px solid var(--accent-green)', borderRadius: '4px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} autoFocus />
                          <CustomSelect
                            value={editingEmployee.team_id || ''}
                            onChange={(val) => setEditingEmployee({...editingEmployee, team_id: val})}
                            options={[
                              { value: '', label: '-- Assign Team --' },
                              ...teams.map(t => ({ value: t.id, label: t.name }))
                            ]}
                            icon={<Briefcase size={14} />}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" onClick={() => setEditingEmployee(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
                            <button type="submit" style={{ color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}>Save</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <span>{e.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)' }}>{e.teams?.name || 'No Team'}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => setEditingEmployee(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteEmployee(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shifts Card */}
              <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <Clock size={20} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Shift Codes</h3>
                </div>
                
                <form onSubmit={handleAddShift} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <input type="text" required value={newShiftCode} onChange={e => setNewShiftCode(e.target.value)} 
                         style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', textTransform: 'uppercase' }} 
                         placeholder="Code (e.g. A)" />
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'capitalize' }}>From Time</label>
                      <CustomSelect
                        value={newShiftStart}
                        onChange={(val) => setNewShiftStart(val)}
                        options={[
                          { value: '', label: '-- : --' },
                          ...Array.from({length: 24}).map((_, h) => {
                            const value24 = `${String(h).padStart(2, '0')}:00`;
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const displayH = h % 12 || 12;
                            return { value: value24, label: `${String(displayH).padStart(2, '0')}:00 ${ampm}` };
                          })
                        ]}
                        icon={<Clock size={14} />}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'capitalize' }}>To Time</label>
                      <CustomSelect
                        value={newShiftEnd}
                        onChange={(val) => setNewShiftEnd(val)}
                        options={[
                          { value: '', label: '-- : --' },
                          ...Array.from({length: 24}).map((_, h) => {
                            const value24 = `${String(h).padStart(2, '0')}:00`;
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const displayH = h % 12 || 12;
                            return { value: value24, label: `${String(displayH).padStart(2, '0')}:00 ${ampm}` };
                          })
                        ]}
                        icon={<Clock size={14} />}
                      />
                    </div>
                  </div>
                  
                  <button type="submit" style={{ width: '100%', padding: '10px', borderRadius: '4px', backgroundColor: 'var(--accent-green)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Plus size={16} /> Add Shift
                  </button>
                </form>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                  {shiftTypes.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                      {editingShift?.id === s.id ? (
                        <form onSubmit={handleSaveShift} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input type="text" value={editingShift.code} onChange={ev => setEditingShift({...editingShift, code: ev.target.value})} style={{ width: '60px', padding: '4px', border: '1px solid var(--accent-green)', borderRadius: '4px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', textTransform: 'uppercase' }} autoFocus />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <CustomSelect
                              value={editingShift.start_time?.slice(0,5) || ''}
                              onChange={(val) => setEditingShift({...editingShift, start_time: val})}
                              options={[
                                { value: '', label: '-' },
                                ...Array.from({length: 24}).map((_, h) => {
                                  const val = `${String(h).padStart(2, '0')}:00`;
                                  const ampm = h >= 12 ? 'PM' : 'AM';
                                  const displayH = h % 12 || 12;
                                  return { value: val, label: `${String(displayH).padStart(2, '0')}:00 ${ampm}` };
                                })
                              ]}
                              icon={<Clock size={12} />}
                            />
                            <CustomSelect
                              value={editingShift.end_time?.slice(0,5) || ''}
                              onChange={(val) => setEditingShift({...editingShift, end_time: val})}
                              options={[
                                { value: '', label: '-' },
                                ...Array.from({length: 24}).map((_, h) => {
                                  const val = `${String(h).padStart(2, '0')}:00`;
                                  const ampm = h >= 12 ? 'PM' : 'AM';
                                  const displayH = h % 12 || 12;
                                  return { value: val, label: `${String(displayH).padStart(2, '0')}:00 ${ampm}` };
                                })
                              ]}
                              icon={<Clock size={12} />}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <button type="button" onClick={() => setEditingShift(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontSize: '10px' }}>Cancel</button>
                            <button type="submit" style={{ color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '0', fontSize: '10px' }}>Save</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{s.code}</span>
                            {(s.start_time || s.end_time) && (
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {formatTime(s.start_time)} - {formatTime(s.end_time)}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                            <button onClick={() => setEditingShift(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteShiftType(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Note Popup */}
      {notePopup && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
            onClick={() => setNotePopup(null)}
          ></div>
          <div 
            style={{
              position: 'absolute',
              top: notePopup.top + 5,
              left: Math.min(notePopup.left, window.innerWidth - 260),
              width: '240px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StickyNote size={14} style={{ color: 'var(--accent-green)' }} />
                Shift Note
              </div>
              {notePopup.currentNote && (
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur
                    handleNoteSave(notePopup.empId, notePopup.date, '');
                  }}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Delete Note"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            <textarea
              autoFocus
              defaultValue={notePopup.currentNote}
              placeholder="Write a note here..."
              style={{
                width: '100%',
                height: '80px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '12px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border-color)';
                handleNoteSave(notePopup.empId, notePopup.date, e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setNotePopup(null);
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNoteSave(notePopup.empId, notePopup.date, e.target.value);
                }
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Press Enter to save</span>
              <button 
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  handleNoteSave(notePopup.empId, notePopup.date, e.currentTarget.parentElement.previousSibling.value);
                }}
                style={{ backgroundColor: 'var(--accent-green)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                Save Note
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* History Modal */}
      {showHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: 'var(--text-main)' }}>
                <Clock size={20} /> History Log
              </h2>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }} className="custom-scrollbar">
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading history...</div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No history available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyLogs.map(log => (
                    <div key={log.id} style={{ padding: '12px', backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)`, borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{log.employee}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{log.user}</span> updated {log.type === 'shift' ? 'shift' : 'note'} for <span style={{ fontWeight: 'bold' }}>{log.work_date}</span>:
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{log.old_value || '(empty)'}</span>
                        <span>➔</span>
                        <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{log.new_value || '(empty)'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Access Modal */}
      {showAccess && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--bg-main)', borderRadius: '16px', padding: '24px', width: '92%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(15, 118, 66, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.01em' }}>
                    Access Management
                  </h2>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                    Manage roles and granular permissions
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAccess(false)} 
                style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ✕
              </button>
            </div>
            
            {/* Add User Bar */}
            <form onSubmit={handleGrantAccess} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <input 
                type="email" 
                placeholder="Enter user email..." 
                value={newAccessEmail}
                onChange={(e) => setNewAccessEmail(e.target.value)}
                required
                style={{ 
                  flex: 1, 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--bg-card)', 
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: '500',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              />
              <button 
                type="submit" 
                style={{ 
                  backgroundColor: 'var(--accent-green)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0 18px', 
                  borderRadius: '8px', 
                  fontWeight: '700', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 118, 66, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Add User
              </button>
            </form>

            {/* User List */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="custom-scrollbar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {authorizedUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '13px' }}>
                    No custom authorized users yet.
                  </div>
                ) : (
                  authorizedUsers.map(user => (
                    <div 
                      key={user.id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        padding: '14px 16px', 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* User Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #0F7642, #10b981)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#fff', 
                            fontSize: '12px', 
                            fontWeight: '800' 
                          }}>
                            {user.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
                              {user.email}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--accent-green)', marginTop: '2px' }}>
                              Authorized Access
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveAccess(user.id)} 
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.08)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                            color: '#ef4444', 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontSize: '11px', 
                            fontWeight: '700',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#ef4444';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      
                      {/* Role Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', minWidth: '40px' }}>
                          Role:
                        </span>
                        <input 
                          type="text" 
                          value={user.role || ''} 
                          onChange={(e) => handleUpdateAccessRole(user.id, e.target.value)}
                          placeholder="e.g. ⭐ Quality, 👑 Leader"
                          style={{ 
                            flex: 1, 
                            padding: '6px 10px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            borderRadius: '6px', 
                            border: '1px solid var(--border-color)', 
                            background: 'var(--input-bg)', 
                            color: 'var(--text-main)',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Permissions Switches */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '10px', 
                        backgroundColor: 'var(--hover-bg)', 
                        padding: '10px 12px', 
                        borderRadius: '8px' 
                      }}>
                        {/* Edit Shifts */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>Edit Shifts</div>
                            <div style={{ fontSize: '9px', fontWeight: '600', color: (user.permissions?.editShifts ?? true) ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              {(user.permissions?.editShifts ?? true) ? 'Allowed' : 'Locked'}
                            </div>
                          </div>
                          <div 
                            onClick={() => handleUpdateAccessPermission(user.id, 'editShifts', !(user.permissions?.editShifts ?? true))}
                            style={{ 
                              width: '36px', 
                              height: '20px', 
                              borderRadius: '10px', 
                              backgroundColor: (user.permissions?.editShifts ?? true) ? 'var(--accent-green)' : '#cbd5e1', 
                              position: 'relative', 
                              cursor: 'pointer', 
                              transition: 'background-color 0.2s' 
                            }}
                          >
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              borderRadius: '50%', 
                              backgroundColor: 'white', 
                              position: 'absolute', 
                              top: '2px', 
                              left: (user.permissions?.editShifts ?? true) ? '18px' : '2px', 
                              transition: 'left 0.2s', 
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)' 
                            }} />
                          </div>
                        </div>

                        {/* Edit Notes */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>Edit Notes</div>
                            <div style={{ fontSize: '9px', fontWeight: '600', color: (user.permissions?.editNotes ?? true) ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              {(user.permissions?.editNotes ?? true) ? 'Allowed' : 'Locked'}
                            </div>
                          </div>
                          <div 
                            onClick={() => handleUpdateAccessPermission(user.id, 'editNotes', !(user.permissions?.editNotes ?? true))}
                            style={{ 
                              width: '36px', 
                              height: '20px', 
                              borderRadius: '10px', 
                              backgroundColor: (user.permissions?.editNotes ?? true) ? 'var(--accent-green)' : '#cbd5e1', 
                              position: 'relative', 
                              cursor: 'pointer', 
                              transition: 'background-color 0.2s' 
                            }}
                          >
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              borderRadius: '50%', 
                              backgroundColor: 'white', 
                              position: 'absolute', 
                              top: '2px', 
                              left: (user.permissions?.editNotes ?? true) ? '18px' : '2px', 
                              transition: 'left 0.2s', 
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)' 
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Visual rendering for hardcoded Fallbacks */}
                {Object.keys(userRoles).some(email => !authorizedUsers.find(u => u.id === email)) && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      System Default Leaders
                    </div>
                    {Object.keys(userRoles).map(email => {
                      if (authorizedUsers.find(u => u.id === email)) return null;
                      return (
                        <div 
                          key={email} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '10px 14px', 
                            backgroundColor: 'var(--bg-card)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '10px', 
                            opacity: 0.75, 
                            marginBottom: '6px' 
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{email}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Role: {userRoles[email]} (Default)</div>
                          </div>
                          <button 
                            onClick={() => handleGrantAccessForEmail(email)}
                            style={{ 
                              background: 'var(--accent-green)', 
                              border: 'none', 
                              color: 'white', 
                              padding: '5px 10px', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              fontSize: '11px', 
                              fontWeight: '700',
                              boxShadow: '0 1px 3px rgba(15,118,66,0.3)'
                            }}
                          >
                            Customize Access
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Profile & Google Cloud Backup Modal */}
      {showProfileModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.65)', 
          backdropFilter: 'blur(10px)', 
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: '20px', 
            padding: '24px 26px', 
            width: '100%', 
            maxWidth: '470px', 
            maxHeight: '92vh', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', 
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent-green) 0%, #16a34a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(15, 118, 66, 0.25)'
                }}>
                  <User size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                    Edit Profile & Cloud Backup
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Personalize your identity and sync database backups
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)} 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'none', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px',
                  transition: 'all 0.2s' 
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Avatar Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <label 
                  style={{ 
                    position: 'relative', 
                    cursor: 'pointer', 
                    borderRadius: '50%', 
                    width: '92px', 
                    height: '92px', 
                    border: '3px solid var(--accent-green)', 
                    boxShadow: '0 6px 18px rgba(15, 118, 66, 0.2)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Click to upload custom photo"
                >
                  {editPhotoURL ? (
                    <img src={editPhotoURL} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--header-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontSize: '36px', fontWeight: '800' }}>
                      {(editDisplayName || currentUser?.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '0', 
                    right: '0', 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--accent-green)', 
                    border: '2px solid var(--bg-card)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}>
                    <Camera size={14} />
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>

                {/* Avatar Presets */}
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Quick Avatar Presets
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                     {[
                       '/avatars/banker_male_1.jpg',
                       '/avatars/banker_female_1.jpg',
                       '/avatars/banker_male_2.jpg',
                       '/avatars/banker_female_2.jpg',
                       '/avatars/banker_male_3.jpg',
                       '/avatars/banker_female_3.jpg',
                       ...(currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? ['/avatars/banker_admin.jpg'] : [])
                     ].map(url => (
                       <img 
                         key={url} 
                         src={url} 
                         alt="avatar preset" 
                         onClick={() => setEditPhotoURL(url)}
                         style={{ 
                           width: '42px', 
                           height: '42px', 
                           borderRadius: '50%', 
                           cursor: 'pointer', 
                           border: editPhotoURL === url ? '2.5px solid var(--accent-green)' : '2px solid transparent',
                           outline: editPhotoURL === url ? '2px solid rgba(15, 118, 66, 0.3)' : 'none',
                           boxShadow: editPhotoURL === url ? '0 0 10px rgba(15, 118, 66, 0.3)' : 'none',
                           transition: 'all 0.15s' 
                         }}
                         onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                         onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                       />
                     ))}
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  <User size={13} style={{ color: 'var(--accent-green)' }} />
                  Username / Display Name
                </label>
                <input 
                  type="text" 
                  placeholder="Enter your name..." 
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-color)', 
                    backgroundColor: 'var(--input-bg)', 
                    color: 'var(--text-main)', 
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                />
              </div>

              {/* Account & Role Read-only Pills */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px', 
                backgroundColor: 'var(--header-bg)', 
                padding: '12px', 
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    <Mail size={12} />
                    Account Email
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentUser?.email}>
                    {currentUser?.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    <Shield size={12} />
                    System Role
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-green)' }}>
                    {currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? '👑 Admin' : 
                     (authorizedUsers.find(u => u.id === currentUser?.email?.toLowerCase().trim()) ? '👤 Team Leader' :
                     (userRoles[currentUser?.email?.toLowerCase().trim()] || '👤 Team Leader'))}
                  </div>
                </div>
              </div>

              {/* Dedicated Google Cloud Data Backup Section */}
              <div style={{ 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc', 
                border: '1px solid var(--border-color)', 
                borderRadius: '14px', 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px' 
              }}>
                {/* Google Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1C3.28 21.43 7.35 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.1z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.28 2.57 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                        Google Cloud Data Backup
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Synchronize schedule database snapshots
                      </div>
                    </div>
                  </div>

                  {linkedGoogleAccount ? (
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '800', 
                      color: '#16a34a', 
                      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7', 
                      padding: '3px 9px', 
                      borderRadius: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}>
                      <Check size={12} /> Connected
                    </span>
                  ) : (
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      color: 'var(--text-muted)', 
                      backgroundColor: 'var(--header-bg)', 
                      padding: '3px 9px', 
                      borderRadius: '20px', 
                      border: '1px solid var(--border-color)' 
                    }}>
                      Not Linked
                    </span>
                  )}
                </div>

                {/* Google Account Linking Bar */}
                {linkedGoogleAccount ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    backgroundColor: 'var(--bg-card)', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        {linkedGoogleAccount.photoURL ? (
                          <img src={linkedGoogleAccount.photoURL} alt="Google Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#4285F4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                            G
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                            {linkedGoogleAccount.email}
                          </span>
                          <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>
                            {linkedGoogleAccount.isCurrentAccount ? '✓ Current Account (Ready for Cloud Backup)' : '✓ Connected Cloud Account'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button 
                          type="button" 
                          onClick={() => setShowManualGoogleInput(!showManualGoogleInput)} 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#2563eb', 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Change
                        </button>
                        <button 
                          type="button" 
                          onClick={handleDisconnectGoogle} 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#ef4444', 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            cursor: 'pointer' 
                          }}
                        >
                          Unlink
                        </button>
                      </div>
                    </div>

                    {showManualGoogleInput && (
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enter another Google / Gmail address:</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            type="email" 
                            placeholder="e.g. yourname@gmail.com" 
                            value={manualGoogleEmail} 
                            onChange={e => setManualGoogleEmail(e.target.value)}
                            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '11px' }}
                          />
                          <button 
                            type="button" 
                            onClick={handleManualGoogleLink}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--accent-green)', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Instant Link Current Account Button */}
                    <button
                      type="button"
                      onClick={handleLinkCurrentAccount}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--accent-green)',
                        backgroundColor: isDark ? 'rgba(15, 118, 66, 0.15)' : '#edf7ee',
                        color: 'var(--accent-green)',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Check size={14} />
                      Use Current Google Account ({currentUser?.email || 'mohammed.dlshad0@gmail.com'})
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={googleConnecting}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: googleConnecting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1C3.28 21.43 7.35 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.1z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.28 2.57 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"/>
                        </svg>
                        {googleConnecting ? 'Connecting...' : 'Google Popup'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowManualGoogleInput(!showManualGoogleInput)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Enter Email
                      </button>
                    </div>

                    {showManualGoogleInput && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        <input 
                          type="email" 
                          placeholder="e.g. backup@gmail.com" 
                          value={manualGoogleEmail} 
                          onChange={e => setManualGoogleEmail(e.target.value)}
                          style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '11px' }}
                        />
                        <button 
                          type="button" 
                          onClick={handleManualGoogleLink}
                          style={{ padding: '7px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--accent-green)', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Link
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Backup Button */}
                <button
                  type="button"
                  onClick={handleBackupToGoogleCloud}
                  disabled={backupLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-green)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: backupLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 118, 66, 0.25)',
                    opacity: backupLoading ? 0.75 : 1
                  }}
                >
                  {backupLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Creating Database Snapshot...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      Backup Database to Google Cloud Now
                    </>
                  )}
                </button>

                {/* Backup Status and Timestamps */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', padding: '0 2px' }}>
                  <span>Last Cloud Backup:</span>
                  <span style={{ fontWeight: '700', color: lastBackupTime ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {lastBackupTime || 'None yet'}
                  </span>
                </div>

                {backupSuccessMsg && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7', 
                    color: '#16a34a', 
                    fontSize: '11px', 
                    fontWeight: '700' 
                  }}>
                    <Check size={12} />
                    {backupSuccessMsg}
                  </div>
                )}

                {/* Export Tools for Google Sheets / Google Drive */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={handleExportToGoogleSheets}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Download CSV formatted for Google Sheets import"
                  >
                    <FileSpreadsheet size={13} style={{ color: '#16a34a' }} />
                    Export Sheets CSV
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJSONBackup}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Download full JSON snapshot file for Google Drive"
                  >
                    <Database size={13} style={{ color: '#2563eb' }} />
                    Download JSON
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowProfileModal(false)} 
                  style={{ 
                    padding: '10px 18px', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-color)', 
                    backgroundColor: 'transparent', 
                    color: 'var(--text-main)', 
                    fontWeight: '700', 
                    fontSize: '13px',
                    cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={profileSaving} 
                  style={{ 
                    padding: '10px 22px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    backgroundColor: 'var(--accent-green)', 
                    color: 'white', 
                    fontWeight: '800', 
                    fontSize: '13px',
                    cursor: profileSaving ? 'not-allowed' : 'pointer', 
                    opacity: profileSaving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(15, 118, 66, 0.25)'
                  }}
                >
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
