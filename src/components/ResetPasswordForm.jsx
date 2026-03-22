import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────
const getStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-500'   };
  if (score === 2) return { score, label: 'Fair',   color: 'bg-amber-500' };
  if (score === 3) return { score, label: 'Good',   color: 'bg-blue-500'  };
  return              { score, label: 'Strong', color: 'bg-green-500' };
};

const PasswordStrength = ({ password }) => {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-slate-200'}`}/>
        ))}
      </div>
      <p className={`text-xs font-bold ${
        score <= 1 ? 'text-red-500' : score === 2 ? 'text-amber-500' : score === 3 ? 'text-blue-500' : 'text-green-500'
      }`}>{label} password</p>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ResetPasswordForm = () => {
  const navigate                                  = useNavigate();
  const [searchParams]                            = useSearchParams();
  const token                                     = searchParams.get('token');

  const [password, setPassword]                   = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirm, setShowConfirm]             = useState(false);
  const [isLoading, setIsLoading]                 = useState(false);
  const [success, setSuccess]                     = useState(false);
  const [errors, setErrors]                       = useState({ password: '', confirm: '', general: '' });

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 border border-slate-200">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-red-500"/>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Invalid Reset Link</h2>
          <p className="text-sm text-slate-500">This link is invalid or has already been used. Please request a new password reset.</p>
          <button onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = { password: '', confirm: '', general: '' };
    let valid = true;
    if (!password) { e.password = 'Password is required.'; valid = false; }
    else if (password.length < 6) { e.password = 'Password must be at least 6 characters.'; valid = false; }
    if (!confirmPassword) { e.confirm = 'Please confirm your password.'; valid = false; }
    else if (password !== confirmPassword) { e.confirm = 'Passwords do not match.'; valid = false; }
    setErrors(e);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrors({ password: '', confirm: '', general: '' });

    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setErrors(p => ({ ...p, general: data.message || 'Reset failed. The link may have expired.' }));
      }
    } catch {
      setErrors(p => ({ ...p, general: 'Connection error. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-5 border border-slate-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-600"/>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Password Reset!</h2>
            <p className="text-slate-500 text-sm mt-2">Your password has been updated successfully. You can now log in with your new password.</p>
          </div>
          <button onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-lg">H</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Set New Password</h2>
          <p className="text-slate-500 mt-1 text-sm">Choose a strong password for your account</p>
        </div>

        {errors.general && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0"/>
            <p className="font-medium">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className={errors.password ? 'text-red-400' : 'text-slate-400'}/>
              </div>
              <input type={showPassword ? 'text' : 'password'} required
                className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm outline-none transition-all ${
                  errors.password ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
                placeholder="Create a strong password"
                value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ''})); }}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {errors.password && <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-medium"><AlertCircle size={12}/> {errors.password}</p>}
            <PasswordStrength password={password}/>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className={errors.confirm ? 'text-red-400' : 'text-slate-400'}/>
              </div>
              <input type={showConfirm ? 'text' : 'password'} required
                className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm outline-none transition-all ${
                  errors.confirm ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50'
                  : confirmPassword && password === confirmPassword ? 'border-green-300 focus:ring-2 focus:ring-green-200 bg-green-50'
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
                placeholder="Re-enter your new password"
                value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({...p, confirm: ''})); }}/>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
                {confirmPassword && password === confirmPassword && <CheckCircle size={16} className="text-green-500"/>}
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="text-slate-400 hover:text-blue-600 transition-colors">
                  {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            {errors.confirm && <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-medium"><AlertCircle size={12}/> {errors.confirm}</p>}
          </div>

          <button type="submit" disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              isLoading ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
            }`}>
            {isLoading ? <><Loader2 size={18} className="animate-spin"/> Resetting...</> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
