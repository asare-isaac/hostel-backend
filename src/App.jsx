import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import Dashboard from './components/Dashboard';

function App() {
  // --- 1. THE "MEMORY" CHECK ---
  // When the page loads/refreshes, look for saved data in the browser
  const savedName = localStorage.getItem('userName');
  const savedRole = localStorage.getItem('userRole');

  // --- 2. INITIALIZE STATES ---
  // If memory exists, use it. If not, default to Guest/Student.
  const [userName, setUserName] = useState(savedName || 'Guest User');
  const [userRole, setUserRole] = useState(savedRole || 'student');

  // --- 3. THE LOGOUT LOGIC ---
  // This clears the "memory" so the next user isn't logged into your account
  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setUserName('Guest User');
    setUserRole('student');
  };

  return (
    <Routes>
      {/* PASS BOTH SETTERS TO LOGIN FORM 
          So the LoginForm can update these values after checking the Flask DB
      */}
      <Route 
        path="/" 
        element={
          <LoginForm 
            setUserRole={setUserRole} 
            setUserName={setUserName} 
          />
        } 
      />
      
      <Route path="/signup" element={<SignUpForm />} />
      
      {/* PASS THE DATA TO THE DASHBOARD
          This ensures the name in the corner and the Admin buttons "tally"
      */}
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

      {/* Catch-all: Redirect any broken links back to Login */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;