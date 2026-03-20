{/* --- ADMIN REVIEW MODAL --- */}
{showReviewModal && selectedStudent && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}></div>
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">Review Payment</h3>
        <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold">Student Name</p>
          <p className="font-medium">{selectedStudent.name}</p>
        </div>

        <div className="aspect-video bg-slate-200 rounded-xl overflow-hidden border-2 border-slate-100">
          {/* In the backend phase, we will show the real receipt image here */}
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
            <CreditCard size={32} className="mb-2 opacity-30" />
            <p>Receipt Image Preview<br/>(GHS 50% Deposit)</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={() => setShowReviewModal(false)}
            className="flex-1 py-2 text-slate-600 font-bold text-sm border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              // This is where the Warden clicks "Yes"
              handleAccept(selectedStudent.id);
            }}
            className="flex-1 py-2 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 shadow-lg shadow-green-100"
          >
            Accept & Verify
          </button>
        </div>
      </div>
    </div>
  </div>
)}