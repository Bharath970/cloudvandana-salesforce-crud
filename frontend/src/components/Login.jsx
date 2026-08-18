import { api } from "../api";

export default function Login({ loginError }) {
  const handleLogin = () => {
    window.location.href = `${api.base}/auth/login`;
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark">SF</div>
        <h1>Object Manager</h1>
        <p className="login-sub">
          Connect your Salesforce Developer Org to view, create, edit, and delete
          records without touching the native UI.
        </p>
        {loginError && (
          <p className="login-error">
            Something went wrong signing in. Please try again.
          </p>
        )}
        <button className="btn-primary btn-login" onClick={handleLogin}>
          Log in with Salesforce
        </button>
        <p className="login-footnote">
          Authenticates via OAuth 2.0 through your org's External Client App.
        </p>
      </div>
    </div>
  );
}
