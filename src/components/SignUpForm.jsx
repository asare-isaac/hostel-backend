import { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = '798719233864-4qak09a08b2js5n4e80h6ktus6am0fd1.apps.googleusercontent.com';

// ─── GOOGLE ICON ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─── DECODE GOOGLE JWT ────────────────────────────────────────────────────────
const decodeGoogleToken = (token) => {
  try {
    const base64Url   = token.split('.')[1];
    const base64      = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// ─── FIELD ERROR ──────────────────────────────────────────────────────────────
const FieldError = ({ message }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-medium">
      <AlertCircle size={12}/> {message}
    </p>
  );
};

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
      <p className={`text-xs font-bold ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-amber-500' : score === 3 ? 'text-blue-500' : 'text-green-500'}`}>
        {label} password
        {score < 4 && <span className="text-slate-400 font-normal"> — try adding numbers, symbols or uppercase</span>}
      </p>
    </div>
  );
};

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

// ─── CHECK EMAIL SCREEN ───────────────────────────────────────────────────────
const CheckEmailScreen = ({ email, onResend, resending, resendSuccess }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-5 border border-slate-200">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Mail size={30} className="text-blue-600"/>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Check your email</h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          We sent a verification link to<br/><strong className="text-slate-700">{email}</strong>
        </p>
      </div>
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-3">
        {[
          { step: '1', text: 'Open your email inbox' },
          { step: '2', text: 'Find the email from HostelHub' },
          { step: '3', text: 'Click "Verify My Email"' },
          { step: '4', text: 'Come back here and log in' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">{step}</span>
            <p className="text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Didn't receive it? Check your spam folder or</p>
      {resendSuccess ? (
        <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-bold">
          <CheckCircle size={16}/> Verification email resent!
        </div>
      ) : (
        <button onClick={onResend} disabled={resending}
          className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-bold mx-auto disabled:opacity-50">
          {resending ? <><Loader2 size={14} className="animate-spin"/> Resending...</> : <><RefreshCw size={14}/> Resend verification email</>}
        </button>
      )}
      <Link to="/" className="block w-full border-2 border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 font-bold py-3 rounded-xl transition-all text-sm text-center">
        Back to Login
      </Link>
    </div>
  </div>
);

// ─── MAIN SIGNUP FORM ─────────────────────────────────────────────────────────
const SignUpForm = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading]                     = useState(false);
  const [googleLoading, setGoogleLoading]             = useState(false);
  const [serverWaking, setServerWaking]               = useState(false);
  const [showVerifyScreen, setShowVerifyScreen]       = useState(false);
  const [registeredEmail, setRegisteredEmail]         = useState('');
  const [resending, setResending]                     = useState(false);
  const [resendSuccess, setResendSuccess]             = useState(false);

  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors]     = useState({ fullName: '', email: '', password: '', confirmPassword: '', general: '' });

  // Load Google script
  useEffect(() => {
    const script   = document.createElement('script');
    script.src     = 'https://accounts.google.com/gsi/client';
    script.async   = true;
    script.defer   = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  // Handle Google response — decode on frontend
  const handleGoogleResponse = useCallback(async (response) => {
    setGoogleLoading(true);
    try {
      const decoded = decodeGoogleToken(response.credential);
      if (!decoded) throw new Error('Failed to decode Google token');

      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       decoded.email,
          fullname:    decoded.name,
          google_id:   decoded.sub,
          profile_pic: decoded.picture
        })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('userName', data.user_name);
        localStorage.setItem('userRole', data.role);
        if (data.profile_pic) localStorage.setItem('profilePic', data.profile_pic);
        navigate('/dashboard');
      } else {
        setErrors(p => ({ ...p, general: data.message || 'Google sign-up failed.' }));
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setErrors(p => ({ ...p, general: 'Google sign-up failed. Please try again.' }));
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const init = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback:  handleGoogleResponse,
        });
      }
    };
    const t = setTimeout(init, 1500);
    return () => clearTimeout(t);
  }, [handleGoogleResponse]);

  const handleGoogleClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          window.google.accounts.id.renderButton(
            document.getElementById('google-btn-fallback-signup'),
            { theme: 'outline', size: 'large', width: 400 }
          );
        }
      });
    } else {
      setErrors(p => ({ ...p, general: 'Google Sign-In is loading. Please try again.' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '', general: '' }));
  };

  const validate = () => {
    const e = { fullName: '', email: '', password: '', confirmPassword: '', general: '' };
    let valid = true;
    if (!formData.fullName.trim()) { e.fullName = 'Full name is required.'; valid = false; }
    else if (formData.fullName.trim().length < 3) { e.fullName = 'Name must be at least 3 characters.'; valid = false; }
    if (!formData.email.trim()) { e.email = 'Email address is required.'; valid = false; }
    else if (!/\S+@\S+\.\S+/.test(formData.email)) { e.email = 'Please enter a valid email address.'; valid = false; }
    if (!formData.password) { e.password = 'Password is required.'; valid = false; }
    else if (formData.password.length < 6) { e.password = 'Password must be at least 6 characters.'; valid = false; }
    if (!formData.confirmPassword) { e.confirmPassword = 'Please confirm your password.'; valid = false; }
    else if (formData.password !== formData.confirmPassword) { e.confirmPassword = 'Passwords do not match.'; valid = false; }
    setErrors(e);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setServerWaking(false);
    const wakeTimer = setTimeout(() => setServerWaking(true), 5000);
    try {
      const response = await fetch('https://hostel-backend-39y0.onrender.com/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: formData.fullName.trim(),
          email:    formData.email.trim().toLowerCase(),
          password: formData.password
        })
      });
      const data = await response.json();
      if (data.success) {
        setRegisteredEmail(formData.email.trim().toLowerCase());
        setShowVerifyScreen(true);
      } else {
        setErrors(p => ({ ...p, general: data.message || 'Signup failed. Please try again.' }));
      }
    } catch {
      setErrors(p => ({ ...p, general: 'Could not connect to server. Please try again.' }));
    } finally {
      clearTimeout(wakeTimer);
      setIsLoading(false);
      setServerWaking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/resend-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail })
      });
      const data = await res.json();
      if (data.success) { setResendSuccess(true); setTimeout(() => setResendSuccess(false), 4000); }
    } catch { }
    finally { setResending(false); }
  };

  if (showVerifyScreen) {
    return <CheckEmailScreen email={registeredEmail} onResend={handleResend} resending={resending} resendSuccess={resendSuccess}/>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-lg">H</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Create Account</h2>
          <p className="text-slate-500 mt-1 text-sm">Join HostelHub — it only takes a minute</p>
        </div>

        {/* Google Sign-Up */}
        <button onClick={handleGoogleClick} disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
          {googleLoading
            ? <><Loader2 size={18} className="animate-spin text-blue-500"/> Signing up with Google...</>
            : <><GoogleIcon/> Continue with Google</>
          }
        </button>
        <div id="google-btn-fallback-signup" className="flex justify-center"/>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200"/>
          <p className="text-xs text-slate-400 font-medium">or sign up with email</p>
          <div className="flex-1 h-px bg-slate-200"/>
        </div>

        <WakeUpBanner visible={serverWaking}/>

        {errors.general && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0"/>
            <p className="font-medium">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className={errors.fullName ? 'text-red-400' : 'text-slate-400'}/></div>
              <input type="text" name="fullName" required
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${errors.fullName ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                placeholder="e.g. Kwame Mensah" value={formData.fullName} onChange={handleChange}/>
            </div>
            <FieldError message={errors.fullName}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={18} className={errors.email ? 'text-red-400' : 'text-slate-400'}/></div>
              <input type="email" name="email" required
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${errors.email ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                placeholder="name@gmail.com" value={formData.email} onChange={handleChange}/>
            </div>
            <FieldError message={errors.email}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className={errors.password ? 'text-red-400' : 'text-slate-400'}/></div>
              <input type={showPassword ? 'text' : 'password'} name="password" required
                className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm outline-none transition-all ${errors.password ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                placeholder="Create a strong password" value={formData.password} onChange={handleChange}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            <FieldError message={errors.password}/>
            <PasswordStrength password={formData.password}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className={errors.confirmPassword ? 'text-red-400' : 'text-slate-400'}/></div>
              <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" required
                className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm outline-none transition-all ${
                  errors.confirmPassword ? 'border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50'
                  : formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-300 focus:ring-2 focus:ring-green-200 bg-green-50'
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
                placeholder="Re-enter your password" value={formData.confirmPassword} onChange={handleChange}/>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
                {formData.confirmPassword && formData.password === formData.confirmPassword && <CheckCircle size={16} className="text-green-500"/>}
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-slate-400 hover:text-blue-600 transition-colors">
                  {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            <FieldError message={errors.confirmPassword}/>
          </div>

          <button type="submit" disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg mt-2 ${isLoading ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'}`}>
            {isLoading ? <><Loader2 size={18} className="animate-spin"/> Creating account...</> : <>Get Started <ArrowRight size={16}/></>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/" className="text-blue-600 font-medium hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpForm;
