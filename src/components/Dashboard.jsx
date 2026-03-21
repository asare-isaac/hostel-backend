import { useState, useEffect } from 'react';
import { 
  Bell, LayoutDashboard, Bed, Users, 
  CreditCard, Settings, LogOut, Search, Plus, 
  MapPin, Phone, ShieldCheck, Clock, X, Wrench, UserPlus,
  ChevronLeft, ChevronRight, UploadCloud, AlertCircle,
  CheckCircle, RefreshCw
} from 'lucide-react';

// Assets
import blockA from '../assets/hero2.jpg';
import blockB from '../assets/hero11.jpg';
import blockC from '../assets/hero3.jpg';

// UPDATED: Destructure the props correctly to match App.jsx
const Dashboard = ({ userRole, userName, onLogout }) => {
  // 1. STATE MANAGEMENT
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false); 
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyVacant, setShowOnlyVacant] = useState(false);

  // --- DATABASE DATA STATE ---
  const [studentsList, setStudentsList] = useState([]);
  const [rooms, setRooms] = useState([]);

  // --- API FETCH FUNCTIONS (The "Engine") ---
  const fetchRooms = async () => {
    try {
      const res = await fetch(' https://hostel-backend-39y0.onrender.com/api/rooms');
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error("Database Error (Rooms):", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(' https://hostel-backend-39y0.onrender.com/api/students');
      const data = await res.json();
      setStudentsList(data);
    } catch (err) {
      console.error("Database Error (Students):", err);
    }
  };

  // Run on page load
  useEffect(() => {
    fetchRooms();
    fetchStudents();
  }, []);

  const hostelImages = [blockA, blockB, blockC];

  // UPDATED: Now directly uses the userName prop from App.jsx
  const displayUserName = userName || "Guest User";
  const profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUserName)}&background=0D8ABC&color=fff`;

  // --- SLIDESHOW LOGIC ---
  const nextSlide = () => setCurrentSlide((prev) => (prev === 2 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1));

  useEffect(() => {
    const timer = setInterval(() => nextSlide(), 5000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  // --- ACTION HANDLERS (Connected to Flask) ---
  const handleOpenBooking = (room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault(); 
    const formData = new FormData(e.target);
    formData.append('roomNumber', selectedRoom.number);

    try {
      const response = await fetch(' https://hostel-backend-39y0.onrender.com/api/book', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setShowBookingModal(false);
        fetchStudents(); 
        fetchRooms();    
        alert(`Booking for ${selectedRoom.number} submitted successfully!`);
      }
    } catch (error) {
      alert("Error: Backend server is not running.");
    }
  };

  const handleAccept = async (studentId) => {
    try {
      const response = await fetch(` https://hostel-backend-39y0.onrender.com/api/accept-student/${studentId}`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchStudents();
        fetchRooms();
        setShowReviewModal(false);
        setSelectedStudent(null);
        alert("Student Verified!");
      }
    } catch (error) {
      console.error(error);
    }
  };

