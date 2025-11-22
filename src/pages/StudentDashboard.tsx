import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Copy, Check, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import MapPanel from '@/components/MapPanel';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Student portal – redesigned with white card + Thapar red accents.
 * Functionality unchanged (uses app store and MapPanel same as before). 
 * Reference: original file uploaded. :contentReference[oaicite:1]{index=1}
 */

export default function StudentDashboard() {
  const demoStep = useAppStore(s => s.demoStep);

  if (demoStep === 'idle') {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold">System Offline</h2>
        <p className="text-gray-500 mt-2">
          Please ask the Admin to <span className="font-medium text-[#8A0000]">Seed Data</span> to start the demo.
        </p>
      </div>
    );
  }

  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const pools = useAppStore((s) => s.pools);
  const hotspots = useAppStore((s) => s.hotspots);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const initStudentOnlyDemo = useAppStore((s) => s.initStudentOnlyDemo);

  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [otpCopied, setOtpCopied] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      setCurrentUser({ role: 'student', id: 's1' });
    }
  }, [currentUser, setCurrentUser]);

  const currentStudent = students.find((s) => s.id === currentUser?.id);
  const currentPool = currentStudent?.poolId ? pools.find((p) => p.id === currentStudent.poolId) : null;
  const poolMembers = currentPool ? students.filter((s) => currentPool.studentIds.includes(s.id)) : [];
  const assignedDriver = currentPool
    ? useAppStore.getState().drivers.find(d => d.assignedPoolId === currentPool.id || d.id === currentPool.driverId)
    : undefined;

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleRequestRide = () => {
    if (!pickup || !drop) {
      toast.error('Please select pickup and drop locations');
      return;
    }
    toast.success('Ride requested! You will be pooled with other students.');
  };

  const handleCopyOtp = () => {
    if (currentPool?.otp) {
      navigator.clipboard.writeText(currentPool.otp);
      setOtpCopied(true);
      toast.success('OTP copied to clipboard');
      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-50 text-yellow-800 border-yellow-100';
      case 'pooled':
      case 'assigned':
        return 'bg-[#FFECEC] text-[#8A0000] border-[#FFD6D6]';
      case 'enroute':
        return 'bg-green-50 text-green-800 border-green-100';
      case 'completed':
        return 'bg-gray-50 text-gray-700 border-gray-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
            <p className="text-gray-600 mt-1">
              {currentStudent ? `${currentStudent.name} • ${currentStudent.roll}` : 'Sign in to book rides'}
            </p>
          </motion.div>

          <Button variant="ghost" onClick={handleLogout} className="text-gray-700">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Request Card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-[#8A0000] mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Request a Ride</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Pickup Location</label>
                <Select value={pickup} onValueChange={setPickup}>
                  <SelectTrigger className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-left">
                    <SelectValue placeholder="Select pickup location" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotspots.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-2 block">Drop Location</label>
                <Select value={drop} onValueChange={setDrop}>
                  <SelectTrigger className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-left">
                    <SelectValue placeholder="Select drop location" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotspots.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleRequestRide} className="w-full bg-[#8A0000] hover:bg-[#7a0000] text-white">
                Request Ride Now
              </Button>
            </div>
          </motion.div>

          {/* Middle: Pool Status */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-[#8A0000] mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">My Pool</h2>
              </div>
              {currentStudent && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(currentStudent.status)}`}>
                  {currentStudent.status.toUpperCase()}
                </span>
              )}
            </div>

            {currentPool ? (
              <div className="space-y-4">
                {currentPool.otp && (
                  <div className="rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Group OTP (Share with driver)</p>
                    <div className="flex items-center justify-between">
                      <code className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                        {currentPool.otp}
                      </code>
                      <Button size="sm" variant="ghost" onClick={handleCopyOtp} className="text-[#8A0000]">
                        {otpCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {assignedDriver && (
                      <div className="mt-3 text-sm text-gray-600">
                        Driver: <span className="font-semibold">{assignedDriver.name}</span> • Plate: <span className="font-mono">{assignedDriver.plate}</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-3">Pool Members ({poolMembers.length}/4)</p>
                  <div className="space-y-2">
                    {poolMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#FFECEC] text-[#8A0000]">
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.roll}</p>
                        </div>
                        {member.id === currentUser?.id && <span className="text-xs text-[#8A0000] font-semibold">You</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No active pool</p>
                <p className="text-sm text-gray-500 mt-1">Request a ride to get started</p>
              </div>
            )}
          </motion.div>

          {/* Right: Map preview (spans full width on large screens) */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border p-4 h-full">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Live Tracking</h2>
              <MapPanel height="420px" filterPoolId={currentPool?.id} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
