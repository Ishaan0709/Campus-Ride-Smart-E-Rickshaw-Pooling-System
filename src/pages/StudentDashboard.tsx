// src/pages/StudentDashboard.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, Copy, Check, MapPin, Users, Car, 
  Clock, Calendar, Shield, Edit, Save, X,
  Navigation, History, TrendingUp, Phone,
  RefreshCw, LocateFixed
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { getUserData, updateUserProfile } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAppStore();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [timePref, setTimePref] = useState<"now" | "10min" | "30min">("now");
  const [mode, setMode] = useState<"solo" | "pool">("pool");
  const [otpCopied, setOtpCopied] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    roll: "",
    email: "",
    hostel: "",
  });
  
  // Map state
  const [showMapMarkers, setShowMapMarkers] = useState(true);
  // Updated coordinates for Thapar Library path
  const [mapUrl, setMapUrl] = useState("https://www.openstreetmap.org/export/embed.html?bbox=76.360,30.354,76.366,30.359&layer=mapnik&marker=30.356944,76.362778");
  
  // All locations available for both pickup and drop
  const locations = [
    // Hostels
    { id: 'hostel-a', name: 'Hostel A Block', type: 'both' },
    { id: 'hostel-b', name: 'Hostel B Block', type: 'both' },
    { id: 'hostel-c', name: 'Hostel C Block', type: 'both' },
    { id: 'hostel-d', name: 'Hostel D Block', type: 'both' },
    { id: 'hostel-e', name: 'Hostel E Block', type: 'both' },
    { id: 'pg-hostel', name: 'PG Hostel', type: 'both' },
    { id: 'girls-hostel', name: 'Girls Hostel Complex', type: 'both' },
    
    // Academic Blocks
    { id: 'csed', name: 'CSED Department', type: 'both' },
    { id: 'jaggi-block', name: 'Jaggi Block', type: 'both' },
    { id: 'g-block', name: 'G Block (Academic)', type: 'both' },
    { id: 'library', name: 'Central Library', type: 'both' },
    { id: 'acad-block', name: 'Main Academic Block', type: 'both' },
    
    // Gates & Others
    { id: 'main-gate', name: 'Main Gate', type: 'both' },
    { id: 'sports-complex', name: 'Sports Complex', type: 'both' },
    { id: 'cafeteria', name: 'Main Cafeteria', type: 'both' },
    { id: 'bank', name: 'University Bank', type: 'both' },
    { id: 'health-center', name: 'Health Center', type: 'both' },
    { id: 'admin-block', name: 'Administration Block', type: 'both' },
    { id: 'auditorium', name: 'University Auditorium', type: 'both' },
  ];
  
  // Ride History
  const [rideHistory, setRideHistory] = useState<any[]>([
    {
      id: "1",
      pickup: "Hostel A Block",
      drop: "CSED Department",
      createdAt: new Date(Date.now() - 86400000 * 2),
      status: "completed",
      fare: 10,
      mode: "pool",
      rating: 4,
    },
    {
      id: "2",
      pickup: "Main Gate",
      drop: "Central Library",
      createdAt: new Date(Date.now() - 86400000 * 5),
      status: "completed",
      fare: 40,
      mode: "solo",
      rating: 5,
    },
  ]);

  // Stats
  const [stats, setStats] = useState({
    monthlyRides: 12,
    totalDistance: 42,
    co2Saved: 8.2,
    moneySaved: 240,
    poolSuccessRate: 92,
    avgWaitTime: 3.2,
  });

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/auth/student");
          return;
        }

        const userData = await getUserData(user.uid);
        
        if (userData) {
          setCurrentUser({
            ...userData,
            uid: user.uid,
          });
          
          // Initialize profile data
          setProfileData({
            name: userData.name,
            roll: userData.roll,
            email: userData.email,
            hostel: userData.hostel || "",
          });
        } else {
          // User doesn't exist in Firestore
          const basicUser = {
            uid: user.uid,
            name: user.email?.split('@')[0] || "Student",
            roll: "",
            email: user.email || "",
            hostel: "",
            role: "student" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          setCurrentUser(basicUser);
          setProfileData({
            name: basicUser.name,
            roll: basicUser.roll,
            email: basicUser.email,
            hostel: basicUser.hostel,
          });
          
          // Ask user to complete profile
          toast.info("Please complete your profile details");
          setIsEditingProfile(true);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, setCurrentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const handleRequestRide = () => {
    if (!pickup || !drop) {
      toast.error("Please select pickup and drop locations");
      return;
    }
    
    if (pickup === drop) {
      toast.error("Pickup and drop locations cannot be the same");
      return;
    }
    
    // Create mock active ride with updated pricing
    const newRide = {
      id: "ride_" + Date.now(),
      studentId: currentUser?.uid,
      studentName: currentUser?.name,
      pickup: locations.find(l => l.id === pickup)?.name || pickup,
      drop: locations.find(l => l.id === drop)?.name || drop,
      mode,
      timePreference: timePref,
      status: "requested",
      createdAt: new Date(),
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      fare: mode === "pool" ? 10 : 40, // Updated pricing
      driver: {
        name: "Rajesh Kumar",
        vehicle: "THAPAR-AUTO-101",
        rating: 4.8,
        phone: "+91 98765 43210"
      }
    };
    
    setActiveRide(newRide);
    
    toast.success(
      mode === "pool" 
        ? "Looking for pool partners... You'll be notified when matched!"
        : "Driver searching... We'll assign the nearest auto!"
    );
    
    // Reset form
    setPickup("");
    setDrop("");
  };

  const handleCopyOTP = () => {
    if (activeRide?.otp) {
      navigator.clipboard.writeText(activeRide.otp);
      setOtpCopied(true);
      toast.success("OTP copied to clipboard");
      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    try {
      await updateUserProfile(currentUser.uid, {
        name: profileData.name,
        roll: profileData.roll,
        hostel: profileData.hostel,
      });
      
      // Update local state
      setCurrentUser({
        ...currentUser,
        name: profileData.name,
        roll: profileData.roll,
        hostel: profileData.hostel,
      });
      
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleCancelRide = () => {
    setActiveRide(null);
    toast.success("Ride cancelled successfully");
  };

  const handleCompleteRide = () => {
    if (activeRide) {
      // Add to history
      const completedRide = {
        ...activeRide,
        status: "completed",
        completedAt: new Date(),
        rating: 5,
      };
      
      setRideHistory([completedRide, ...rideHistory]);
      setActiveRide(null);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        monthlyRides: prev.monthlyRides + 1,
        totalDistance: prev.totalDistance + 5, // Assuming 5km per ride
        moneySaved: prev.moneySaved + (activeRide.mode === "pool" ? 30 : 0), // Save 30 rupees per pool ride
      }));
      
      toast.success("Ride completed! Thank you for using TCMS.");
    }
  };

  // Map functions
  const handleResetMap = () => {
    setShowMapMarkers(false);
    setMapUrl("https://www.openstreetmap.org/export/embed.html?bbox=76.360,30.354,76.366,30.359&layer=mapnik");
    toast.info("Map markers cleared");
  };

  const handleLocateMe = () => {
    setShowMapMarkers(true);
    setMapUrl("https://www.openstreetmap.org/export/embed.html?bbox=76.360,30.354,76.366,30.359&layer=mapnik&marker=30.356944,76.362778");
    toast.success("Location markers restored");
  };

  // Recenter map function
  const handleRecenterMap = () => {
    setMapUrl("https://www.openstreetmap.org/export/embed.html?bbox=76.360,30.354,76.366,30.359&layer=mapnik&marker=30.356944,76.362778");
    toast.success("Map recentered to Thapar Library");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#A30303] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Thapar Institute Logo */}
              <div className="relative">
                <div className="w-12 h-12 flex items-center justify-center">
                  {/* TIET Logo - Thapar Institute of Engineering & Technology */}
                  <div className="flex flex-col items-center">
                    <div className="text-[#A30303] font-bold text-xl leading-tight">TIET</div>
                    <div className="text-[8px] text-[#A30303] font-semibold uppercase tracking-wider mt-[-2px]">
                      Thapar Institute
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Campus Mobility Service</h1>
                <p className="text-xs text-gray-500">Smart E-Rickshaw Pooling</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A30303] hover:bg-[#A30303]/10 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={profileData.roll}
                  onChange={(e) => setProfileData({...profileData, roll: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. 102303795"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hostel (Optional)
                </label>
                <input
                  type="text"
                  value={profileData.hostel}
                  onChange={(e) => setProfileData({...profileData, hostel: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Hostel A Block"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateProfile}
                className="flex-1 bg-[#A30303] hover:bg-[#A30303]/90 text-white py-2 rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Changes
              </button>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#A30303]/10 to-[#A30303]/5 rounded-2xl p-6 mb-6 border border-[#A30303]/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {getGreeting()}, {currentUser?.name || "Student"}
              </h1>
              <p className="text-gray-600 mt-2">
                {currentUser?.roll ? `${currentUser.roll} • ` : ""}
                {currentUser?.email}
                {currentUser?.hostel && ` • ${currentUser.hostel}`}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#A30303]" />
                  <span className="text-sm text-gray-600">
                    Default Pickup: {currentUser?.hostel || 'Hostel A Block'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#A30303]" />
                  <span className="text-sm text-gray-600">
                    Member since {new Date(currentUser?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 mt-4 md:mt-0">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold text-gray-900">{stats.monthlyRides}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Rides this month</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalDistance}km</div>
                <p className="text-sm text-gray-600 mt-1">Pooled distance</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.co2Saved}kg</div>
                <p className="text-sm text-gray-600 mt-1">CO₂ saved</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Booking & Current Ride */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Booking Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <div className="flex items-center mb-6">
                <Car className="w-6 h-6 text-[#A30303] mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Quick Ride Booking</h2>
              </div>
              
              <div className="space-y-6">
                {/* Pickup & Drop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center text-sm font-medium mb-2 text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-[#A30303]" />
                      Pickup Location
                    </label>
                    <select
                      value={pickup}
                      onChange={(e) => {
                        const newPickup = e.target.value;
                        setPickup(newPickup);
                        // Prevent same location as drop
                        if (newPickup === drop) {
                          setDrop("");
                          toast.error("Pickup and drop locations cannot be the same");
                        }
                      }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A30303] focus:border-transparent"
                    >
                      <option value="">Where are you?</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center text-sm font-medium mb-2 text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-green-500" />
                      Drop Location
                    </label>
                    <select
                      value={drop}
                      onChange={(e) => {
                        const newDrop = e.target.value;
                        setDrop(newDrop);
                        // Prevent same location as pickup
                        if (newDrop === pickup) {
                          setPickup("");
                          toast.error("Pickup and drop locations cannot be the same");
                        }
                      }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A30303] focus:border-transparent"
                    >
                      <option value="">Where to?</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Time Preference */}
                <div>
                  <label className="flex items-center text-sm font-medium mb-2 text-gray-700">
                    <Clock className="w-4 h-4 mr-2 text-[#A30303]" />
                    Pickup Time
                  </label>
                  <div className="flex gap-2">
                    {["now", "10min", "30min"].map((time) => (
                      <button
                        key={time}
                        onClick={() => setTimePref(time as any)}
                        className={`flex-1 py-2 rounded-lg border transition-colors ${
                          timePref === time
                            ? "bg-[#A30303] text-white border-[#A30303]"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {time === "now" ? "Now" : time === "10min" ? "10 min" : "30 min"}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Ride Mode */}
                <div>
                  <label className="flex items-center text-sm font-medium mb-2 text-gray-700">
                    <Users className="w-4 h-4 mr-2 text-[#A30303]" />
                    Ride Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode("pool")}
                      className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        mode === "pool"
                          ? "bg-[#A30303] text-white border-[#A30303]"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Join Pool 
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                        Save 75%
                      </span>
                    </button>
                    <button
                      onClick={() => setMode("solo")}
                      className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        mode === "solo"
                          ? "bg-[#A30303] text-white border-[#A30303]"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <Car className="w-4 h-4" />
                      Solo Ride
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    <span className="line-through text-gray-400">Normal: ₹40</span>
                    <span className="mx-2">→</span>
                    <span className="font-semibold text-green-600">Special Rate: ₹10</span>
                  </p>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={handleRequestRide}
                  disabled={!pickup || !drop}
                  className={`w-full h-12 text-lg font-semibold rounded-lg transition-colors ${
                    !pickup || !drop
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#A30303] hover:bg-[#A30303]/90 text-white shadow-lg"
                  }`}
                >
                  Request Auto
                  <span className="ml-2 text-sm font-normal opacity-90">
                    {mode === "pool" ? "Starting at ₹10" : "Starting at ₹40"}
                  </span>
                </button>
                
                <p className="text-xs text-center text-gray-500">
                  Your ride will be assigned within 2-5 minutes. Cancel anytime before driver acceptance.
                </p>
              </div>
            </motion.div>
            
            {/* Current Ride Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Car className="w-6 h-6 text-[#A30303] mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Current Ride</h2>
                </div>
                {activeRide && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#A30303]/10 text-[#A30303]">
                    {activeRide.status === "requested" ? "Looking for auto..." : "On the way"}
                  </span>
                )}
              </div>
              
              {!activeRide ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-[#A30303]/10 flex items-center justify-center mx-auto mb-4">
                    <Car className="w-8 h-8 text-[#A30303]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No active rides</h3>
                  <p className="text-gray-600 mb-6">
                    Book a ride to get started with campus mobility
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Route Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                        <div className="w-3 h-3 rounded-full bg-[#A30303]"></div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-1">From</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            {activeRide.pickup}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">To</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#A30303]" />
                            {activeRide.drop}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Driver Info */}
                  {activeRide.driver && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#A30303]/10 flex items-center justify-center">
                            <span className="text-[#A30303] font-bold">RK</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{activeRide.driver.name}</p>
                            <p className="text-sm text-gray-500">
                              {activeRide.driver.vehicle}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span key={star} className={`text-sm ${
                                    star <= Math.floor(activeRide.driver.rating) 
                                      ? "text-yellow-400" 
                                      : "text-gray-300"
                                  }`}>★</span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {activeRide.driver.rating} ({Math.floor(Math.random() * 200) + 100} rides)
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 text-[#A30303] hover:bg-[#A30303]/10 rounded-lg transition-colors">
                          <Phone className="w-4 h-4" />
                          Call
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* OTP Section */}
                  {activeRide.otp && (
                    <div className="bg-gradient-to-r from-[#A30303]/10 to-[#A30303]/5 border border-[#A30303]/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Shield className="w-5 h-5 text-[#A30303] mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Ride OTP</p>
                            <p className="text-xs text-gray-600">
                              Share with driver to start ride
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleCopyOTP}
                          className="p-2 text-[#A30303] hover:bg-[#A30303]/10 rounded-lg transition-colors"
                        >
                          {otpCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-mono font-bold tracking-widest text-[#A30303]">
                          {activeRide.otp}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#A30303]" />
                        <div>
                          <p className="text-sm text-gray-500">Estimated arrival</p>
                          <p className="font-medium text-gray-900">8 minutes</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Fare: <span className="font-medium">₹{activeRide.fare}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelRide}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel Ride
                      </button>
                      <button
                        onClick={handleCompleteRide}
                        className="px-4 py-2 bg-[#A30303] hover:bg-[#A30303]/90 text-white rounded-lg transition-colors"
                      >
                        Complete Ride
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Right Column - Map & Stats */}
          <div className="space-y-6">
            {/* Live Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg border overflow-hidden"
            >
              {/* Map Header */}
              <div className="p-4 border-b bg-gradient-to-r from-[#A30303]/10 to-[#A30303]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Navigation className="w-5 h-5 text-[#A30303] mr-2" />
                    <h3 className="font-semibold text-gray-900">Thapar University Campus</h3>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Live
                  </span>
                </div>
              </div>
              
              {/* Map Container */}
              <div className="relative h-[400px] bg-gray-100 group">
                {/* OpenStreetMap iframe - Centered on Thapar Library */}
                <iframe
                  title="Thapar University Campus Map"
                  src={mapUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                />
                
                {/* Overlay markers - Conditionally rendered */}
                {showMapMarkers && (
                  <>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        {/* Current location marker - Removed animate-ping */}
                        <div className="absolute -top-8 -left-8">
                          <div className="w-10 h-10 bg-[#A30303] rounded-full flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        
                        {/* Auto markers */}
                        <div className="absolute top-12 -right-4">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <Car className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="absolute -bottom-4 left-8">
                          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Car className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-[#A30303]"></div>
                          <span className="text-gray-700">You</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-gray-700">Available</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-700">Booked</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Recenter button - appears on hover */}
                <button
                  onClick={handleRecenterMap}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  Recenter
                </button>
              </div>
              
              {/* Map Controls */}
              <div className="p-3 border-t bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">Thapar Institute, Patiala</span>
                    <span className="ml-2 text-xs">📍 30.3569° N, 76.3628° E (Library)</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleLocateMe}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-[#A30303] text-white rounded hover:bg-[#A30303]/90"
                    >
                      <LocateFixed className="w-3 h-3" />
                      Locate Me
                    </button>
                    <button 
                      onClick={handleResetMap}
                      className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Your Mobility Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly Rides</span>
                  <span className="font-semibold text-gray-900">{stats.monthlyRides}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pool Success</span>
                  <span className="font-semibold text-green-600">{stats.poolSuccessRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Wait Time</span>
                  <span className="font-semibold text-gray-900">{stats.avgWaitTime}min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Saved</span>
                  <span className="font-semibold text-green-600">₹{stats.moneySaved}</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    You've contributed to reducing ~{stats.co2Saved}kg CO₂ emissions this month
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Ride History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <History className="w-6 h-6 text-[#A30303] mr-3" />
                  <h3 className="font-semibold text-gray-900">Recent Rides</h3>
                </div>
                <span className="text-sm text-gray-500">
                  {rideHistory.length} {rideHistory.length === 1 ? 'ride' : 'rides'}
                </span>
              </div>
              
              {rideHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No ride history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rideHistory.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">
                          {ride.pickup} → {ride.drop}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{ride.createdAt.toLocaleDateString()}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            ride.mode === 'pool' 
                              ? 'bg-[#A30303]/10 text-[#A30303]' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {ride.mode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`text-sm ${
                                star <= ride.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}>★</span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {ride.mode === 'pool' ? 'Pooled with 2 others' : 'Solo ride'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{ride.fare}</p>
                        <button className="mt-2 text-xs text-[#A30303] hover:text-[#A30303]/80">
                          Repeat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-12 border-t bg-white py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex flex-col items-center">
                  <div className="text-[#A30303] font-bold text-xl leading-tight">TIET</div>
                  <div className="text-[10px] text-[#A30303] font-semibold uppercase tracking-wider">
                    Thapar Institute
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Campus Mobility Service</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Thapar Institute of Engineering & Technology
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Eco-friendly E-Rickshaw Pooling with OTP verification and real-time tracking.
                Special student rates starting at ₹10 per ride.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="text-gray-600 hover:text-[#A30303] block">How it works</a>
                <a href="#" className="text-gray-600 hover:text-[#A30303] block">Safety Guidelines</a>
                <a href="#" className="text-gray-600 hover:text-[#A30303] block">Contact Support</a>
                <a href="#" className="text-gray-600 hover:text-[#A30303] block">FAQ</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Safety & Support</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="text-[#A30303]">📞</span>
                  Emergency: +91 1122334455
                </p>
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="text-[#A30303]">📧</span>
                  support@tcms.thapar.edu
                </p>
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="text-[#A30303]">📍</span>
                  Thapar University, Patiala
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>© 2024 Thapar Campus Mobility Service. All rights reserved.</p>
            <p className="mt-1">All rides are OTP verified and GPS tracked for your safety</p>
          </div>
        </div>
      </footer>
    </div>
  );
}