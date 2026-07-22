import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

const SeedAdmin: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [dryRunData, setDryRunData] = useState<any>(null);
  const [applyData, setApplyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple admin check: Only justinplappert@gmail.com or specifically designated admins
  const isAdmin = user?.email === 'justinplappert@gmail.com';

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <p className="mb-4">Unauthorized: You do not have admin privileges.</p>
        <button className="rounded bg-indigo-600 px-4 py-2" onClick={() => navigate('/')}>Return Home</button>
      </div>
    );
  }

  const doFetch = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = async () => {
    const data = await doFetch('/api/admin/seed-import-dryrun');
    if (data) setDryRunData(data);
  };

  const handleApply = async () => {
    if (!window.confirm("WARNING: This will mutate the database. Are you absolutely sure?")) return;
    const data = await doFetch('/api/admin/seed-import-apply');
    if (data) setApplyData(data);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-indigo-400">Admin: Seed Import</h1>
          <p className="mt-2 text-zinc-400">Import the 9490-item seed pack directly into the deployed Postgres database safely.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-950 p-4 border border-red-900">
            <h3 className="text-sm font-medium text-red-400">Error</h3>
            <p className="mt-1 text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="rounded-lg bg-zinc-900 p-6 border border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">Step 1: Dry Run</h2>
              <p className="text-sm text-zinc-400">Simulate the import, verify missing items, and identify dummies safely.</p>
            </div>
            <button
              onClick={handleDryRun}
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Dry Run'}
            </button>
          </div>
          
          {dryRunData && (
            <div className="mt-4 rounded bg-black p-4 text-sm font-mono text-zinc-300 whitespace-pre-wrap">
              {JSON.stringify(dryRunData, null, 2)}
            </div>
          )}
        </div>

        {dryRunData && !applyData && (
          <div className="rounded-lg bg-zinc-900 p-6 border border-indigo-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white">Step 2: Apply Changes</h2>
                <p className="text-sm text-zinc-400">Execute writes, backup to GCS, and reconcile database.</p>
              </div>
              <button
                onClick={handleApply}
                disabled={loading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-rose-500 disabled:opacity-50"
              >
                {loading ? 'Applying...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        )}

        {applyData && (
          <div className="rounded-lg bg-emerald-950 p-6 border border-emerald-900">
            <h2 className="text-lg font-medium text-emerald-400">Success: Final Reconciliation Metrics</h2>
            <div className="mt-4 rounded bg-black p-4 text-sm font-mono text-emerald-300 whitespace-pre-wrap">
              {JSON.stringify(applyData, null, 2)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SeedAdmin;
