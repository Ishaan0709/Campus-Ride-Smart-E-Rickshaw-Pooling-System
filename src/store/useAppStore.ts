import { create } from 'zustand';

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Student {
  id: string;
  name: string;
  roll: string;
  hostel: string;
  pickup: string;
  drop: string;
  poolId?: string;
  status: 'waiting' | 'pooled' | 'assigned' | 'enroute' | 'completed';
  // NEW: hex color for map pin
  color?: string;
}

export interface Driver {
  id: string;
  name: string;
  plate: string;
  lat: number;
  lng: number;
  status: 'idle' | 'assigned' | 'enroute';
  assignedPoolId?: string;
}

export interface Pool {
  id: string;
  studentIds: string[];
  pickup: string;
  drop: string;
  otp: string;
  otpVerified: boolean;
  driverId?: string;
  status: 'pending' | 'assigned' | 'verified' | 'started' | 'completed';
}

export interface Trip {
  id: string;
  poolId: string;
  driverId: string;
  route: [number, number][];
  currentPosition?: [number, number];
  progress: number;
  status: 'pending' | 'started' | 'completed';
}

interface AppState {
  currentUser: { role: 'student' | 'driver' | 'admin'; id: string } | null;
  hotspots: Hotspot[];
  students: Student[];
  drivers: Driver[];
  pools: Pool[];
  trips: Trip[];
  demoStep: 'idle' | 'seeded' | 'pooled' | 'assigned' | 'verified' | 'moving' | 'completed';

  setCurrentUser: (user: { role: 'student' | 'driver' | 'admin'; id: string } | null) => void;

  // --- Admin demo controls (UNCHANGED) ---
  seedDemo: () => void;
  createPools: () => void;
  assignDrivers: () => void;
  verifyOtp: (poolId: string, code: string) => boolean;
  startTrips: () => void;
  completeTrips: () => void;
  updateTripProgress: (tripId: string, progress: number, position: [number, number]) => void;

  // NEW: student-only mini demo (does not touch admin flow)
  initStudentOnlyDemo: () => void;

  resetDemo: () => void;
}

