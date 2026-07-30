import { AuthProvider, useAuth } from "./auth/AuthContext";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import "./App.css";

function AppShell() {
  const { booting, isAuthenticated } = useAuth();

  if (booting) {
    return (
      <div className="boot-screen">
        <img src="/logo.jpg" alt="Fleurish & Co." className="boot-logo" />
        <p>Opening the studio…</p>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
