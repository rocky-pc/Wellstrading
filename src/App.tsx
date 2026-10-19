import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { TradingProvider } from '@/context/TradingContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import MarketsPage from '@/pages/MarketsPage';
import TradingTerminalPage from '@/pages/TradingTerminalPage';
import PositionsPage from '@/pages/PositionsPage';
import HistoryPage from '@/pages/HistoryPage';
import WatchlistPage from '@/pages/WatchlistPage';
import SettingsPage from '@/pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TradingProvider>
          <div className="flex flex-col min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
            <Navbar />
            <main className="flex-1 flex flex-col">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/trade" element={<Navigate to="/trade/EUR-USD" replace />} />
                <Route path="/trade/:symbol" element={<TradingTerminalPage />} />

                {/* Protected Authenticated Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/positions"
                  element={
                    <ProtectedRoute>
                      <PositionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <HistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/watchlist"
                  element={
                    <ProtectedRoute>
                      <WatchlistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </TradingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
