import { useState, useEffect, useRef } from 'react';
import {
  Bell, LayoutDashboard, Bed, Users,
  CreditCard, LogOut, Search,
  MapPin, Phone, ShieldCheck,
  ChevronLeft, ChevronRight, UploadCloud, AlertCircle,
  CheckCircle, RefreshCw, X, Wifi, Wind, Droplets,
  Zap, Lock, BookOpen, Utensils, Shield,
  DoorOpen, GraduationCap, PhoneCall, Trash2, Calendar,
  MessageSquare, Send, Eye, Copy, CheckCheck, Loader2,
  ImageIcon, PencilLine, AlertTriangle, Clock
} from 'lucide-react';

import blockA from '../assets/hero2.jpg';
import blockB from '../assets/hero11.jpg';
import blockC from '../assets/hero3.jpg';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Mask last 4 digits of phone: 0241234567 → 0241234****
const maskPhone = (phone, isAdmin) => {
  if (!phone) return '—';
  if (isAdmin) return phone;
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4) + '****';
};

// Copy to clipboard with feedback
const useCopy = () => {
  const [copied, setCopied] = useState(null);
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copied, copy };
};

// ─── COMMON ROOM DATA (hardcoded) ─────────────────────────────────────────────
const COMMON_ROOMS = [
  {
    id:     'CMA',
    label:  'Common Room A',
    rooms:  ['A1','A2','A3','A4'],
    meter:  'A123456',
    momo:   '0547242811',
    color:  '#3B82F6',
  },
  {
    id:     'CMB',
    label:  'Common Room B',
    rooms:  ['A5','A6','A7','A8'],
    meter:  'B234987',
    momo:   '0248968970',
    color:  '#8B5CF6',
  },
  {
    id:     'CMC',
    label:  'Common Room C',
    rooms:  ['A9','A10','A11','A12'],
    meter:  'C2098765',
    momo:   '0536644026',
    color:  '#EC4899',
  },
];

// ─── RING CHART ───────────────────────────────────────────────────────────────
const RingChart = ({ percent, color, size = 80, stroke = 8 }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
    </svg>
  );
};

