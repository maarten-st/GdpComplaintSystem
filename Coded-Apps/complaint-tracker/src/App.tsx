import { AuthProvider, useAuth } from './hooks/useAuth';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';
import { ComplaintTracker } from './ComplaintTracker';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID,
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME,
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME,
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL,
  redirectUri: window.location.origin + window.location.pathname,
  scope: import.meta.env.VITE_UIPATH_SCOPE,
};

function AppContent() {
  const { isAuthenticated, isLoading, error, login } = useAuth();

  if (isLoading) {
    return (
      <div className="center-screen">
        <div className="signin-card">
          <div className="spinner" />
          <p style={{ marginTop: 16, color: 'var(--muted)' }}>Connecting to UiPath…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="center-screen">
        <div className="signin-card">
          <div className="logo">Robo<span className="accent">Rana</span></div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '14px 0 6px', color: 'var(--focus-blue)' }}>
            GDP Complaint Tracker
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: 22 }}>
            Sign in with your UiPath account to manage pharmaceutical product complaints.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={login}>
            Sign in with UiPath
          </button>
          {error && <div className="banner-error">{error}</div>}
        </div>
      </div>
    );
  }

  return <ComplaintTracker />;
}

function App() {
  return (
    <AuthProvider config={authConfig}>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
