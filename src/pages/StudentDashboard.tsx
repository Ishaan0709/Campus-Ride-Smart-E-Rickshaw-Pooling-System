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

export default function StudentDashboard() {
  const demoStep = useAppStore(s => s.demoStep);

  if (demoStep === 'idle') {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold">System Offline</h2>
        <p className="text-gray-400 mt-2">
          Please ask the Admin to <span className="font-medium text-white">Seed Data</span> to start the demo.
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
  }, [currentUser]);

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
        return 'bg-warning/20 text-warning border-warning/30';
      case 'pooled':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'assigned':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'enroute':
        return 'bg-success/20 text-success border-success/30';
      case 'completed':
        return 'bg-muted/20 text-muted-foreground border-muted/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#DCD6D6]
 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-bold neon-text">Student Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {currentStudent ? `${currentStudent.name} • ${currentStudent.roll}` : 'Welcome back'}
            </p>
          </motion.div>

          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-danger">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Ride Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Request a Ride</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Pickup Location</label>
                <Select value={pickup} onValueChange={setPickup}>
                  <SelectTrigger className="glass">
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
                <label className="text-sm text-muted-foreground mb-2 block">Drop Location</label>
                <Select value={drop} onValueChange={setDrop}>
                  <SelectTrigger className="glass">
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

              <Button onClick={handleRequestRide} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-primary">
                Request Ride Now
              </Button>
            </div>
          </motion.div>

          {/* Pool Status Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-primary mr-2" />
                <h2 className="text-xl font-semibold">My Pool</h2>
              </div>
              {currentStudent && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(currentStudent.status)}`}>
                  {currentStudent.status.toUpperCase()}
                </span>
              )}
            </div>

            {currentPool ? (
              <div className="space-y-4">
                {/* OTP Display */}
                {currentPool.otp && (
                  <div className="glass rounded-lg p-4 border border-primary/30">
                    <p className="text-xs text-muted-foreground mb-2">Group OTP (Share with driver)</p>
                    <div className="flex items-center justify-between">
                      <code className="text-2xl font-mono font-bold text-primary tracking-wider">
                        {currentPool.otp}
                      </code>
                      <Button size="sm" variant="ghost" onClick={handleCopyOtp} className="text-primary hover:text-primary/80">
                        {otpCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {assignedDriver && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Auto:&nbsp;<span className="font-semibold">Auto A</span>&nbsp;•&nbsp;
                        Driver:&nbsp;<span className="font-semibold">{assignedDriver.name}</span>&nbsp;•&nbsp;
                        Plate:&nbsp;<span className="font-mono">{assignedDriver.plate}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pool Members */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Pool Members ({poolMembers.length}/4)</p>
                  <div className="space-y-2">
                    {poolMembers.map((member) => (
                      <div key={member.id} className="glass rounded-lg p-3 flex items-center">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mr-3"
                          style={{ background: member.color ?? 'var(--primary)' }}
                          title={member.name}
                        >
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.roll}</p>
                        </div>
                        {member.id === currentUser?.id && <span className="text-xs text-primary font-semibold">You</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No active pool</p>
                <p className="text-sm text-muted-foreground mt-1">Request a ride to get started</p>
              </div>
            )}
          </motion.div>

          {/* Map */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Live Tracking</h2>
              <MapPanel height="500px" filterPoolId={currentPool?.id} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
