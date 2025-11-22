import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/useAppStore';
import MapPanel from '@/components/MapPanel';
import { toast } from 'sonner';

export default function DriverDashboard() {
  const demoStep = useAppStore(s => s.demoStep);
  if (demoStep === 'idle') {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">System Offline</h2>
        <p className="text-gray-400">
          Please ask Admin to Seed Data to start the system.
        </p>
      </div>
    );
  }

  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.currentUser);
  const drivers = useAppStore((state) => state.drivers);
  const pools = useAppStore((state) => state.pools);
  const students = useAppStore((state) => state.students);
  const hotspots = useAppStore((state) => state.hotspots);
  const verifyOtp = useAppStore((state) => state.verifyOtp);
  const startTrips = useAppStore((state) => state.startTrips);
  const completeTrips = useAppStore((state) => state.completeTrips);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const [otpInput, setOtpInput] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'driver') {
      setCurrentUser({ role: 'driver', id: 'd1' });
    }
  }, [currentUser]);

  const currentDriver = drivers.find((d) => d.id === currentUser?.id);
  const assignedPool = currentDriver?.assignedPoolId ? pools.find((p) => p.id === currentDriver.assignedPoolId) : null;
  const poolMembers = assignedPool ? students.filter((s) => assignedPool.studentIds.includes(s.id)) : [];

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleVerifyOtp = () => {
    if (!assignedPool) return;

    if (verifyOtp(assignedPool.id, otpInput)) {
      toast.success('OTP verified successfully! ✨', {
        description: 'You can now start the trip',
      });
      setOtpInput('');
    } else {
      toast.error('Invalid OTP', {
        description: 'Please check the code and try again',
      });
    }
  };

  const handleStartTrip = () => {
    if (!assignedPool?.otpVerified) {
      toast.error('Please verify OTP first');
      return;
    }
    startTrips();
    toast.success('Trip started!');
  };

  const handleCompleteTrip = () => {
    completeTrips();
    toast.success('Trip completed successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-muted/20 text-muted-foreground border-muted/30';
      case 'assigned':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'enroute':
        return 'bg-success/20 text-success border-success/30';
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Driver Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {currentDriver ? `${currentDriver.name} • ${currentDriver.plate}` : 'Welcome back'}
            </p>
          </motion.div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-danger"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignment Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-secondary mr-2" />
                <h2 className="text-xl font-semibold">Current Assignment</h2>
              </div>
              {currentDriver && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(currentDriver.status)}`}>
                  {currentDriver.status.toUpperCase()}
                </span>
              )}
            </div>

            {assignedPool ? (
              <div className="space-y-4">
                {/* Route Info */}
                <div className="glass rounded-lg p-4 border border-secondary/30">
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-primary mr-2" />
                    <span className="text-muted-foreground mr-2">Pickup:</span>
                    <span className="font-semibold">{hotspots.find((h) => h.id === assignedPool.pickup)?.name}</span>
                  </div>
                  <div className="flex items-center text-sm mt-2">
                    <MapPin className="w-4 h-4 text-success mr-2" />
                    <span className="text-muted-foreground mr-2">Drop:</span>
                    <span className="font-semibold">{hotspots.find((h) => h.id === assignedPool.drop)?.name}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Pool Size:</span>
                    <span className="font-semibold ml-2">{poolMembers.length}/4</span>
                  </div>
                </div>

                {/* Pool Members */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Passengers</p>
                  <div className="space-y-2">
                    {poolMembers.map((member) => (
                      <div key={member.id} className="glass rounded-lg p-3 flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center font-bold text-sm mr-3">
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{member.name.split(' ')[0]}</p>
                          <p className="text-xs text-muted-foreground font-mono">***{member.roll.slice(-3)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTP Verification */}
                {!assignedPool.otpVerified ? (
                  <div className="glass rounded-lg p-4 border border-warning/30">
                    <p className="text-sm text-muted-foreground mb-3">Enter Group OTP</p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="6-digit code"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        maxLength={6}
                        className="glass font-mono text-lg tracking-wider"
                      />
                      <Button
                        onClick={handleVerifyOtp}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-lg p-4 border border-success/30 flex items-center">
                    <CheckCircle className="w-5 h-5 text-success mr-2" />
                    <span className="text-sm font-semibold text-success">OTP Verified ✓</span>
                  </div>
                )}

                {/* Trip Controls */}
                <div className="space-y-2">
                  {assignedPool.status === 'verified' && (
                    <Button
                      onClick={handleStartTrip}
                      className="w-full bg-success hover:bg-success/90 text-background"
                    >
                      Start Trip
                    </Button>
                  )}
                  {assignedPool.status === 'started' && (
                    <Button
                      onClick={handleCompleteTrip}
                      className="w-full bg-success hover:bg-success/90 text-background"
                    >
                      Complete Trip
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No assignments yet</p>
                <p className="text-sm text-muted-foreground mt-1">Wait for admin to assign a pool</p>
              </div>
            )}
          </motion.div>

          {/* Mini Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Route Preview</h2>
            <MapPanel height="400px" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
