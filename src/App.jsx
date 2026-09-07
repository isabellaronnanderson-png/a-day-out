import { useEffect, useState } from 'react';
import SavedPlacesTab from './pages/SavedPlacesTab';
import PlanTab from './pages/PlanTab';
import HeaderFieldRow from './components/HeaderFieldRow';
import AuthScreen from './components/AuthScreen';
import CheckEmailScreen from './components/CheckEmailScreen';
import BackupMenu from './components/BackupMenu';
import AccountBadge from './components/AccountBadge';
import { supabase } from './lib/supabaseClient';
import { getPlaces, addPlace, updatePlace, deletePlace, replaceAllPlaces, getCities } from './lib/storage';
import { deleteAllPhotosForPlace } from './lib/photoStore';
import { syncOnLogin, upsertCloudPlace, deleteCloudPlace } from './lib/cloudSync';

export default function App() {
  const [tab, setTab] = useState('saved');
  const [places, setPlaces] = useState([]);

  // Auth state. authStatus: 'loading' | 'signed-out' | 'check-email' | 'signed-in'
  const [authStatus, setAuthStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthStatus(data.session ? 'signed-in' : 'signed-out');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthStatus(newSession ? 'signed-in' : 'signed-out');
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Once signed in, reconcile the local cache with the cloud (pushing up
  // anything that only exists locally) and load the merged result.
  useEffect(() => {
    if (authStatus !== 'signed-in' || !session?.user) return;
    let cancelled = false;

    setSyncing(true);
    const local = getPlaces();
    syncOnLogin(session.user.id, local)
      .then((merged) => {
        if (cancelled) return;
        replaceAllPlaces(merged);
        setPlaces(getPlaces());
      })
      .catch((err) => {
        console.error('Cloud sync failed, continuing with local data only', err);
        setPlaces(getPlaces());
      })
      .finally(() => !cancelled && setSyncing(false));

    return () => { cancelled = true; };
  }, [authStatus, session?.user?.id]);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  function syncToCloud(place) {
    if (!userId) return;
    upsertCloudPlace(userId, place).catch((err) => console.error('Could not sync to cloud', err));
  }

  function handleAdd(place) {
    const saved = addPlace(place);
    setPlaces(getPlaces());
    syncToCloud(saved);
    return saved;
  }

  function handleUpdate(id, patch) {
    const saved = updatePlace(id, patch);
    setPlaces(getPlaces());
    if (saved) syncToCloud(saved);
    return saved;
  }

  function handleToggleFavorite(id) {
    const place = places.find((p) => p.id === id);
    const saved = updatePlace(id, { favorite: !place.favorite });
    setPlaces(getPlaces());
    syncToCloud(saved);
  }

  function handleToggleVisited(id) {
    const place = places.find((p) => p.id === id);
    const saved = updatePlace(id, { visited: !place.visited });
    setPlaces(getPlaces());
    syncToCloud(saved);
  }

  function handleDelete(id) {
    deletePlace(id);
    deleteAllPhotosForPlace(id).catch(() => {});
    setPlaces(getPlaces());
    if (userId) deleteCloudPlace(userId, id).catch((err) => console.error('Could not delete from cloud', err));
  }

  function handleRestore(restoredPlaces) {
    replaceAllPlaces(restoredPlaces);
    setPlaces(getPlaces());
    if (userId) {
      // Push the whole restored set to the cloud too, so it isn't
      // overwritten again on the next sync.
      Promise.all(restoredPlaces.map((p) => upsertCloudPlace(userId, p))).catch((err) =>
        console.error('Could not sync restored backup to cloud', err)
      );
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const cities = getCities();

  if (authStatus === 'loading') {
    return (
      <div className="auth-shell">
        <p className="auth-subtitle">Loading\u2026</p>
      </div>
    );
  }

  if (authStatus === 'check-email') {
    return (
      <CheckEmailScreen
        email={pendingEmail}
        onBackToSignIn={() => setAuthStatus('signed-out')}
      />
    );
  }

  if (authStatus === 'signed-out') {
    return (
      <AuthScreen
        onSignedUp={(email) => { setPendingEmail(email); setAuthStatus('check-email'); }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="photo-header">
          <HeaderFieldRow />
        </div>

        <div className="masthead-title-row">
          <h1 className="masthead-title">A day out{syncing ? ' \u00b7 syncing\u2026' : ''}</h1>
          <div className="masthead-account-row">
            <BackupMenu places={places} onRestore={handleRestore} />
            <AccountBadge email={userEmail} onSignOut={handleSignOut} />
          </div>
        </div>
        <nav className="tab-row">
          <button className={`tab-stub ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>
            Plan a day
          </button>
          <button className={`tab-stub ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
            Saved places
          </button>
        </nav>
      </header>

      <main>
        {tab === 'saved' && (
          <SavedPlacesTab
            places={places}
            cities={cities}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onToggleFavorite={handleToggleFavorite}
            onToggleVisited={handleToggleVisited}
            onDelete={handleDelete}
          />
        )}
        {tab === 'plan' && <PlanTab places={places} cities={cities} />}
      </main>
    </div>
  );
}