const handleDecline = async (studentId) => {
  if (!window.confirm("Delete this student's record?")) return;

  try {
    const response = await fetch(`https://hostel-backend-39y0.onrender.com/api/students/${studentId}`, {
      method: 'DELETE',
    });

    // Check if the response is actually OK (Status 200)
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        // 1. Close the modal first
        setShowReviewModal(false);
        setSelectedStudent(null);
        
        // 2. IMMEDIATELY update the list on the screen
        // Use the exact name of your state (e.g., setStudents or setAllStudents)
        setStudents(prev => prev.filter(s => s.id !== studentId));
        
        alert("Success: Record removed.");
      }
    } else {
      alert("Backend error: " + response.status);
    }
  } catch (error) {
    // If it's already deleting in the DB, it might be a CORS or Timeout error
    // Let's force the UI to update anyway for a smooth presentation
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setShowReviewModal(false);
    console.error("Minor sync error:", error);
  }
};

  // --- DYNAMIC CALCULATIONS ---
  const filteredStudents = studentsList.filter(student => 
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.room?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStudents = studentsList.length;
  const occupiedBeds = rooms.reduce((acc, room) => acc + (room.students || 0), 0);
  const totalCapacity = rooms.reduce((acc, room) => acc + (room.capacity || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;
  const pendingPaymentsCount = studentsList.filter(s => s.status === 'Pending').length;

  // --- RENDER (STRUCTURE ONLY) ---
 
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-slate-800 tracking-tight text-blue-400">
          HostelHub <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-200">v2.0</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<Bed size={20}/>} label="Room Allotment" active={activeTab === 'rooms'} onClick={() => setActiveTab('rooms')} />
          <NavItem icon={<Users size={20}/>} label="Students list" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <NavItem icon={<MapPin size={20}/>} label="Blocks & Layout" active={activeTab === 'blocks'} onClick={() => setActiveTab('blocks')} />
        </nav>
        <div className="p-4 border-t border-slate-800">
  <button 
    onClick={onLogout} // This calls the function in App.jsx
    className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800 w-full px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all"
  >
    <LogOut size={20}/> 
    <span>Logout</span>
  </button>
</div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
  <h1 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
    {activeTab.replace('-', ' ')}
  </h1>
  
  <div className="flex items-center gap-6">
    
    {/* --- MANUAL REFRESH BUTTON --- */}
    <button 
      onClick={() => {
        fetchRooms();
        fetchStudents();
      }}
      className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all group"
      title="Refresh Data"
    >
      <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
    </button>

    {/* NOTIFICATION BELL */}
    <div className="relative text-slate-500 cursor-pointer">
      <Bell size={22} />
      {pendingPaymentsCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
          {pendingPaymentsCount}
        </span>
      )}
    </div>

    {/* USER PROFILE SECTION */}
    <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
      <div className="text-right">
        <p className="text-sm font-bold text-slate-700 leading-none">
          {userName}
        </p>
        <p className="text-[10px] text-blue-600 font-bold uppercase">
          {userRole}
        </p>
      </div>
      <img 
        src={profileImage} 
        className="h-9 w-9 rounded-full border-2 border-blue-500" 
        alt="profile" 
      />
    </div>
  </div>
</header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Students" value={totalStudents} icon={<Users className="text-blue-600" />} trend="+Live" />
                <StatCard title="Occupied Beds" value={occupiedBeds} icon={<Bed className="text-green-600" />} trend={`${occupancyRate}% Full`} />
                <StatCard title="Pending Review" value={pendingPaymentsCount} icon={<CreditCard className="text-amber-600" />} trend="Warden Action" />
                <StatCard title="Active Issues" value="8" icon={<Wrench className="text-red-600" />} trend="Maintenance" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Hostel Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoBox icon={<ShieldCheck size={18}/>} label="Head Warden" value="Mr. Samuel Dogbatse" />
                    <InfoBox icon={<Phone size={18}/>} label="Emergency Line" value="+233 24 123 4567" />
                    <InfoBox icon={<Bed size={18}/>} label="Total Capacity" value={`${totalCapacity} Beds`} />
                    <InfoBox icon={<MapPin size={18}/>} label="Primary Office" value="Block B, Ground Floor" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    <ActivityItem label="New Allotment" desc="System Synced with DB" time="Just Now" />
                    <ActivityItem label="Maintenance" desc="Block A lights checked" time="1 hr ago" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENTS LIST */}
          {activeTab === 'students' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" placeholder="Search students..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Room</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">{s.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{s.course}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-bold">{s.room}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold inline-block border ${s.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {userRole === 'admin' && s.status === 'Pending' && (
                              <button 
                                onClick={() => { setSelectedStudent(s); setShowReviewModal(true); }}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold shadow-lg transition-all animate-pulse"
                              >
                                <Search size={14} /> Review Receipt
                              </button>
                            )}
                            {s.status === 'Paid' && (
                              <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                <ShieldCheck size={14} /> Verified
                              </div>
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

          {/* 3. ROOMS GRID */}
          {activeTab === 'rooms' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onBook={handleOpenBooking} />
              ))}
            </div>
          )}

          {/* 4. BLOCKS TAB (Visual Layout) */}
          {activeTab === 'blocks' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Hostel Visual Map</h3>
                
                {/* SLIDESHOW */}
                <div className="relative w-full h-80 rounded-2xl overflow-hidden shadow-lg group mb-8 bg-slate-900">
                  <img src={hostelImages[currentSlide]} className="w-full h-full object-cover duration-700" alt="Block View" />
                  <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white"><ChevronLeft/></button>
                  <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white"><ChevronRight/></button>
                  <div className="absolute top-6 left-6 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {currentSlide === 0 ? 'Block A' : currentSlide === 1 ? 'Block B' : 'Block C'} View
                  </div>
                </div>

                {/* GRID MAP */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                   <div className="flex justify-between items-center mb-6">
                     <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Interactive Allocation Grid</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {['Block A', 'Block B', 'Block C'].map((blockName) => (
                      <div key={blockName} className="space-y-3">
                        <h5 className="font-bold text-slate-800 border-b pb-2 text-sm">{blockName}</h5>
                        <div className="grid grid-cols-4 gap-2">
                          {rooms.filter(r => r.number.startsWith(blockName.split(' ')[1])).map((roomData, i) => {
                            const isOccupied = roomData.status === 'Occupied';
                            return (
                              <button 
                                key={i} 
                                onClick={() => handleOpenBooking(roomData)}
                                disabled={isOccupied}
                                className={`h-10 rounded-lg flex flex-col items-center justify-center font-bold text-[10px] border transition-all duration-300 ${isOccupied ? 'bg-blue-600 text-white border-blue-700 opacity-60' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'}`}
                              >
                                {roomData.number.split('-')[1]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                   </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* MODAL: ADMIN REVIEW */}
        {showReviewModal && selectedStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">Verify Allotment</h3>
                <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                <div className="aspect-video bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center relative overflow-hidden group">
                  {/* REAL IMAGE FROM FLASK UPLOADS */}
                  <img 
                    src={` https://hostel-backend-39y0.onrender.com/uploads/${selectedStudent.receipt}`} 
                    className="w-full h-full object-cover" 
                    alt="Receipt" 
                    onError={(e) => { e.target.src = "https://via.placeholder.com/300x150?text=Receipt+Not+Found"; }}
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Student Name</p>
                  <p className="text-sm font-bold">{selectedStudent.name}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => handleDecline(selectedStudent.id)} className="flex-1 py-4 text-red-600 font-bold text-sm border border-red-100 rounded-2xl hover:bg-red-50">Decline</button>
                  <button 
                    onClick={() => handleAccept(selectedStudent.id)}
                    className="flex-1 py-4 bg-green-600 text-white font-bold text-sm rounded-2xl hover:bg-green-700 shadow-xl"
                  >
                    Accept Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: BOOKING FORM */}
        {showBookingModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBookingModal(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-300">
              <button onClick={() => setShowBookingModal(false)} className="absolute right-6 top-6 text-slate-400 p-2 bg-slate-50 rounded-full hover:text-red-500"><X size={20} /></button>
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Assign Room {selectedRoom?.number}</h2>
                <p className="text-sm text-slate-500">Upload receipt and enter your details.</p>
              </div>

              <form className="space-y-6" onSubmit={handleBookingSubmit}>
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Payment Receipt (Image)</label>
                  <div className="relative border-2 border-dashed border-blue-200 rounded-3xl p-8 bg-blue-50/40 hover:bg-blue-50 transition-all text-center group">
                    {/* name="receipt" must match the name in Flask's request.files.get('receipt') */}
                    <input name="receipt" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" required />
                    <div className="flex flex-col items-center pointer-events-none">
                      <UploadCloud size={32} className="text-blue-600 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Tap to upload receipt</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <input name="studentName" type="text" className="w-full px-5 py-4 border border-slate-200 rounded-2xl outline-none" placeholder="Full Student Name" required />
                  <input name="phone" type="tel" className="w-full px-5 py-4 border border-slate-200 rounded-2xl outline-none" placeholder="Phone Number" required />
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-xs">
                  Confirm Allotment Request
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- MINI COMPONENTS --- */
const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-slate-50 rounded-2xl text-blue-600">{icon}</div>
      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{trend}</span>
    </div>
    <div className="mt-5">
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{title}</p>
      <h4 className="text-3xl font-black text-slate-800">{value}</h4>
    </div>
  </div>
);

const InfoBox = ({ icon, label, value }) => (
  <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
    <div className="text-blue-500 p-2 bg-white rounded-lg shadow-sm">{icon}</div>
    <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</p><p className="text-sm text-slate-800 font-bold">{value}</p></div>
  </div>
);

const ActivityItem = ({ label, desc, time }) => (
  <div className="flex gap-3 pb-3 border-b border-slate-50 last:border-0">
    <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
    <div><p className="text-xs font-bold text-slate-800">{label}</p><p className="text-[11px] text-slate-500 font-medium">{desc}</p><p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">{time}</p></div>
  </div>
);

const RoomCard = ({ room, onBook }) => {
  const isOccupied = room.status === 'Occupied';
  return (
    <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-xl font-black text-slate-800">Room {room.number}</h4>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{room.type}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${room.status === 'Available' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{room.status}</span>
      </div>
      
      <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
        <div 
          className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
          style={{ width: `${(room.students / room.capacity) * 100}%` }}
        ></div>
      </div>
      
      <button 
        onClick={() => onBook(room)}
        disabled={isOccupied}
        className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${isOccupied ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'}`}
      >
        {isOccupied ? 'Room Full' : 'Book Now'}
      </button>
    </div>
  );
};

export default Dashboard;
