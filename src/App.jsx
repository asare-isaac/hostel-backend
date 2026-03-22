import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginForm         from './components/LoginForm';
import SignUpForm        from './components/SignUpForm';
import Dashboard         from './components/Dashboard';
import VerifyEmailPage   from './components/VerifyEmailPage';
import ResetPasswordForm from './components/ResetPasswordForm';

function App() {
  // --- 1. THE "MEMORY" CHECK ---
  const savedName = localStorage.getItem('userName');
  const savedRole = localStorage.getItem('userRole');

  // --- 2. INITIALIZE STATES ---
  const [userName, setUserName] = useState(savedName || 'Guest User');
  const [userRole, setUserRole] = useState(savedRole || 'student');

  // --- 3. THE LOGOUT LOGIC ---
  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('profilePic');
    setUserName('Guest User');
    setUserRole('student');
  };

  return (
    <Routes>

      {/* LOGIN */}
      <Route
        path="/"
        element={
          <LoginForm
            setUserRole={setUserRole}
            setUserName={setUserName}
          />
        }
      />

      {/* SIGNUP */}
      <Route path="/signup" element={<SignUpForm />} />

      {/* EMAIL VERIFICATION — link from verification email points here */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* PASSWORD RESET — link from reset email points here */}
      <Route path="/reset-password" element={<ResetPasswordForm />} />

      {/* DASHBOARD — protected, redirects to login if not logged in */}
      <Route
        path="/dashboard"
        element={
          userName !== 'Guest User' ? (
            <Dashboard
              userRole={userRole}
              userName={userName}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/" />
          )
        }
      />

      {/* Catch-all — redirect broken links to login */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
  );
}

export default App;
