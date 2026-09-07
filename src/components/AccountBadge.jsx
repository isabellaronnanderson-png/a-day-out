export default function AccountBadge({ email, onSignOut }) {
  const initial = (email || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="account-badge">
      <span className="account-avatar" title={email}>{initial}</span>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
