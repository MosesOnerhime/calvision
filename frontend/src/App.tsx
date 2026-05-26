import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function AppLayout() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-8 pb-12 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4">
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
