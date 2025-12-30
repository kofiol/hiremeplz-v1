'use client';

import { useState } from 'react';
import { useSession } from '@/app/auth/session-provider';

export default function JobSearchTriggerPage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { session, isLoading } = useSession();

  const triggerTask = async () => {
    if (!session?.access_token) {
      setResult(isLoading ? 'Loading session...' : 'Error: Unauthorized');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/job-search/trigger', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error: unknown) {
      setResult(`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Job Search Trigger</h1>
      <button
        onClick={triggerTask}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Running...' : 'Trigger Task'}
      </button>
      {result && <p className="mt-4">{result}</p>}
    </div>
  );
}
