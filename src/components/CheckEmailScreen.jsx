export default function CheckEmailScreen({ email, onBackToSignIn }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-icon" aria-hidden="true">✉</div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We've sent a confirmation link to <strong>{email}</strong>. Click
          the link in that email, then come back here and sign in.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBackToSignIn}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}