const initialHotspots: Hotspot[] = [
  { id: 'main-gate', name: 'Main Gate', lat: 30.3570, lng: 76.3660 },
  { id: 'amritam-hall', name: 'AMRITAM HALL', lat: 30.3545, lng: 76.3640 },
  { id: 'vyom-hall', name: 'VYOM HALL', lat: 30.3560, lng: 76.3650 },
  { id: 'c-block', name: 'C Block', lat: 30.3555, lng: 76.3665 },
  { id: 'venture-lab', name: 'Venture Lab', lat: 30.3565, lng: 76.3670 },
  // NEW: for girls residence
  { id: 'pg-hostel', name: 'PG Hostel', lat: 30.3553, lng: 76.3719 },
];

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  hotspots: initialHotspots,
  students: [],
  drivers: [],
  pools: [],
  trips: [],
  demoStep: 'idle',

  setCurrentUser: (user) => set({ currentUser: user }),

  // ------------------ ADMIN DEMO (your original behavior) ------------------
  seedDemo: () => {
    const students: Student[] = [
      { id: 's1', name: 'Ishaan Sharma', roll: '102303795', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'c-block', status: 'waiting' },
      { id: 's2', name: 'Mehak Arora', roll: '102303801', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'c-block', status: 'waiting' },
      { id: 's3', name: 'Sunita Jogpal', roll: '102303812', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'c-block', status: 'waiting' },
      { id: 's4', name: 'Abhishek Kansal', roll: '102303823', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'c-block', status: 'waiting' },
      { id: 's5', name: 'Aarav Gupta', roll: '102303834', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'venture-lab', status: 'waiting' },
      { id: 's6', name: 'Kabir Malhotra', roll: '102303856', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'venture-lab', status: 'waiting' },
      { id: 's7', name: 'Ananya Nanda', roll: '102303867', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'venture-lab', status: 'waiting' },
      { id: 's8', name: 'Riya Verma', roll: '102303845', hostel: 'VYOM', pickup: 'vyom-hall', drop: 'venture-lab', status: 'waiting' },
    ];

    const drivers: Driver[] = [
      { id: 'd1', name: 'Raj Kumar', plate: 'PB11-ER-4101', lat: 30.3538, lng: 76.3635, status: 'idle' },
      { id: 'd2', name: 'Anil Verma', plate: 'PB11-ER-4102', lat: 30.3540, lng: 76.3638, status: 'idle' },
      { id: 'd3', name: 'Surinder Pal', plate: 'PB11-ER-4103', lat: 30.3570, lng: 76.3660, status: 'idle' },
    ];

    set({ students, drivers, demoStep: 'seeded' });
  },

  createPools: () => {
    const { students } = get();
    const pools: Pool[] = [
      {
        id: 'pool-1',
        studentIds: ['s1', 's2', 's3', 's4'],
        pickup: 'amritam-hall',
        drop: 'c-block',
        otp: '123456',
        otpVerified: false,
        status: 'pending',
      },
      {
        id: 'pool-2',
        studentIds: ['s5', 's6', 's7', 's8'],
        pickup: 'amritam-hall',
        drop: 'venture-lab',
        otp: '789012',
        otpVerified: false,
        status: 'pending',
      },
    ];

    const updatedStudents = students.map(s => {
      const pool = pools.find(p => p.studentIds.includes(s.id));
      return pool ? { ...s, poolId: pool.id, status: 'pooled' as const } : s;
    });

    set({ pools, students: updatedStudents, demoStep: 'pooled' });
  },

  assignDrivers: () => {
    const { pools, drivers } = get();
    const poolAssignments = [
      { poolId: 'pool-1', driverId: 'd1' },
      { poolId: 'pool-2', driverId: 'd2' },
    ];

    const updatedPools = pools.map(pool => {
      const assignment = poolAssignments.find(a => a.poolId === pool.id);
      return { ...pool, driverId: assignment?.driverId, status: 'assigned' as const };
    });

    const updatedDrivers = drivers.map(driver => {
      const assignment = poolAssignments.find(a => a.driverId === driver.id);
      return assignment ? { ...driver, status: 'assigned' as const, assignedPoolId: assignment.poolId } : driver;
    });

    const updatedStudents = get().students.map(s => {
      const pool = updatedPools.find(p => p.studentIds.includes(s.id));
      return pool && pool.driverId ? { ...s, status: 'assigned' as const } : s;
    });

    const trips: Trip[] = updatedPools.map(pool => {
      if (pool.id === 'pool-1') {
        return {
          id: `trip-${pool.id}`,
          poolId: pool.id,
          driverId: pool.driverId!,
          route: [
            [30.3538, 76.3635],
            [30.3540, 76.3637],
            [30.3542, 76.3638],
            [30.3543, 76.3639],
            [30.3545, 76.3640],
            [30.3546, 76.3642],
            [30.3548, 76.3645],
            [30.3549, 76.3648],
            [30.3550, 76.3652],
            [30.3552, 76.3657],
            [30.3553, 76.3660],
            [30.3554, 76.3663],
            [30.3555, 76.3665], // C Block
          ],
          progress: 0,
          status: 'pending',
        };
      }
      return {
        id: `trip-${pool.id}`,
        poolId: pool.id,
        driverId: pool.driverId!,
        route: [
          [30.3540, 76.3638],
          [30.3542, 76.3639],
          [30.3544, 76.3640],
          [30.3545, 76.3640], // Amritam
          [30.3560, 76.3650], // Vyom
          [30.3565, 76.3670], // Venture Lab
        ],
        progress: 0,
        status: 'pending',
      };
    });

    set({
      pools: updatedPools,
      drivers: updatedDrivers,
      students: updatedStudents,
      trips,
      demoStep: 'assigned',
    });
  },

  verifyOtp: (poolId, code) => {
    const { pools } = get();
    const pool = pools.find(p => p.id === poolId);
    if (pool && pool.otp === code) {
      const updated = pools.map(p => p.id === poolId ? { ...p, otpVerified: true, status: 'verified' as const } : p);
      set({ pools: updated });
      if (updated.every(p => p.otpVerified)) set({ demoStep: 'verified' });
      return true;
    }
    return false;
  },

  startTrips: () => {
    const { trips, pools, drivers, students } = get();
    set({
      trips: trips.map(t => ({ ...t, status: 'started' as const, currentPosition: t.route[0] })),
      pools: pools.map(p => ({ ...p, status: 'started' as const })),
      drivers: drivers.map(d => ({ ...d, status: 'enroute' as const })),
      students: students.map(s => ({ ...s, status: 'enroute' as const })),
      demoStep: 'moving',
    });
  },

  updateTripProgress: (tripId, progress, position) => {
    const { trips } = get();
    set({ trips: trips.map(t => t.id === tripId ? { ...t, progress, currentPosition: position } : t) });
  },

  completeTrips: () => {
    const { trips, pools, drivers, students } = get();
    set({
      trips: trips.map(t => ({ ...t, status: 'completed' as const, progress: 1 })),
      pools: pools.map(p => ({ ...p, status: 'completed' as const })),
      drivers: drivers.map(d => ({ ...d, status: 'idle' as const, assignedPoolId: undefined })),
      students: students.map(s => ({ ...s, status: 'completed' as const })),
      demoStep: 'completed',
    });
  },

  // ------------------ NEW: STUDENT-ONLY MINI DEMO ------------------
  initStudentOnlyDemo: () => {
    const students: Student[] = [
      { id: 's1', name: 'Ishaan Sharma',   roll: '102303795', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'c-block',   status: 'assigned', color: '#14F4C5' },
      { id: 's2', name: 'Abhishek Kansal', roll: '102309901', hostel: 'AMRITAM', pickup: 'amritam-hall', drop: 'c-block',   status: 'assigned', color: '#22c55e' },
      { id: 's3', name: 'Sunita Jogpal',   roll: '102307777', hostel: 'PG',      pickup: 'pg-hostel',   drop: 'c-block',   status: 'assigned', color: '#f43f5e' },
      { id: 's4', name: 'Mehak Arora',     roll: '102303801', hostel: 'PG',      pickup: 'pg-hostel',   drop: 'c-block',   status: 'assigned', color: '#a78bfa' },
    ];

    const drivers: Driver[] = [
      { id: 'd1', name: 'Raj Kumar', plate: 'PB11-ER-4101', lat: 30.3538, lng: 76.3635, status: 'assigned', assignedPoolId: 'pool-1' },
    ];

    const pools: Pool[] = [{
      id: 'pool-1',
      studentIds: ['s1','s2','s3','s4'],
      pickup: 'amritam-hall',
      drop: 'c-block',
      otp: '823614',
      otpVerified: false,
      status: 'assigned',
      driverId: 'd1',
    }];

    const trips: Trip[] = [{
      id: 'trip-pool-1',
      poolId: 'pool-1',
      driverId: 'd1',
      route: [
        [30.3538, 76.3635],
        [30.3542, 76.3638],
        [30.3545, 76.3640], // Amritam (boys)
        [30.3552, 76.3653],
        [30.3559, 76.3672],
        [30.3568, 76.3695],
        [30.3553, 76.3719], // PG Hostel (girls)
        [30.3557, 76.3700],
        [30.3556, 76.3685],
        [30.3555, 76.3665], // C Block
      ],
      progress: 0,
      status: 'pending',
    }];

    set({
      students,
      drivers,
      pools,
      trips,
      demoStep: 'assigned',
    });
  },

  resetDemo: () => {
    set({ students: [], drivers: [], pools: [], trips: [], demoStep: 'idle' });
  },
}));
