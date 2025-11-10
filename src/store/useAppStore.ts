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
  { id: 'agira-hall',    name: 'Agira Hall',   lat: 30.351606, lng: 76.364327 },
  { id: 'prithvi-hall',  name: 'Prithvi Hall', lat: 30.351227, lng: 76.360978 },
  { id: 'neeram-hall',   name: 'Neeram Hall',  lat: 30.351148, lng: 76.359893 },
  { id: 'e-block',       name: 'E Block',      lat: 30.353463, lng: 76.372207 },
  { id: 'auditorium',    name: 'Auditorium',   lat: 30.351968, lng: 76.370679 },
  { id: 'tan',           name: 'TAN Block',    lat: 30.353546, lng: 76.368576 },

  // KEEP THESE ALSO (needed in Student Dashboard & existing flows)
  { id: 'amritam-hall',  name: 'AMRITAM HALL', lat: 30.3545, lng: 76.3640 },
  { id: 'vyom-hall',     name: 'VYOM HALL',    lat: 30.3560, lng: 76.3650 },
  { id: 'c-block-old',   name: 'C Block',      lat: 30.3555, lng: 76.3665 }, 
  { id: 'venture-lab',   name: 'Venture Lab',  lat: 30.3565, lng: 76.3670 },
  { id: 'pg-hostel',     name: 'PG Hostel',    lat: 30.3553, lng: 76.3719 },
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
  // ------------ 12 Students ------------
  // Pool colors (student dots on map)
  const RED = '#ef4444';   // Agira -> E Block (4 of 5)
  const BLUE = '#3b82f6';  // Prithvi (3) + leftover Agira (1) -> Auditorium
  const GREEN = '#22c55e'; // Neeram (4) -> TAN

  const students: Student[] = [
    // 5 at Agira Hall (ids s1..s5)
    { id: 's1', name: 'Ishaan Sharma',    roll: '102303795', hostel: 'AGIRA',  pickup: 'agira-hall',  drop: 'e-block',     status: 'waiting', color: RED   },
    { id: 's2', name: 'Aarav Gupta',      roll: '102304001', hostel: 'AGIRA',  pickup: 'agira-hall',  drop: 'e-block',     status: 'waiting', color: RED   },
    { id: 's3', name: 'Mehak Arora',      roll: '102304002', hostel: 'AGIRA',  pickup: 'agira-hall',  drop: 'e-block',     status: 'waiting', color: RED   },
    { id: 's4', name: 'Abhishek Kansal',  roll: '102304003', hostel: 'AGIRA',  pickup: 'agira-hall',  drop: 'e-block',     status: 'waiting', color: RED   },
    { id: 's5', name: 'Sunita Jogpal',    roll: '102304004', hostel: 'AGIRA',  pickup: 'agira-hall',  drop: 'auditorium',  status: 'waiting', color: BLUE  }, // leftover Agira for blue pool

    // 3 at Prithvi Hall (ids s6..s8)
    { id: 's6', name: 'Riya Verma',       roll: '102304101', hostel: 'PRITHVI',pickup: 'prithvi-hall',drop: 'auditorium',  status: 'waiting', color: BLUE  },
    { id: 's7', name: 'Kabir Malhotra',   roll: '102304102', hostel: 'PRITHVI',pickup: 'prithvi-hall',drop: 'auditorium',  status: 'waiting', color: BLUE  },
    { id: 's8', name: 'Ananya Nanda',     roll: '102304103', hostel: 'PRITHVI',pickup: 'prithvi-hall',drop: 'auditorium',  status: 'waiting', color: BLUE  },

    // 4 at Neeram Hall (ids s9..s12)
    { id: 's9',  name: 'Arjun Saini',     roll: '102304201', hostel: 'NEERAM', pickup: 'neeram-hall', drop: 'tan',         status: 'waiting', color: GREEN },
    { id: 's10', name: 'Priya Gill',      roll: '102304202', hostel: 'NEERAM', pickup: 'neeram-hall', drop: 'tan',         status: 'waiting', color: GREEN },
    { id: 's11', name: 'Harsh Vardhan',   roll: '102304203', hostel: 'NEERAM', pickup: 'neeram-hall', drop: 'tan',         status: 'waiting', color: GREEN },
    { id: 's12', name: 'Neha Bansal',     roll: '102304204', hostel: 'NEERAM', pickup: 'neeram-hall', drop: 'tan',         status: 'waiting', color: GREEN },
  ];

  // ------------ 3 Drivers ------------
  const drivers: Driver[] = [
    // Place drivers at different parts of campus
    { id: 'd1', name: 'Sukhdev', plate: 'PB11-AC-4411', lat: 30.350900, lng: 76.362800, status: 'idle' }, // near Agira side-west
    { id: 'd2', name: 'Rakesh',  plate: 'PB11-ER-3321', lat: 30.352200, lng: 76.358800, status: 'idle' }, // near Prithvi side-west
    { id: 'd3', name: 'Gopal',   plate: 'PB11-BR-9910', lat: 30.352300, lng: 76.366800, status: 'idle' }, // central-east
  ];

  set({ students, drivers, pools: [], trips: [], demoStep: 'seeded' });
},

