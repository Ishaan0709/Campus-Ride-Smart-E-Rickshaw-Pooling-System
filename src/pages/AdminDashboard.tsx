import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, Users, Car, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import MapPanel from '@/components/MapPanel';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.currentUser);
  const students = useAppStore((state) => state.students);
  const drivers = useAppStore((state) => state.drivers);
  const pools = useAppStore((state) => state.pools);
  const trips = useAppStore((state) => state.trips);
  const demoStep = useAppStore((state) => state.demoStep);
  const seedDemo = useAppStore((state) => state.seedDemo);
  const createPools = useAppStore((state) => state.createPools);
  const assignDrivers = useAppStore((state) => state.assignDrivers);
  const verifyOtp = useAppStore((state) => state.verifyOtp);
  const startTrips = useAppStore((state) => state.startTrips);
  const completeTrips = useAppStore((state) => state.completeTrips);
  const resetDemo = useAppStore((state) => state.resetDemo);
  const updateTripProgress = useAppStore((state) => state.updateTripProgress);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/auth/admin');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Animate trips with multi-segment routing and faster speed
    if (demoStep === 'moving' && trips.some((t) => t.status === 'started')) {
      const speedPerTick = 0.012; // progress delta per tick (slower, smoother movement)
      const tickMs = 200; // Update every 200ms for visible movement

      const getPositionAlongRoute = (route: [number, number][], progress: number): [number, number] => {
        if (!route || route.length === 0) return [30.3558, 76.3651];
        if (route.length === 1) return route[0];

        // Compute segment lengths
        const segLens = [] as number[];
        let total = 0;
        for (let i = 0; i < route.length - 1; i++) {
          const a = route[i];
          const b = route[i + 1];
          const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
          segLens.push(d);
          total += d;
        }
        const target = progress * total;
        let acc = 0;
        for (let i = 0; i < segLens.length; i++) {
          const nextAcc = acc + segLens[i];
          if (target <= nextAcc) {
            const t = segLens[i] === 0 ? 0 : (target - acc) / segLens[i];
            const a = route[i];
            const b = route[i + 1];
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          }
          acc = nextAcc;
        }
        return route[route.length - 1];
      };

      const interval = setInterval(() => {
        trips.forEach((trip) => {
          if (trip.status === 'started' && trip.progress < 1) {
            const newProgress = Math.min(trip.progress + speedPerTick, 1);
            const pos = getPositionAlongRoute(trip.route, newProgress);
            updateTripProgress(trip.id, newProgress, pos);

            if (newProgress >= 1) {
              setTimeout(() => {
                completeTrips();
                clearInterval(interval);
                setAnimationInterval(null);
              }, 200);
            }
          }
        });
      }, tickMs);

      setAnimationInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [demoStep, trips]);

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleSeed = () => {
    resetDemo();
    seedDemo();
    toast.success('Demo seeded with 8 students and 3 autos');
  };

  const handlePool = () => {
    createPools();
    toast.success('Created 2 pools (4 + 4)');
  };
  const handleAssign = () => {
    assignDrivers();
    toast.success('Assigned drivers to all pools');
  };

  const handleVerifyAll = () => {
    pools.forEach((pool) => {
      verifyOtp(pool.id, pool.otp);
    });
    toast.success('All OTPs verified! ✨');
  };

  const handleMove = () => {
    startTrips();
    toast.success('Trips started! Watch the autos move');
  };

  const activeStudents = students.filter((s) => s.status !== 'completed').length;
  const activeTrips = trips.filter((t) => t.status === 'started').length;
  const idleDrivers = drivers.filter((d) => d.status === 'idle').length;
  const avgFillRate = pools.length > 0 ? (pools.reduce((acc, p) => acc + p.studentIds.length, 0) / (pools.length * 4)) * 100 : 0;

  const demoSteps = [
    { id: 'idle', label: 'Seed Data', action: handleSeed, color: 'bg-gradient-to-r from-red-500 to-red-600' },
    { id: 'seeded', label: 'Create Pools', action: handlePool, color: 'bg-gradient-to-r from-orange-500 to-orange-600' },
    { id: 'pooled', label: 'Assign Drivers', action: handleAssign, color: 'bg-gradient-to-r from-yellow-500 to-yellow-600' },
    { id: 'assigned', label: 'Verify OTPs', action: handleVerifyAll, color: 'bg-gradient-to-r from-green-500 to-green-600' },
    { id: 'verified', label: 'Start Trips', action: handleMove, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { id: 'moving', label: 'In Progress', action: () => {}, color: 'bg-gradient-to-r from-indigo-500 to-indigo-600', disabled: true },
    { id: 'completed', label: 'Completed', action: () => {}, color: 'bg-gradient-to-r from-purple-500 to-purple-600', disabled: true },
  ];

  const getCurrentStepIndex = () => {
    return demoSteps.findIndex((step) => step.id === demoStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Admin Control</h1>
            <p className="text-muted-foreground mt-1">System Overview & Demo Controls</p>
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

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-3xl font-bold text-primary mt-1">{activeStudents}</p>
              </div>
              <Users className="w-8 h-8 text-primary/50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-strong rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Trips</p>
                <p className="text-3xl font-bold text-success mt-1">{activeTrips}</p>
              </div>
              <Car className="w-8 h-8 text-success/50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Idle Drivers</p>
                <p className="text-3xl font-bold text-warning mt-1">{idleDrivers}</p>
              </div>
              <Clock className="w-8 h-8 text-warning/50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-strong rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fill Rate</p>
                <p className="text-3xl font-bold text-secondary mt-1">{avgFillRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-secondary/50" />
            </div>
          </motion.div>
        </div>

        {/* Guided Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Play className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Guided Demo</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetDemo();
                if (animationInterval) {
                  clearInterval(animationInterval);
                  setAnimationInterval(null);
                }
                toast.success('Demo reset');
              }}
              className="text-muted-foreground hover:text-danger"
            >
              Reset
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {demoSteps.map((step, index) => (
              <Button
                key={step.id}
                onClick={step.action}
                disabled={step.disabled || index > currentStepIndex + 1}
                className={`${
                  index <= currentStepIndex
                    ? `${step.color} text-background hover:opacity-90`
                    : 'glass text-muted-foreground'
                } ${index === currentStepIndex + 1 ? 'glow-primary' : ''}`}
              >
                {step.label}
                {index <= currentStepIndex && ' ✓'}
              </Button>
            ))}
          </div>

          {demoStep === 'moving' && (
            <div className="mt-4 p-3 glass rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 text-primary mr-2" />
              <span className="text-muted-foreground">Autos are moving... Watch the map!</span>
            </div>
          )}
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-2xl p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Live System Map</h2>
          <MapPanel height="600px" />
        </motion.div>
      </div>
    </div>
  );
}
