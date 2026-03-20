import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const SignUpForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. UPDATED URL: Now pointing to your live Render API
      const response = await fetch('https://hostel-backend-39y0.onrender.com/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: formData.fullName, 
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Account created successfully! You can now log in.");
        // 2. Redirect back to the Login page
        navigate('/');
      } else {
        alert(data.message || "Signup failed. Email might already exist.");
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("Could not connect to the server. Please wait a moment for the server to wake up and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800">Create Account</h2>
          <p className="text-slate-500 mt-2">Join us today! It only takes a minute.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                name="fullName"
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                name="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="name@university.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transform transition-all active:scale-95 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpForm;