createPools: () => {
  const { students } = get();

  // Pools as per requirement:
  // Pool-RED: 4 of 5 from Agira -> E Block
  // Pool-BLUE: 3 from Prithvi + 1 leftover from Agira -> Auditorium
  // Pool-GREEN: 4 from Neeram -> TAN

  const pools: Pool[] = [
    {
      id: 'pool-red',
      studentIds: ['s1','s2','s3','s4'],            // 4 from Agira
      pickup: 'agira-hall',
      drop: 'e-block',
      otp: '111222',
      otpVerified: false,
      status: 'pending',
    },
    {
      id: 'pool-blue',
      studentIds: ['s6','s7','s8','s5'],            // 3 Prithvi + leftover Agira
      pickup: 'prithvi-hall',                       // first pickup at Prithvi
      drop: 'auditorium',
      otp: '333444',
      otpVerified: false,
      status: 'pending',
    },
    {
      id: 'pool-green',
      studentIds: ['s9','s10','s11','s12'],         // 4 Neeram
      pickup: 'neeram-hall',
      drop: 'tan',
      otp: '555666',
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

  // Assign each pool to a driver
  const poolAssignments = [
    { poolId: 'pool-red',   driverId: 'd1' }, // Agira -> E Block
    { poolId: 'pool-blue',  driverId: 'd2' }, // Prithvi -> Agira -> Auditorium
    { poolId: 'pool-green', driverId: 'd3' }, // Neeram -> TAN
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

  // --------- ROAD-FOLLOWING ROUTES (approx on-campus roads) ---------
  // Coordinates used from your message:
  // Neeram:     [30.351148, 76.359893]
  // Agira:      [30.351606, 76.364327]
  // Prithvi:    [30.351227, 76.360978]
  // E Block:    [30.353463, 76.372207]
  // TAN Block:  [30.353546, 76.368576]
  // Auditorium: [30.351968, 76.370679]

  const trips: Trip[] = updatedPools.map(pool => {
    if (pool.id === 'pool-red') {
      // d1 start -> Agira pickup (4) -> E Block
      return {
        id: `trip-${pool.id}`,
        poolId: pool.id,
        driverId: pool.driverId!,
        route: [
          [30.350900, 76.362800], // d1 start (west)
          [30.351200, 76.363400],
          [30.351400, 76.363900],
          [30.351606, 76.364327], // Agira Hall pickup (4)
          [30.351900, 76.365500],
          [30.352500, 76.366800],
          [30.352900, 76.368500],
          [30.353100, 76.370000],
          [30.353300, 76.371000],
          [30.353463, 76.372207], // E Block drop
        ],
        progress: 0,
        status: 'pending',
      };
    }

    if (pool.id === 'pool-blue') {
      // d2 start -> Prithvi pickup (3) -> Agira pickup (1) -> Auditorium
      return {
        id: `trip-${pool.id}`,
        poolId: pool.id,
        driverId: pool.driverId!,
        route: [
          [30.352200, 76.358800], // d2 start (south-west)
          [30.351900, 76.359400],
          [30.351600, 76.360100],
          [30.351227, 76.360978], // Prithvi pickup (3)
          [30.351350, 76.362300],
          [30.351500, 76.363300],
          [30.351606, 76.364327], // Agira pickup (1 leftover)
          [30.351700, 76.365300],
          [30.351850, 76.366800],
          [30.351950, 76.368200],
          [30.352200, 76.369600],
          [30.351968, 76.370679], // Auditorium drop
        ],
        progress: 0,
        status: 'pending',
      };
    }

    // pool-green
    // d3 start -> Neeram pickup (4) -> TAN Block
    return {
      id: `trip-${pool.id}`,
      poolId: pool.id,
      driverId: pool.driverId!,
      route: [
        [30.352300, 76.366800], // d3 start (central-east)
        [30.351900, 76.365400],
        [30.351700, 76.363600],
        [30.351500, 76.361900],
        [30.351148, 76.359893], // Neeram pickup (4)
        [30.351700, 76.361200],
        [30.352000, 76.362800],
        [30.352300, 76.364500],
        [30.352700, 76.366000],
        [30.353100, 76.367300],
        [30.353546, 76.368576], // TAN Block drop
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