// ─── FLOOR MAP ROOM CELL ──────────────────────────────────────────────────────
const RoomCell = ({ room, onClick }) => {
  const pct = room.capacity > 0 ? (room.students / room.capacity) * 100 : 0;
  const bg  = pct === 0 ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
            : pct < 100 ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
            :              'bg-red-50 border-red-200 hover:border-red-400';
  const dot = pct === 0 ? 'bg-emerald-500' : pct < 100 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <button onClick={() => onClick(room)}
      className={`relative border-2 rounded-xl p-2 text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer ${bg}`}>
      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${dot}`}/>
      <p className="text-[10px] font-black text-slate-700 leading-tight">{room.number}</p>
      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{room.students}/{room.capacity}</p>
    </button>
  );
};

// ─── OCCUPANT AVATAR ─────────────────────────────────────────────────────────
const OccupantAvatar = ({ name }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const colors   = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4'];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
      style={{ background: color }}>{initials}</div>
  );
};

const academicYears = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const Dashboard = ({ userRole, userName, onLogout }) => {

  const [selectedStudent, setSelectedStudent]           = useState(null);
  const [showReviewModal, setShowReviewModal]           = useState(false);
  const [currentSlide, setCurrentSlide]                 = useState(0);
  const [activeTab, setActiveTab]                       = useState('overview');
  const [showBookingModal, setShowBookingModal]         = useState(false);
  const [bookingSuccess, setBookingSuccess]             = useState(false);
  const [bookingLoading, setBookingLoading]             = useState(false); // spinner
  const [selectedRoom, setSelectedRoom]                 = useState(null);
  const [searchTerm, setSearchTerm]                     = useState('');
  const [sidebarOpen, setSidebarOpen]                   = useState(false);
  const [activeBlock, setActiveBlock]                   = useState('A');
  const [ringsVisible, setRingsVisible]                 = useState(false);
  const [receiptLoading, setReceiptLoading]             = useState(false);
  const [receiptError, setReceiptError]                 = useState(false);
  const [showRoomModal, setShowRoomModal]               = useState(false);
  const [roomOccupants, setRoomOccupants]               = useState([]);
  const [roomOccupantsLoading, setRoomOccupantsLoading] = useState(false);
  const [previewRoom, setPreviewRoom]                   = useState(null);

  // Receipt upload UX
  const [uploadedFile, setUploadedFile]                 = useState(null);
  const [uploadedPreview, setUploadedPreview]           = useState(null);
  const fileInputRef                                    = useRef(null);

  // Complaint system
  const [complaints, setComplaints]                     = useState([]);
  const [showComplaintForm, setShowComplaintForm]       = useState(false);
  const [showComplaintModal, setShowComplaintModal]     = useState(false);
  const [selectedComplaint, setSelectedComplaint]       = useState(null);
  const [complaintForm, setComplaintForm]               = useState({ student_name: '', room_number: '', message: '' });
  const [replyText, setReplyText]                       = useState('');
  const [complaintSubmitting, setComplaintSubmitting]   = useState(false);
  const [replySubmitting, setReplySubmitting]           = useState(false);

  const [studentsList, setStudentsList] = useState([]);
  const [rooms, setRooms]               = useState([]);

  const sidebarRef = useRef(null);
  const { copied, copy } = useCopy();

  // ── API ──
  const fetchRooms = async () => {
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/rooms');
      const data = await res.json();
      setRooms(data);
    } catch (err) { console.error('Rooms:', err); }
  };

  const fetchStudents = async () => {
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/students');
      const data = await res.json();
      setStudentsList(data);
    } catch (err) { console.error('Students:', err); }
  };

  const fetchRoomOccupants = async (roomId) => {
    setRoomOccupantsLoading(true);
    try {
      const res  = await fetch(`https://hostel-backend-39y0.onrender.com/api/rooms/${roomId}/occupants`);
      const data = await res.json();
      setRoomOccupants(data);
    } catch { setRoomOccupants([]); }
    finally { setRoomOccupantsLoading(false); }
  };

  const fetchComplaints = async () => {
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/complaints');
      const data = await res.json();
      setComplaints(data);
    } catch (err) { console.error('Complaints:', err); }
  };

  useEffect(() => { fetchRooms(); fetchStudents(); fetchComplaints(); }, []);

  useEffect(() => {
    const h = (e) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target))
        setSidebarOpen(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    if (activeTab === 'blocks') {
      setRingsVisible(false);
      const t = setTimeout(() => setRingsVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  const hostelImages = [blockA, blockB, blockC];
  const nextSlide    = () => setCurrentSlide(p => (p === 2 ? 0 : p + 1));
  const prevSlide    = () => setCurrentSlide(p => (p === 0 ? 2 : p - 1));
  useEffect(() => {
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [currentSlide]);

  const handleNavClick = (tab) => { setActiveTab(tab); setSidebarOpen(false); };

  const handleRoomCardClick = async (room) => {
    setPreviewRoom(room);
    setShowRoomModal(true);
    await fetchRoomOccupants(room.id);
  };

  const handleProceedToBook = () => {
    setShowRoomModal(false);
    setSelectedRoom(previewRoom);
    setBookingSuccess(false);
    setUploadedFile(null);
    setUploadedPreview(null);
    setShowBookingModal(true);
  };

  // Handle file selection for receipt
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── BOOKING SUBMIT with spinner ──
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    const fd = new FormData(e.target);
    fd.append('roomNumber', selectedRoom.number);
    // attach the file from state
    if (uploadedFile) fd.set('receipt', uploadedFile);
    try {
      const res = await fetch('https://hostel-backend-39y0.onrender.com/api/book', { method: 'POST', body: fd });
      if (res.ok) { setBookingSuccess(true); fetchStudents(); fetchRooms(); }
      else alert('Server error. Please try again.');
    } catch { alert('Connection failed.'); }
    finally { setBookingLoading(false); }
  };

  const handleOpenReview = (student) => {
    setSelectedStudent(student);
    setReceiptLoading(true);
    setReceiptError(false);
    setShowReviewModal(true);
  };

  const handleAccept = async (id) => {
    try {
      const res = await fetch(`https://hostel-backend-39y0.onrender.com/api/accept-student/${id}`, { method: 'POST' });
      if (res.ok) { fetchStudents(); fetchRooms(); setShowReviewModal(false); setSelectedStudent(null); alert('Verified!'); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this student record?')) return;
    try {
      const res = await fetch(`https://hostel-backend-39y0.onrender.com/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) { setStudentsList(p => p.filter(s => s.id !== id)); setShowReviewModal(false); setSelectedStudent(null); }
      else alert('Failed to delete.');
    } catch { alert('Connection error.'); }
  };

  // ── COMPLAINT HANDLERS ──
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintSubmitting(true);
    try {
      const res = await fetch('https://hostel-backend-39y0.onrender.com/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaintForm)
      });
      if (res.ok) {
        setComplaintForm({ student_name: '', room_number: '', message: '' });
        setShowComplaintForm(false);
        fetchComplaints();
        alert('Complaint submitted! The admin will review it shortly.');
      }
    } catch { alert('Connection error.'); }
    finally { setComplaintSubmitting(false); }
  };

  const handleReplySubmit = async (complaintId) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`https://hostel-backend-39y0.onrender.com/api/complaints/${complaintId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      });
      if (res.ok) {
        setReplyText('');
        setShowComplaintModal(false);
        setSelectedComplaint(null);
        fetchComplaints();
      }
    } catch { alert('Connection error.'); }
    finally { setReplySubmitting(false); }
  };

  const handleResolve = async (complaintId) => {
    try {
      await fetch(`https://hostel-backend-39y0.onrender.com/api/complaints/${complaintId}/resolve`, { method: 'POST' });
      fetchComplaints();
      setShowComplaintModal(false);
    } catch (e) { console.error(e); }
  };

  // ── STATS ──
  const filteredStudents = studentsList.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.program?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalStudents  = studentsList.length;
  const occupiedBeds   = rooms.reduce((a, r) => a + (r.students || 0), 0);
  const totalCapacity  = rooms.reduce((a, r) => a + (r.capacity || 0), 0);
  const occupancyRate  = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;
  const pendingCount   = studentsList.filter(s => s.status === 'Pending').length;
  const openComplaints = complaints.filter(c => c.status === 'Open').length;

  const blockARooms = rooms.filter(r => r.block === 'A');
  const blockBRooms = rooms.filter(r => r.block === 'B');
  const blockCRooms = rooms.filter(r => r.block === 'C');

  const blockDefs = {
    A: { label: 'Block A', desc: '4-bed rooms', color: '#3B82F6', capacity: 4, rooms: blockARooms },
    B: { label: 'Block B', desc: '2-bed rooms', color: '#8B5CF6', capacity: 2, rooms: blockBRooms },
    C: { label: 'Block C', desc: '3-bed rooms', color: '#EC4899', capacity: 3, rooms: blockCRooms },
  };

  const blockStats = (key) => {
    const br  = blockDefs[key].rooms;
    const cap = br.reduce((a, r) => a + (r.capacity || 0), 0);
    const occ = br.reduce((a, r) => a + (r.students || 0), 0);
    const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
    return { cap, occ, pct, avail: br.filter(r => r.status !== 'Occupied').length, total: br.length };
  };

  const amenities = [
    { icon: <Wifi size={18}/>,     label: 'Free Wi-Fi',    desc: 'High-speed in all blocks' },
    { icon: <Wind size={18}/>,     label: 'Ventilation',   desc: 'Cross-ventilated rooms'   },
    { icon: <Droplets size={18}/>, label: 'Running Water', desc: '24 hr water supply'       },
    { icon: <Zap size={18}/>,      label: 'Power Supply',  desc: 'Backup generator'         },
    { icon: <Lock size={18}/>,     label: 'Security',      desc: 'Gated + night guards'     },
    { icon: <BookOpen size={18}/>, label: 'Study Room',    desc: 'Block B, 2nd floor'       },
    { icon: <Utensils size={18}/>, label: 'Dining Hall',   desc: 'Meals 3× daily'           },
    { icon: <Shield size={18}/>,   label: 'CCTV Coverage', desc: 'All corridors'            },
  ];

  const rules = [
    'No visitors after 10:00 PM',
    'Maintain noise levels in study hours (8 PM – 6 AM)',
    'Keep common areas clean at all times',
    'Report maintenance issues to the warden immediately',
    'No cooking inside rooms — use the dining hall',
    'All guests must be signed in at the gate',
  ];

  const profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'Guest')}&background=0D8ABC&color=fff`;

  const BedSlots = ({ occupied, capacity }) => (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: capacity }).map((_, i) => (
        <div key={i} className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center ${i < occupied ? 'bg-blue-100 border-blue-300' : 'bg-slate-50 border-dashed border-slate-300'}`}>
          <Bed size={14} className={i < occupied ? 'text-blue-500' : 'text-slate-300'}/>
        </div>
      ))}
    </div>
  );

  // Complaint status badge
  const ComplaintBadge = ({ status }) => {
    const map = {
      Open:     'bg-red-50 text-red-600 border-red-100',
      Replied:  'bg-blue-50 text-blue-600 border-blue-100',
      Resolved: 'bg-green-50 text-green-600 border-green-100',
    };
    return (
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${map[status] || map.Open}`}>{status}</span>
    );
  };

  // ── COMMON ROOM SECTION ──
  const CommonRoomSection = ({ students }) => (
    <div className="space-y-4">
      {COMMON_ROOMS.map(cr => {
        const crStudents = students.filter(s => cr.rooms.includes(s.room));
        return (
          <div key={cr.id} className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm"
            style={{ borderColor: cr.color + '44' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ background: cr.color + '0d', borderColor: cr.color + '22' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                  style={{ background: cr.color }}>{cr.id}</div>
                <div>
                  <p className="text-sm font-black text-slate-800">{cr.label}</p>
                  <p className="text-[10px] text-slate-400 font-bold">Rooms {cr.rooms.join(', ')}</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full text-white" style={{ background: cr.color }}>
                {crStudents.length} resident{crStudents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Meter + MoMo */}
            <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wide mb-1.5">Meter Number</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-800 font-mono">{cr.meter}</p>
                  <button onClick={() => copy(cr.meter, `meter-${cr.id}`)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-all text-slate-400 hover:text-slate-600 shrink-0">
                    {copied === `meter-${cr.id}` ? <CheckCheck size={13} className="text-green-500"/> : <Copy size={13}/>}
                  </button>
                </div>
                {copied === `meter-${cr.id}` && <p className="text-[9px] text-green-500 font-bold mt-1">Copied!</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wide mb-1.5">MoMo Number</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-800 font-mono">{cr.momo}</p>
                  <button onClick={() => copy(cr.momo, `momo-${cr.id}`)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-all text-slate-400 hover:text-slate-600 shrink-0">
                    {copied === `momo-${cr.id}` ? <CheckCheck size={13} className="text-green-500"/> : <Copy size={13}/>}
                  </button>
                </div>
                {copied === `momo-${cr.id}` && <p className="text-[9px] text-green-500 font-bold mt-1">Copied!</p>}
              </div>
            </div>

            {/* Residents */}
            <div className="px-5 py-4">
              {crStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">No residents yet</p>
              ) : (
                <div className="space-y-2">
                  {crStudents.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <OccupantAvatar name={s.name}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <PhoneCall size={8}/> {maskPhone(s.phone, userRole === 'admin')}
                          </span>
                          {s.program && <span className="text-[9px] text-blue-500 flex items-center gap-1"><GraduationCap size={8}/> {s.program}</span>}
                          {s.academic_year && <span className="text-[9px] text-purple-500 flex items-center gap-1"><Calendar size={8}/> {s.academic_year}</span>}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">{s.room}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"/>}

      {/* ── SIDEBAR ── */}
      <aside ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col
          transition-transform duration-300 ease-in-out
          md:relative md:w-64 md:translate-x-0 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-blue-400">
            HostelHub <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-200">v2.0</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><X size={20}/></button>
        </div>
        <div className="md:hidden px-4 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
            <img src={profileImage} className="h-9 w-9 rounded-full border-2 border-blue-500 shrink-0" alt="profile"/>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase">{userRole}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { icon: <LayoutDashboard size={20}/>, label: 'Overview',        tab: 'overview' },
            { icon: <Bed size={20}/>,             label: 'Room Allotment',  tab: 'rooms'    },
            { icon: <Users size={20}/>,           label: 'Students list',   tab: 'students' },
            { icon: <MapPin size={20}/>,          label: 'Blocks & Layout', tab: 'blocks'   },
          ].map(({ icon, label, tab }) => (
            <NavItem key={tab} icon={icon} label={label} active={activeTab === tab} onClick={() => handleNavClick(tab)}/>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800 w-full px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all">
            <LogOut size={20}/> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-700 active:scale-95 transition-all shrink-0 gap-[5px] group"
              aria-label="Open menu">
              <span className="block w-5 h-[2px] bg-white rounded-full"/>
              <span className="block w-3.5 h-[2px] bg-blue-400 rounded-full transition-all duration-200 group-hover:w-5"/>
              <span className="block w-5 h-[2px] bg-white rounded-full"/>
            </button>
            <h1 className="text-base md:text-xl font-bold text-slate-800 capitalize tracking-tight truncate">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <button onClick={() => { fetchRooms(); fetchStudents(); fetchComplaints(); }} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all group">
              <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500"/>
            </button>
            <div className="relative text-slate-500">
              <Bell size={20}/>
              {(pendingCount + openComplaints) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {pendingCount + openComplaints}
                </span>
              )}
            </div>
            <div className="hidden md:flex items-center gap-3 border-l pl-6 border-slate-200">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700 leading-none">{userName}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase">{userRole}</p>
              </div>
              <img src={profileImage} className="h-9 w-9 rounded-full border-2 border-blue-500" alt="profile"/>
            </div>
            <img src={profileImage} className="md:hidden h-8 w-8 rounded-full border-2 border-blue-500" alt="profile"/>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* ══════════════════════════════
              OVERVIEW — with complaint system
              ══════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard title="Total Students" value={totalStudents}  icon={<Users className="text-blue-600"/>}          trend="+Live"/>
                <StatCard title="Occupied Beds"  value={occupiedBeds}   icon={<Bed className="text-green-600"/>}           trend={`${occupancyRate}% Full`}/>
                <StatCard title="Pending Review" value={pendingCount}   icon={<CreditCard className="text-amber-600"/>}    trend="Action Required"/>
                <StatCard title="Open Complaints" value={openComplaints} icon={<MessageSquare className="text-red-500"/>}  trend={openComplaints > 0 ? 'Needs Attention' : 'All Clear'}/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4">Hostel Management Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoBox icon={<ShieldCheck size={18}/>} label="Head Warden"    value="Mr. Samuel Dogbatse"/>
                    <InfoBox icon={<Phone size={18}/>}       label="Emergency Line" value="+233 24 123 4567"/>
                    <InfoBox icon={<Bed size={18}/>}         label="Total Capacity" value={`${totalCapacity} Beds`}/>
                    <InfoBox icon={<MapPin size={18}/>}      label="Primary Office" value="Block B, Ground Floor"/>
                  </div>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4">System Status</h3>
                  <div className="space-y-4">
                    <ActivityItem label="Live Database"      desc="Connected to Neon PostgreSQL" time="Status: Online"/>
                    <ActivityItem label="Cloudinary Storage" desc="Receipts stored permanently"  time="Status: Active"/>
                  </div>
                </div>
              </div>

              {/* ── COMPLAINT SECTION ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                      <MessageSquare size={18} className="text-red-500"/>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Complaints & Issues</h3>
                      <p className="text-[10px] text-slate-400">{openComplaints} open · {complaints.filter(c=>c.status==='Replied').length} replied · {complaints.filter(c=>c.status==='Resolved').length} resolved</p>
                    </div>
                  </div>
                  {/* Students see Submit button, admin sees count */}
                  {userRole !== 'admin' && (
                    <button onClick={() => setShowComplaintForm(true)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                      <Send size={13}/> Submit Issue
                    </button>
                  )}
                </div>

                {/* Admin: list of all complaints */}
                {userRole === 'admin' && (
                  <div className="divide-y divide-slate-50">
                    {complaints.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <MessageSquare size={28} className="mx-auto mb-2 opacity-30"/>
                        <p className="text-sm font-medium">No complaints yet</p>
                      </div>
                    ) : complaints.map(c => (
                      <div key={c.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle size={15} className="text-amber-500"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-bold text-slate-800">{c.student_name}</p>
                            {c.room_number && <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{c.room_number}</span>}
                            <ComplaintBadge status={c.status}/>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.message}</p>
                          {c.admin_reply && (
                            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                              <p className="text-[9px] text-blue-400 font-black uppercase mb-0.5">Admin Reply</p>
                              <p className="text-xs text-blue-700">{c.admin_reply}</p>
                            </div>
                          )}
                          <p className="text-[9px] text-slate-300 mt-1.5 flex items-center gap-1"><Clock size={9}/> {c.created_at}</p>
                        </div>
                        <button onClick={() => { setSelectedComplaint(c); setReplyText(c.admin_reply || ''); setShowComplaintModal(true); }}
                          className="shrink-0 p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all border border-blue-100">
                          <Send size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Student: see their own complaints / replies */}
                {userRole !== 'admin' && (
                  <div className="px-6 py-4">
                    {complaints.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4">No complaints submitted yet</p>
                    ) : complaints.slice(0, 5).map(c => (
                      <div key={c.id} className="mb-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.message.slice(0, 60)}{c.message.length > 60 ? '...' : ''}</p>
                          <ComplaintBadge status={c.status}/>
                        </div>
                        {c.admin_reply && (
                          <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                            <p className="text-[9px] text-blue-400 font-black uppercase mb-0.5">Admin Reply</p>
                            <p className="text-xs text-blue-700">{c.admin_reply}</p>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-300 mt-1.5 flex items-center gap-1"><Clock size={9}/> {c.created_at}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STUDENTS ── */}
          {activeTab === 'students' && (
            <div className="space-y-5 animate-in fade-in duration-500">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="text" placeholder="Search by name, room or program..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredStudents.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                        {s.program && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full mt-1 font-bold">
                            <GraduationCap size={9}/> {s.program}
                          </span>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ml-2 ${s.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{s.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-400 font-bold flex-wrap">
                      <span>Room: <span className="text-slate-600">{s.room}</span></span>
                      {s.academic_year && <span className="flex items-center gap-1"><Calendar size={9}/> {s.academic_year}</span>}
                      <span className="flex items-center gap-1 font-mono"><PhoneCall size={9}/> {maskPhone(s.phone, userRole === 'admin')}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {userRole === 'admin' && s.status === 'Pending' && (
                        <button onClick={() => handleOpenReview(s)}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-[10px] font-bold shadow transition-all animate-pulse">
                          <Search size={13}/> Review
                        </button>
                      )}
                      {s.status === 'Paid' && (
                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                          <ShieldCheck size={13}/> Verified
                        </div>
                      )}
                      {userRole === 'admin' && (
                        <button onClick={() => handleDelete(s.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all border border-red-100">
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Program</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Year</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Room</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{s.name}</td>
                        <td className="px-6 py-4">
                          {s.program ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-bold">
                              <GraduationCap size={10}/> {s.program}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {s.academic_year ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full font-bold">
                              <Calendar size={10}/> {s.academic_year}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{maskPhone(s.phone, userRole === 'admin')}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-bold">{s.room}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold inline-block border ${s.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{s.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {userRole === 'admin' && s.status === 'Pending' && (
                              <button onClick={() => handleOpenReview(s)}
                                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold shadow-lg transition-all animate-pulse">
                                <Search size={14}/> Review
                              </button>
                            )}
                            {s.status === 'Paid' && (
                              <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                <ShieldCheck size={14}/> Verified
                              </div>
                            )}
                            {userRole === 'admin' && (
                              <button onClick={() => handleDelete(s.id)}
                                className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all border border-red-100">
                                <Trash2 size={14}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROOMS ── */}
          {activeTab === 'rooms' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl font-black text-slate-800">{rooms.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Total Rooms</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl font-black text-emerald-600">{rooms.filter(r => r.status === 'Available').length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Available</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl font-black text-blue-600">{rooms.filter(r => r.status === 'Occupied').length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Fully Occupied</p>
                </div>
              </div>
              {[{ key: 'A', list: blockARooms, color: 'bg-blue-500', textColor: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Block A — 4-bed rooms' },
                { key: 'B', list: blockBRooms, color: 'bg-purple-500', textColor: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', label: 'Block B — 2-bed rooms' },
                { key: 'C', list: blockCRooms, color: 'bg-pink-500', textColor: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', label: 'Block C — 3-bed rooms' }
              ].map(({ key, list, color, textColor, bg, border, label }) => list.length > 0 && (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-2 h-6 rounded-full ${color}`}/>
                    <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">{label}</h2>
                    <span className={`text-[10px] ${textColor} ${bg} border ${border} px-2 py-0.5 rounded-full font-bold`}>{list.length} rooms</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map(room => <RoomCard key={room.id} room={room} onView={handleRoomCardClick}/>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── BLOCKS ── */}
          {activeTab === 'blocks' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="relative w-full h-56 md:h-80 rounded-3xl overflow-hidden shadow-xl bg-slate-900">
                <img src={hostelImages[currentSlide]} className="w-full h-full object-cover duration-700 brightness-75" alt="Block View"/>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"/>
                <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"><ChevronLeft size={20}/></button>
                <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"><ChevronRight size={20}/></button>
                <div className="absolute bottom-5 left-5">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {currentSlide === 0 ? 'Block A — 4-Bed Rooms' : currentSlide === 1 ? 'Block B — 2-Bed Rooms' : 'Block C — 3-Bed Rooms'}
                  </span>
                  <p className="text-white text-lg font-bold mt-2 drop-shadow">University of Mines & Technology Hostel</p>
                </div>
                <div className="absolute bottom-5 right-5 flex gap-2">
                  {[0,1,2].map(i => (
                    <button key={i} onClick={() => setCurrentSlide(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white w-6' : 'bg-white/50 w-2'}`}/>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Block Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {(['A','B','C']).map(key => {
                    const def  = blockDefs[key];
                    const stat = blockStats(key);
                    return (
                      <div key={key}
                        className={`bg-white rounded-3xl border-2 p-5 md:p-6 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg ${activeBlock === key ? 'border-blue-400 shadow-blue-100' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => setActiveBlock(key)}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-base font-black text-slate-800">{def.label}</h3>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: def.color + '22', color: def.color }}>{def.desc}</span>
                          </div>
                          <div className="relative flex items-center justify-center">
                            <RingChart percent={ringsVisible ? stat.pct : 0} color={def.color} size={72} stroke={7}/>
                            <span className="absolute text-sm font-black text-slate-700">{stat.pct}%</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mb-4">{stat.total} rooms · {def.capacity} beds each</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 rounded-xl py-2">
                            <p className="text-lg font-black text-slate-800">{stat.occ}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Occupied</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl py-2">
                            <p className="text-lg font-black text-slate-800">{stat.cap}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Capacity</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl py-2">
                            <p className="text-lg font-black text-emerald-600">{stat.avail}</p>
                            <p className="text-[9px] text-emerald-500 font-bold uppercase">Free</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Floor map */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{blockDefs[activeBlock].label} — Floor Map</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{blockDefs[activeBlock].desc} · click any room to view or book</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/><span className="text-slate-500">Available</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"/><span className="text-slate-500">Partial</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/><span className="text-slate-500">Full</span></span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 bg-slate-100 border-y border-slate-200 flex items-center justify-center z-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Main Corridor</p>
                  </div>
                  <div className="relative z-10 grid grid-cols-6 gap-2 mb-10">
                    {blockDefs[activeBlock].rooms.slice(0, Math.ceil(blockDefs[activeBlock].rooms.length / 2)).map(room => (
                      <RoomCell key={room.id} room={room} onClick={handleRoomCardClick}/>
                    ))}
                  </div>
                  <div className="relative z-10 grid grid-cols-6 gap-2 mt-10">
                    {blockDefs[activeBlock].rooms.slice(Math.ceil(blockDefs[activeBlock].rooms.length / 2)).map(room => (
                      <RoomCell key={room.id} room={room} onClick={handleRoomCardClick}/>
                    ))}
                  </div>
                </div>
              </div>

              {/* Common rooms — Block A only */}
              {activeBlock === 'A' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Common Rooms — Block A</h2>
                    <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-bold">Meter & MoMo numbers</span>
                  </div>
                  <CommonRoomSection students={studentsList}/>
                </div>
              )}

              {/* Amenities */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">Hostel Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                  {amenities.map(({ icon, label, desc }) => (
                    <div key={label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-200 group">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-3 text-blue-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200">{icon}</div>
                      <p className="text-xs font-bold text-slate-700 leading-tight">{label}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl p-5 md:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"><Shield size={20} className="text-white"/></div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Hostel Rules & Regulations</h2>
                    <p className="text-xs text-slate-400">All residents must comply</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-3 bg-slate-800 rounded-2xl px-4 py-3">
                      <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 rounded-lg w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-slate-300 leading-snug">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ══════════════════════════════════
          MODAL: ROOM DETAILS
          ══════════════════════════════════ */}
      {showRoomModal && previewRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRoomModal(false)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: previewRoom.block === 'A' ? '#3B82F6' : previewRoom.block === 'B' ? '#8B5CF6' : '#EC4899' }}>
                  <DoorOpen size={20} className="text-white"/>
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">Room {previewRoom.number}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{previewRoom.type} · {previewRoom.capacity}-bed · {previewRoom.status}</p>
                </div>
              </div>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-slate-600 uppercase tracking-wide">Bed Occupancy</p>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                    previewRoom.students === previewRoom.capacity ? 'bg-red-100 text-red-600'
                    : previewRoom.students === 0 ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                  }`}>{previewRoom.capacity - previewRoom.students} bed{previewRoom.capacity - previewRoom.students !== 1 ? 's' : ''} free</span>
                </div>
                <BedSlots occupied={previewRoom.students} capacity={previewRoom.capacity}/>
                <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${(previewRoom.students / previewRoom.capacity) * 100}%` }}/>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-slate-500"/>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-wide">Current Occupants</p>
                </div>
                {roomOccupantsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"/>
                  </div>
                ) : roomOccupants.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Bed size={28} className="text-slate-300 mx-auto mb-2"/>
                    <p className="text-sm text-slate-400 font-medium">No occupants yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roomOccupants.map((occ, i) => (
                      <div key={occ.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <OccupantAvatar name={occ.name}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{occ.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {occ.program && <span className="flex items-center gap-1 text-[10px] text-slate-400"><GraduationCap size={10}/> {occ.program}</span>}
                            {occ.academic_year && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Calendar size={10}/> {occ.academic_year}</span>}
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <PhoneCall size={10}/> {maskPhone(occ.phone, userRole === 'admin')}
                            </span>
                            {userRole === 'admin' && (
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${occ.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{occ.status}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                          <p className="text-[9px] font-black text-slate-500">B{i+1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0">
              {previewRoom.status === 'Occupied' ? (
                <div className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl text-center text-sm">Room is fully occupied</div>
              ) : (
                <button onClick={handleProceedToBook}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg text-sm flex items-center justify-center gap-2">
                  <UploadCloud size={18}/> Book This Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL: ADMIN REVIEW
          ══════════════════════════════════ */}
      {showReviewModal && selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-800">Verify Allotment</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <div className="space-y-5">
              <div className="aspect-video bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 relative overflow-hidden flex items-center justify-center">
                {selectedStudent?.receipt ? (
                  <>
                    {receiptLoading && !receiptError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50 z-10">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"/>
                        <p className="text-blue-400 text-xs font-medium">Loading receipt...</p>
                      </div>
                    )}
                    {receiptError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50 z-10">
                        <AlertCircle className="text-red-400 mb-2" size={32}/>
                        <p className="text-red-400 text-sm font-medium">Failed to load</p>
                      </div>
                    )}
                    <img src={selectedStudent.receipt}
                      className={`w-full h-full object-contain transition-opacity duration-300 ${receiptLoading || receiptError ? 'opacity-0' : 'opacity-100'}`}
                      alt="Receipt"
                      onLoad={() => setReceiptLoading(false)}
                      onError={() => { setReceiptLoading(false); setReceiptError(true); }}/>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="text-blue-300 mb-2" size={32}/>
                    <p className="text-blue-400 text-sm italic">No receipt uploaded</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 text-center">Student Details</p>
                <h4 className="text-base font-bold text-slate-700 text-center">{selectedStudent.name}</h4>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">Room: {selectedStudent.room}</span>
                  {selectedStudent.program && <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg flex items-center gap-1"><GraduationCap size={9}/> {selectedStudent.program}</span>}
                  {selectedStudent.academic_year && <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg flex items-center gap-1"><Calendar size={9}/> {selectedStudent.academic_year}</span>}
                  <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg font-mono">{selectedStudent.phone}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleDelete(selectedStudent.id)} className="py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all">Decline & Delete</button>
                <button onClick={() => handleAccept(selectedStudent.id)} className="py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg transition-all">Verify Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL: BOOKING FORM with spinner + receipt UX
          ══════════════════════════════════ */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!bookingLoading) { setShowBookingModal(false); setBookingSuccess(false); }}}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-in zoom-in duration-300">
            {bookingSuccess ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="text-green-600" size={32}/>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Booking Submitted!</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Your receipt has been uploaded for Room <strong>{selectedRoom?.number}</strong>.<br/>
                  The warden will verify your payment shortly.
                </p>
                <button onClick={() => { setShowBookingModal(false); setBookingSuccess(false); }}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all uppercase text-xs tracking-widest">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <DoorOpen size={20} className="text-white"/>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Book Room {selectedRoom?.number}</h2>
                    <p className="text-xs text-slate-400">{selectedRoom?.type} · {selectedRoom?.capacity}-bed room</p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleBookingSubmit}>

                  {/* ── RECEIPT UPLOAD with preview + view/edit + green check ── */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Payment Receipt</label>

                    {uploadedPreview ? (
                      // After upload — show preview + success + view/edit button
                      <div className="rounded-2xl border-2 border-green-300 bg-green-50 overflow-hidden">
                        <div className="relative h-36">
                          <img src={uploadedPreview} className="w-full h-full object-contain" alt="Receipt preview"/>
                        </div>
                        <div className="flex items-center justify-between px-4 py-2.5 bg-green-100 border-t border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={15} className="text-green-600 shrink-0"/>
                            <p className="text-xs font-bold text-green-700">Photo uploaded successfully</p>
                          </div>
                          {/* View/Edit button */}
                          <button type="button" onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                            <PencilLine size={11}/> View / Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Before upload — dashed upload zone
                      <div className="relative border-2 border-dashed border-blue-200 rounded-2xl p-6 bg-blue-50/40 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                        onClick={() => fileInputRef.current?.click()}>
                        <div className="flex flex-col items-center">
                          <ImageIcon className="text-blue-400 mb-2" size={26}/>
                          <p className="text-sm font-bold text-slate-700">Tap to upload receipt</p>
                          <p className="text-xs text-slate-400 mt-1">JPG, PNG — saved to Cloudinary</p>
                        </div>
                      </div>
                    )}

                    {/* Hidden file input — triggered by both zones */}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={handleFileChange} required={!uploadedFile}/>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Full Name</label>
                    <input name="studentName" type="text" className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" placeholder="e.g. Kwame Mensah" required/>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Phone Number</label>
                    <input name="phone" type="tel" className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" placeholder="e.g. 0241234567" required/>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Program / Course</label>
                    <input name="program" type="text" className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" placeholder="e.g. Geomatic Engineering" required/>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Academic Year Admitted</label>
                    <select name="academicYear" className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none cursor-pointer" required>
                      <option value="">Select year...</option>
                      {academicYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                    </select>
                  </div>

                  {/* ── SUBMIT BUTTON with spinner ── */}
                  <button type="submit" disabled={bookingLoading}
                    className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-2 ${
                      bookingLoading
                        ? 'bg-blue-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                    }`}>
                    {bookingLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin"/>
                        Processing your booking...
                      </>
                    ) : (
                      'Confirm Booking Request'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL: COMPLAINT SUBMIT FORM
          ══════════════════════════════════ */}
      {showComplaintForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowComplaintForm(false)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <MessageSquare size={17} className="text-red-500"/>
                </div>
                <h3 className="font-bold text-lg text-slate-800">Submit a Complaint</h3>
              </div>
              <button onClick={() => setShowComplaintForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <form className="space-y-4" onSubmit={handleComplaintSubmit}>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Your Name</label>
                <input type="text" className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Full name"
                  value={complaintForm.student_name} onChange={e => setComplaintForm(p => ({...p, student_name: e.target.value}))} required/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Room Number</label>
                <input type="text" className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. A3"
                  value={complaintForm.room_number} onChange={e => setComplaintForm(p => ({...p, room_number: e.target.value}))}/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Describe your issue</label>
                <textarea rows={4} className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" placeholder="Describe the challenge you are facing..."
                  value={complaintForm.message} onChange={e => setComplaintForm(p => ({...p, message: e.target.value}))} required/>
              </div>
              <button type="submit" disabled={complaintSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  complaintSubmitting ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                }`}>
                {complaintSubmitting ? <><Loader2 size={16} className="animate-spin"/> Submitting...</> : <><Send size={16}/> Submit Complaint</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL: ADMIN REPLY TO COMPLAINT
          ══════════════════════════════════ */}
      {showComplaintModal && selectedComplaint && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowComplaintModal(false)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg text-slate-800">Reply to Complaint</h3>
              <button onClick={() => setShowComplaintModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            {/* Original complaint */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-sm font-bold text-slate-800">{selectedComplaint.student_name}</p>
                {selectedComplaint.room_number && <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">{selectedComplaint.room_number}</span>}
                <span className="ml-auto"><ComplaintBadge status={selectedComplaint.status}/></span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedComplaint.message}</p>
              <p className="text-[9px] text-slate-300 mt-2 flex items-center gap-1"><Clock size={9}/> {selectedComplaint.created_at}</p>
            </div>
            {/* Reply input */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Your Reply</label>
              <textarea rows={4} className="w-full px-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="Type your response to the student..."
                value={replyText} onChange={e => setReplyText(e.target.value)}/>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleResolve(selectedComplaint.id)}
                  className="py-3 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all text-sm flex items-center justify-center gap-1.5">
                  <CheckCheck size={15}/> Mark Resolved
                </button>
                <button onClick={() => handleReplySubmit(selectedComplaint.id)} disabled={replySubmitting}
                  className={`py-3 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-1.5 ${
                    replySubmitting ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  }`}>
                  {replySubmitting ? <><Loader2 size={14} className="animate-spin"/> Sending...</> : <><Send size={14}/> Send Reply</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── MINI COMPONENTS ── */

const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left ${active ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon}<span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start">
      <div className="p-2.5 md:p-3 bg-slate-50 rounded-2xl">{icon}</div>
      <span className="text-[9px] md:text-[10px] font-bold text-green-600 bg-green-50 px-2 md:px-3 py-1 rounded-full">{trend}</span>
    </div>
    <div className="mt-4">
      <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mb-1">{title}</p>
      <h4 className="text-2xl md:text-3xl font-black text-slate-800">{value}</h4>
    </div>
  </div>
);

const InfoBox = ({ icon, label, value }) => (
  <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
    <div className="text-blue-500 p-2 bg-white rounded-lg shadow-sm shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</p>
      <p className="text-sm text-slate-800 font-bold truncate">{value}</p>
    </div>
  </div>
);

const ActivityItem = ({ label, desc, time }) => (
  <div className="flex gap-3 pb-3 border-b border-slate-50 last:border-0">
    <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0"/>
    <div>
      <p className="text-xs font-bold text-slate-800">{label}</p>
      <p className="text-[11px] text-slate-500 font-medium">{desc}</p>
      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">{time}</p>
    </div>
  </div>
);

const RoomCard = ({ room, onView }) => {
  const pct        = room.capacity > 0 ? Math.round((room.students / room.capacity) * 100) : 0;
  const isOccupied = room.status === 'Occupied';
  return (
    <div onClick={() => onView(room)}
      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">Room {room.number}</h4>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{room.type} · {room.capacity}-bed</p>
        </div>
        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${
          isOccupied ? 'bg-red-50 text-red-600 border-red-100'
          : room.students > 0 ? 'bg-amber-50 text-amber-600 border-amber-100'
          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
        }`}>{isOccupied ? 'Full' : room.students > 0 ? 'Partial' : 'Available'}</span>
      </div>
      {room.students > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: Math.min(room.students, 4) }).map((_, i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center -ml-1 first:ml-0 shadow-sm">
              <Users size={12} className="text-blue-500"/>
            </div>
          ))}
          {room.students > 4 && <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center -ml-1 shadow-sm"><p className="text-[9px] font-black text-slate-500">+{room.students-4}</p></div>}
          <p className="text-[10px] text-slate-400 font-bold ml-2">{room.students} occupant{room.students !== 1 ? 's' : ''}</p>
        </div>
      )}
      <div className="w-full bg-slate-100 h-2 rounded-full mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }}/>
      </div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-400 font-medium">{room.students} / {room.capacity} beds</p>
        <p className="text-xs font-bold text-slate-500">{pct}% full</p>
      </div>
      <div className={`w-full py-2.5 rounded-2xl font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 ${
        isOccupied ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
      }`}>
        {isOccupied ? 'Room Full — View Details' : <><DoorOpen size={14}/> View Details & Book</>}
      </div>
    </div>
  );
};

export default Dashboard;
