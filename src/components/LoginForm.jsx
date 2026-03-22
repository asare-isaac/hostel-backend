import { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = '798719233864-4qak09a08b2js5n4e80h6ktus6am0fd1.apps.googleusercontent.com';

// ─── GOOGLE BUTTON ────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─── WAKE-UP BANNER ───────────────────────────────────────────────────────────
const WakeUpBanner = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
      <Loader2 size={16} className="animate-spin shrink-0 mt-0.5 text-amber-500"/>
      <div>
        <p className="font-bold">Server is waking up...</p>
        <p className="text-xs text-amber-600 mt-0.5">This takes 30–60 seconds on first use. Please wait.</p>
      </div>
    </div>
  );
};

// ─── FIELD ERROR ─────────────────────────────────────────────────────────────
const FieldError = ({ message }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-medium">
      <AlertCircle size={12}/> {message}
    </p>
  );
};

// ─── FORGOT PASSWORD MODAL ────────────────────────────────────────────────────
const ForgotPasswordModal = ({ onClose }) => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else setError(data.message || 'Something went wrong.');
    } catch { setError('Could not connect to server.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all"><X size={18}/></button>
        {sent ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={28} className="text-green-600"/></div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Check your email</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">We sent a reset link to <strong>{email}</strong>. It expires in 30 minutes.</p>
            </div>
            <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all">Done</button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-800">Reset your password</h3>
              <p className="text-sm text-slate-500 mt-1">Enter your email and we'll send you a reset link.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={16} className="text-slate-400"/></div>
                  <input type="email" required className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}/>
                </div>
                {error && <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-medium"><AlertCircle size={12}/> {error}</p>}
              </div>
              <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${loading ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}>
                {loading ? <><Loader2 size={16} className="animate-spin"/> Sending...</> : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// ─── NOT VERIFIED BANNER ──────────────────────────────────────────────────────
const NotVerifiedBanner = ({ email, onClose }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent]       = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/resend-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) { setResent(true); setTimeout(() => setResent(false), 5000); }
    } catch { }
    finally { setResending(false); }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 relative">
      <button onClick={onClose} className="absolute top-3 right-3 text-amber-400 hover:text-amber-600"><X size={14}/></button>
      <div className="flex items-start gap-3">
        <Mail size={18} className="text-amber-500 shrink-0 mt-0.5"/>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-700">Email not verified</p>
          <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">Check your inbox for the verification link sent to <strong>{email}</strong>.</p>
          {resent ? (
            <p className="flex items-center gap-1 text-xs text-green-600 font-bold mt-2"><CheckCircle size={12}/> Verification email resent!</p>
          ) : (
            <button onClick={handleResend} disabled={resending} className="flex items-center gap-1.5 text-xs text-amber-700 font-bold mt-2 hover:text-amber-900 disabled:opacity-50">
              {resending ? <><Loader2 size={11} className="animate-spin"/> Resending...</> : <><RefreshCw size={11}/> Resend verification email</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN LOGIN FORM ──────────────────────────────────────────────────────────
const LoginForm = ({ setUserRole, setUserName }) => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword]         = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [googleLoading, setGoogleLoading]       = useState(false);
  const [showForgot, setShowForgot]             = useState(false);
  const [serverWaking, setServerWaking]         = useState(false);
  const [rememberMe, setRememberMe]             = useState(false);
  const [notVerifiedEmail, setNotVerifiedEmail] = useState('');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({ email: '', password: '', general: '' });

  useEffect(() => {
    const saved = localStorage.getItem('rememberedEmail');
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  // ── Load Google Identity Services script ──
  useEffect(() => {
    const script = document.createElement('script');
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // ── Handle Google credential response ──
  const handleGoogleResponse = useCallback(async (response) => {
    setGoogleLoading(true);
    setErrors({ email: '', password: '', general: '' });
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('userName', data.user_name);
        localStorage.setItem('userRole', data.role);
        if (data.profile_pic) localStorage.setItem('profilePic', data.profile_pic);
        setUserRole(data.role);
        setUserName(data.user_name);
        navigate('/dashboard');
      } else {
        setErrors(p => ({ ...p, general: data.message || 'Google sign-in failed.' }));
      }
    } catch {
      setErrors(p => ({ ...p, general: 'Connection error. Please try again.' }));
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, setUserRole, setUserName]);

  // ── Initialise Google One Tap ──
  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback:  handleGoogleResponse,
        });
      }
    };
    const timer = setTimeout(initGoogle, 1000);
    return () => clearTimeout(timer);
  }, [handleGoogleResponse]);

  // ── Trigger Google popup ──
  const handleGoogleClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      setErrors(p => ({ ...p, general: 'Google Sign-In is loading. Please try again in a moment.' }));
    }
  };

  const validate = () => {
    const e = { email: '', password: '', general: '' };
    let valid = true;
    if (!email.trim()) { e.email = 'Email address is required.'; valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { e.email = 'Please enter a valid email address.'; valid = false; }
    if (!password) { e.password = 'Password is required.'; valid = false; }
    setErrors(e);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setServerWaking(false);
    setNotVerifiedEmail('');
    setErrors({ email: '', password: '', general: '' });

    const wakeTimer = setTimeout(() => setServerWaking(true), 5000);

    try {
      const response = await fetch('https://hostel-backend-39y0.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await response.json();

      if (data.success) {
        if (rememberMe) localStorage.setItem('rememberedEmail', email.trim().toLowerCase());
        else localStorage.removeItem('rememberedEmail');
        localStorage.setItem('userName', data.user_name);
        localStorage.setItem('userRole', data.role);
        if (data.profile_pic) localStorage.setItem('profilePic', data.profile_pic);
        setUserRole(data.role);
        setUserName(data.user_name);
        navigate('/dashboard');
      } else if (data.not_verified) {
        setNotVerifiedEmail(data.email || email.trim().toLowerCase());
      } else {
        setErrors(prev => ({ ...prev, general: data.message || 'Invalid email or password.' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, general: 'Could not connect to server. Please try again.' }));
    } finally {
      clearTimeout(wakeTimer);
      setIsLoading(false);
      setServerWaking(false);
    }
  };

  return (
    <>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)}/>}

      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">

          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-black text-lg">H</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-slate-500 mt-1 text-sm">Log in to your hostel portal</p>
          </div>

          {/* ── GOOGLE SIGN-IN BUTTON ── */}
          <button onClick={handleGoogleClick} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            {googleLoading ? (
              <><Loader2 size={18} className="animate-spin text-blue-500"/> Signing in with Google...</>
            ) : (
              <><GoogleIcon/> Continue with Google</>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200"/>
            <p className="text-xs text-slate-400 font-medium">or sign in with email</p>
            <div className="flex-1 h-px bg-slate-200"/>
          </div>

          <WakeUpBanner visible={serverWaking}/>

          {notVerifiedEmail && (
            <NotVerifiedBanner email={notVerifiedEmail} onClose={() => setNotVerifiedEmail('')}/>
          )}

          {errors.general && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} className="shrink-0"/>
              <p className="font-medium">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className={errors.email ? 'text-red-400' : 'text-slate-400'}/>
                </div>
                <input type="email" required
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${errors.email ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="Enter your email" value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: '', general: ''})); setNotVerifiedEmail(''); }}/>
              </div>
              <FieldError message={errors.email}/>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className={errors.password ? 'text-red-400' : 'text-slate-400'}/>
                </div>
                <input type={showPassword ? 'text' : 'password'} required
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm outline-none transition-all ${errors.password ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="••••••••" value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: '', general: ''})); }}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              <FieldError message={errors.password}/>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}/>
                <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                  {rememberMe && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
              <span className="text-sm text-slate-600 group-hover:text-slate-800 select-none">Remember me</span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${isLoading ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'}`}>
              {isLoading ? <><Loader2 size={18} className="animate-spin"/> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
