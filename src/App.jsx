import React, { useEffect, useState, useMemo, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { db, auth } from './firebase'
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, query, where, writeBatch, onSnapshot, orderBy, limit } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { Calendar, Settings, Users, Plus, Briefcase, Clock, Moon, Sun, Search, LogOut, PhoneCall, MessageSquare, Trash2, Edit2, StickyNote, Award, Shield, GraduationCap, Headset, Folder } from 'lucide-react'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
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
  
  const [todayStats, setTodayStats] = useState({ callMorning: 0, callEvening: 0, callNight: 0, chatMorning: 0, chatEvening: 0, chatNight: 0, otherTeams: {} })

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
      await updateProfile(auth.currentUser, {
        displayName: editDisplayName || null,
        photoURL: editPhotoURL || null
      });
      setCurrentUser({ ...auth.currentUser });
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
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setEditPhotoURL(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
    empsSnap.forEach(e => {
      const team = tms.find(t => t.id === e.data().team_id);
      empTeamMap[e.id] = team ? team.name : 'No Team';
    });

    if (unsubStatsRef.current) unsubStatsRef.current();

    const schedQuery = query(collection(db, "schedules"), where("work_date", "==", todayStr));
    unsubStatsRef.current = onSnapshot(schedQuery, (schedSnap) => {
      let callM = 0; let callE = 0; let callN = 0;
      let chatM = 0; let chatE = 0; let chatN = 0;
      let others = {};

      schedSnap.forEach(docSnap => {
        const sched = docSnap.data();
        const originalTeamName = empTeamMap[sched.employee_id] || 'No Team';
        const teamNameLower = originalTeamName.toLowerCase();
        
        const code = (sched.shift_code || '').toUpperCase();
        if (['OFF','OUT','V','H','M','S','EMERGENCY', ''].includes(code)) return;
        
        const morningShifts = ['A', 'AC', 'AB', 'L'];
        const eveningShifts = ['B', 'BB', 'BC', 'LB'];
        const nightShifts = ['C'];
        
        let shiftType = 'other';
        if (morningShifts.includes(code)) shiftType = 'morning';
        else if (eveningShifts.includes(code)) shiftType = 'evening';
        else if (nightShifts.includes(code)) shiftType = 'night';

        const isExcludedTeam = teamNameLower.includes('quality') || 
                               teamNameLower.includes('leader') || 
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
    const firstWeekOfMonth = WEEKS.findIndex(w => w.monthIndex === monthIdx)
    if (firstWeekOfMonth !== -1) {
      setCurrentWeekIndex(firstWeekOfMonth)
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

  const activeDates = WEEKS[currentWeekIndex].dates
  const activeMonthIndex = WEEKS[currentWeekIndex].monthIndex
  const prevWeekDates = currentWeekIndex > 0 ? WEEKS[currentWeekIndex - 1].dates : []

  const filteredEmployees = employees.filter(emp => {
    if (selectedTeamFilter !== 'ALL' && emp.team_id !== selectedTeamFilter) return false;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="theme-btn" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {/* User info */}
          <div 
            onClick={() => {
              setEditDisplayName(currentUser?.displayName || '');
              setEditPhotoURL(currentUser?.photoURL || '');
              setShowProfileModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--header-bg)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--header-bg)'}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: '800' }}>
                {(currentUser?.displayName || currentUser?.email)?.[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2' }}>
                {currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? '👑 Admin' : 
                 (authorizedUsers.find(u => u.id === currentUser?.email?.toLowerCase().trim()) ? '👤 Team Leader' :
                 (userRoles[currentUser?.email?.toLowerCase().trim()] || '👤 Team Leader'))}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', lineHeight: '1.2' }}>{currentUser?.displayName || currentUser?.email}</span>
            </div>
          </div>
          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
            <LogOut size={15} />
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
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                {Object.keys(todayStats.otherTeams).length === 0 ? (
                   <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No other agents scheduled.</span>
                ) : (
                  Object.entries(todayStats.otherTeams).map(([team, count], idx, arr) => {
                    let teamColor = 'var(--text-main)';
                    let TeamIcon = Folder;
                    const lower = team.toLowerCase();
                    if (lower.includes('quality')) { teamColor = '#14b8a6'; TeamIcon = Award; }
                    else if (lower.includes('leader')) { teamColor = '#ec4899'; TeamIcon = Shield; }
                    else if (lower.includes('trainer')) { teamColor = '#8b5cf6'; TeamIcon = GraduationCap; }
                    else if (lower.includes('help desk') || lower.includes('helpdesk')) { teamColor = '#f97316'; TeamIcon = Headset; }
                    
                    return (
                      <React.Fragment key={team}>
                        <div style={{ minWidth: '60px' }}>
                          <div style={{ fontSize: '30px', fontWeight: '900', color: teamColor, lineHeight: '1' }}>{count}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>
                            <TeamIcon size={13} color={teamColor} />
                            {team}
                          </div>
                        </div>
                        {idx < arr.length - 1 && (
                          <div style={{ width: '1px', height: '35px', backgroundColor: 'var(--border-color)' }}></div>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
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
            <div className="custom-scrollbar" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--header-bg)', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0' }}>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <CustomSelect
                  value={currentYear}
                  onChange={(val) => handleYearChange(val)}
                  options={YEARS.map(y => ({ value: y, label: String(y) }))}
                  icon={<Calendar size={14} />}
                />
  
                {/* Week Navigator - Arrow style */}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--accent-green)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: '36px' }}>
                  <button
                    onClick={() => setCurrentWeekIndex(i => Math.max(0, i - 1))}
                    disabled={currentWeekIndex === 0}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: currentWeekIndex === 0 ? 'not-allowed' : 'pointer', padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', opacity: currentWeekIndex === 0 ? 0.4 : 1, borderRight: '1px solid rgba(255,255,255,0.2)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', letterSpacing: '0.03em' }}>{WEEKS[currentWeekIndex]?.name}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontWeight: '500' }}>({WEEKS[currentWeekIndex]?.label})</span>
                  </div>
                  <button
                    onClick={() => setCurrentWeekIndex(i => Math.min(WEEKS.length - 1, i + 1))}
                    disabled={currentWeekIndex === WEEKS.length - 1}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: currentWeekIndex === WEEKS.length - 1 ? 'not-allowed' : 'pointer', padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', opacity: currentWeekIndex === WEEKS.length - 1 ? 0.4 : 1, borderLeft: '1px solid rgba(255,255,255,0.2)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
  
                <CustomSelect
                  value={selectedTeamFilter}
                  onChange={(val) => setSelectedTeamFilter(val)}
                  options={[
                    { value: 'ALL', label: '🏢 All Teams' },
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

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)', margin: '0 16px' }}></div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {MONTHS.map((month, idx) => {
                  const isActive = idx === activeMonthIndex;
                  return (
                    <button key={month} 
                         onClick={() => handleMonthClick(idx)}
                         style={{ cursor: 'pointer', padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: isActive ? 'var(--accent-green)' : 'transparent', color: isActive ? '#FFFFFF' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                      {month}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ overflowX: 'auto', paddingBottom: '40px' }}>
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="employee-col" style={{ paddingLeft: '24px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                      Agent
                    </th>
                    {activeDates.map((date, i) => (
                      <th key={date} className="date-col" style={{ padding: '12px 8px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAY_NAMES[i]}</span>
                          <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{date.split('-')[2]}</span>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)' }}>{new Date(date).toLocaleString('default', { month: 'short' })}</span>
                        </div>
                      </th>
                    ))}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: 'var(--text-main)' }}>
                <Shield size={20} /> Access Management
              </h2>
              <button onClick={() => setShowAccess(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            <form onSubmit={handleGrantAccess} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input 
                type="email" 
                placeholder="Agent email..." 
                value={newAccessEmail}
                onChange={(e) => setNewAccessEmail(e.target.value)}
                required
                style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
              <button type="submit" style={{ backgroundColor: 'var(--accent-green)', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
            </form>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }} className="custom-scrollbar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {authorizedUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No users granted access yet.</div>
                ) : (
                  authorizedUsers.map(user => (
                    <div key={user.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{user.email}</div>
                        <button onClick={() => handleRemoveAccess(user.id)} style={{ background: 'var(--accent-red, #ef4444)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '50px' }}>Role:</span>
                        <input 
                          type="text" 
                          value={user.role || ''} 
                          onChange={(e) => handleUpdateAccessRole(user.id, e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>Edit Shifts</span>
                        <div 
                          onClick={() => handleUpdateAccessPermission(user.id, 'editShifts', !(user.permissions?.editShifts ?? true))}
                          style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: (user.permissions?.editShifts ?? true) ? 'var(--accent-green)' : 'var(--border-color)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: (user.permissions?.editShifts ?? true) ? '18px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>Edit Notes</span>
                        <div 
                          onClick={() => handleUpdateAccessPermission(user.id, 'editNotes', !(user.permissions?.editNotes ?? true))}
                          style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: (user.permissions?.editNotes ?? true) ? 'var(--accent-green)' : 'var(--border-color)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: (user.permissions?.editNotes ?? true) ? '18px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Visual rendering for hardcoded Fallbacks just so they know */}
                {Object.keys(userRoles).map(email => {
                  if (authorizedUsers.find(u => u.id === email)) return null; // skip if already in dynamic list
                  return (
                    <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', opacity: 0.6, marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Role: {userRoles[email]} (System Default)</div>
                      </div>
                      <button 
                        onClick={() => handleGrantAccessForEmail(email)}
                        style={{ background: 'var(--accent-green)', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Customize Access
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: 'var(--text-main)' }}>
                👤 Edit Profile
              </h2>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', width: '90px', height: '90px', border: '3px solid var(--accent-green)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  {editPhotoURL ? (
                    <img src={editPhotoURL} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--header-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontSize: '36px', fontWeight: '800' }}>
                      {(editDisplayName || currentUser?.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>
                    Upload
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>

                <div style={{ marginTop: '16px', display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '300px' }}>
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
                       alt="avatar" 
                       onClick={() => setEditPhotoURL(url)}
                       style={{ width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', border: editPhotoURL === url ? '2px solid var(--accent-green)' : '2px solid transparent', transition: 'transform 0.1s' }}
                       onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                       onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                     />
                   ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '6px' }}>Username</label>
                <input 
                  type="text" 
                  placeholder="Enter username..." 
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '6px' }}>Role (Job Title)</label>
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '14px', border: '1px solid var(--border-color)', opacity: 0.8, cursor: 'not-allowed' }}>
                  {currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ? '👑 Admin' : 
                   (authorizedUsers.find(u => u.id === currentUser?.email?.toLowerCase().trim()) ? '👤 Team Leader' :
                   (userRoles[currentUser?.email?.toLowerCase().trim()] || '👤 Team Leader'))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowProfileModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={profileSaving} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--accent-green)', color: 'white', fontWeight: 'bold', cursor: profileSaving ? 'not-allowed' : 'pointer', opacity: profileSaving ? 0.7 : 1 }}>
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
