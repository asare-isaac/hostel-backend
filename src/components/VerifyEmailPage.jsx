import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | expired | invalid
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    const verify = async () => {
      try {
        const res  = await fetch('https://hostel-backend-39y0.onrender.com/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage(data.message);
          // Auto-redirect to login after 3 seconds
          setTimeout(() => navigate('/'), 3000);
        } else if (data.message?.includes('expired')) {
          setStatus('expired');
          setMessage(data.message);
        } else {
          setStatus('invalid');
          setMessage(data.message);
        }
      } catch {
        setStatus('invalid');
        setMessage('Connection error. Please try again.');
      }
    };

    verify();
  }, [token]);

  const screens = {
    loading: {
      icon: <Loader2 size={32} className="text-blue-600 animate-spin"/>,
      bg:   'bg-blue-100',
      title: 'Verifying your email...',
      desc:  'Please wait while we confirm your email address.',
      button: null,
    },
    success: {
      icon:  <CheckCircle size={32} className="text-green-600"/>,
      bg:    'bg-green-100',
      title: 'Email Verified!',
      desc:  'Your account is now active. Redirecting you to login...',
      button: { label: 'Go to Login Now', action: () => navigate('/'), style: 'bg-green-600 hover:bg-green-700' },
    },
    expired: {
      icon:  <AlertCircle size={32} className="text-amber-600"/>,
      bg:    'bg-amber-100',
      title: 'Link Expired',
      desc:  'Your verification link has expired. Please sign up again or request a new verification email.',
      button: { label: 'Back to Signup', action: () => navigate('/signup'), style: 'bg-amber-600 hover:bg-amber-700' },
    },
    invalid: {
      icon:  <AlertCircle size={32} className="text-red-500"/>,
      bg:    'bg-red-100',
      title: 'Invalid Link',
      desc:  message || 'This verification link is invalid or has already been used.',
      button: { label: 'Back to Login', action: () => navigate('/'), style: 'bg-red-600 hover:bg-red-700' },
    },
  };

  const screen = screens[status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-5 border border-slate-200">

        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '' }}
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${screen.bg}`}>
          {screen.icon}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-800">{screen.title}</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">{screen.desc}</p>
        </div>

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 size={12} className="animate-spin"/>
            Redirecting in 3 seconds...
          </div>
        )}

        {screen.button && (
          <button onClick={screen.button.action}
            className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all shadow-lg ${screen.button.style}`}>
            {screen.button.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
