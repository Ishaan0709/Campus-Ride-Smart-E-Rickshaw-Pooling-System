import React, { useEffect } from "react";
import ThaparNavbar from "@/components/ThaparNavbar";
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Admin portal – redesigned white card with red accent.
 * Preserves original admin actions (seed, assign etc.) but with the new styling.
 * Reference: original uploaded file. :contentReference[oaicite:3]{index=3}
 */

export default function AdminDashboard() {
  const seedDemo = useAppStore(s => s.seedDemo);
  const clearDemo = useAppStore(s => s.clearDemo);
  const demoStep = useAppStore(s => s.demoStep);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  useEffect(() => {
    // ensure admin login for demo convenience (non-production)
    setCurrentUser({ role: 'admin', id: 'admin' });
  }, [setCurrentUser]);

  const handleSeed = async () => {
    seedDemo();
    toast.success('Seeded demo data');
  };

  const handleClear = () => {
    clearDemo();
    toast.success('Cleared demo data');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <ThaparNavbar />
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
              <p className="text-gray-600 mt-2">Manage the demo: seed data, assign drivers and monitor pools.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Demo status</div>
              <div className="mt-2 px-3 py-1 rounded-full bg-[#FFECEC] text-[#8A0000] font-semibold inline-block">
                {demoStep ?? 'idle'}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleSeed} className="bg-[#8A0000] hover:bg-[#7a0000] text-white">
              Seed Demo Data
            </Button>
            <Button onClick={handleClear} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              Clear Demo Data
            </Button>
          </div>

          <div className="mt-8 text-sm text-gray-600">
            For demo: Use any email/password for login. Seed data will create sample students, drivers and pools.
          </div>
        </div>
      </div>
    </div>
  );
}
