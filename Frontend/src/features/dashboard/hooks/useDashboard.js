import { useState, useEffect } from 'react';
import { getDashboardData, fallbackDashboardData } from '../services/dashboardService';

export function useDashboard() {
  const [data, setData] = useState(fallbackDashboardData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((res) => {
        if (!active) return;
        setData(res || fallbackDashboardData);
      })
      .catch((err) => {
        console.warn('[useDashboard] Error:', err);
        if (!active) return;
        setData(fallbackDashboardData);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}
