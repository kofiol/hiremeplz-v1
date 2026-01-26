'use client'

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useUtm = () => {
  const searchParams = useSearchParams();
  const [utms, setUtms] = useState<Record<string, string>>({});

  useEffect(() => {
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const foundUtms: Record<string, string> = {};

    keys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        foundUtms[key] = value;
        // Optional: Persist to localStorage/sessionStorage so they survive navigation
        sessionStorage.setItem(key, value);
      } else {
        // Check if they were previously saved in this session
        const saved = sessionStorage.getItem(key);
        if (saved) foundUtms[key] = saved;
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUtms(foundUtms);
  }, [searchParams]);

  return utms;
};