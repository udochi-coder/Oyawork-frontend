import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Spinner } from "./components/ui";
import { AuthProvider, useAuth } from "./lib/auth";
import { ChatPage, Conduct, MessagesPage, NewChat, NotificationsPage, PaymentCallback, ProfilePage, SwitchMode, WalletPage } from "./pages/Account";
import { BookingPage, ReviewPage } from "./pages/Booking";
import { DisputeStatus, ReportIssue } from "./pages/Disputes";
import { Home } from "./pages/Home";
import { FirstOffer, Interested, JobDetail, JobsTab, Matching, PostJob, RequestPage } from "./pages/Jobs";
import { Agreement, ExperienceSetup, ForgotPassword, GettingStarted, Login, Register, SkillsSetup, Splash, VerifyAddress, VerifyIdentity } from "./pages/Onboarding";
import { EmployerProfilePage, FindWorkers, WorkerProfilePage } from "./pages/Workers";

function Private({ children, role }: { children: ReactNode; role?: "worker" | "employer" }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && me.role !== role) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <Spinner />;
  return me ? <Navigate to="/home" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Phone-width app frame, centred on larger screens */}
        <div className="mx-auto h-[100dvh] max-w-[440px] overflow-hidden bg-white shadow-xl sm:my-0">
          <Routes>
            <Route path="/" element={<PublicOnly><Splash /></PublicOnly>} />
            <Route path="/start" element={<PublicOnly><GettingStarted /></PublicOnly>} />
            <Route path="/register/:role" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/conduct" element={<Conduct />} />

            <Route path="/verify/identity" element={<Private><VerifyIdentity /></Private>} />
            <Route path="/verify/address" element={<Private><VerifyAddress /></Private>} />
            <Route path="/onboarding/skills" element={<Private role="worker"><SkillsSetup /></Private>} />
            <Route path="/onboarding/experience" element={<Private role="worker"><ExperienceSetup /></Private>} />
            <Route path="/onboarding/agreement" element={<Private><Agreement /></Private>} />

            <Route path="/home" element={<Private><Home /></Private>} />
            <Route path="/jobs" element={<Private><JobsTab /></Private>} />
            <Route path="/jobs/new" element={<Private role="employer"><PostJob /></Private>} />
            <Route path="/jobs/:id" element={<Private><JobDetail /></Private>} />
            <Route path="/jobs/:id/matching" element={<Private role="employer"><Matching /></Private>} />
            <Route path="/jobs/:id/interested" element={<Private role="employer"><Interested /></Private>} />
            <Route path="/jobs/:id/offer" element={<Private role="worker"><FirstOffer /></Private>} />
            <Route path="/requests/:id" element={<Private><RequestPage /></Private>} />
            <Route path="/workers/find" element={<Private role="employer"><FindWorkers /></Private>} />
            <Route path="/workers/:id" element={<Private><WorkerProfilePage /></Private>} />
            <Route path="/employers/:id" element={<Private><EmployerProfilePage /></Private>} />
            <Route path="/bookings/:id" element={<Private><BookingPage /></Private>} />
            <Route path="/bookings/:id/review" element={<Private><ReviewPage /></Private>} />
            <Route path="/bookings/:id/report" element={<Private><ReportIssue /></Private>} />
            <Route path="/disputes/:id" element={<Private><DisputeStatus /></Private>} />
            <Route path="/wallet" element={<Private><WalletPage /></Private>} />
            <Route path="/notifications" element={<Private><NotificationsPage /></Private>} />
            <Route path="/messages" element={<Private><MessagesPage /></Private>} />
            <Route path="/messages/new" element={<Private><NewChat /></Private>} />
            <Route path="/messages/:id" element={<Private><ChatPage /></Private>} />
            <Route path="/profile" element={<Private><ProfilePage /></Private>} />
            <Route path="/switch-mode" element={<Private><SwitchMode /></Private>} />
            <Route path="/payments/callback" element={<Private><PaymentCallback /></Private>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
