import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, MapPin, Users, CheckCircle, Car, Clock, 
  DollarSign, Navigation, Bell, Shield, Phone, 
  TrendingUp, Calendar, Target, User, X, Check, 
  AlertCircle, RefreshCw, Battery, Zap, LocateFixed
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { getUserData, updateUserProfile } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAppStore();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<"available" | "on_ride" | "offline">("available");
  const [otpInput, setOtpInput] = useState("");
  const [rideStage, setRideStage] = useState<"waiting" | "assigned" | "enroute" | "completed">("waiting");
  const [showNotification, setShowNotification] = useState(true);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    vehicleNumber: "",
    phone: "",
    licenseNumber: "",
  });
  
  // Map state
  const [showMapMarkers, setShowMapMarkers] = useState(true);
  const [mapUrl, setMapUrl] = useState("https://www.openstreetmap.org/export/embed.html?bbox=76.363,30.374,76.365,30.376&layer=mapnik&marker=30.375,76.364");
  
  // Today's stats - updated for ₹40 per ride
  const [todayStats, setTodayStats] = useState({
    rides: 4,
    earnings: 160, // 4 rides × ₹40 = ₹160
    distance: 28,
    rating: 4.7,
    onlineHours: 5.2,
  });
  
  // New ride request - fixed at ₹40 for driver
  const [rideRequest, setRideRequest] = useState<any>({
    id: "req_001",
    studentName: "Rohan Sharma",
    roll: "102303795",
    pickup: "Hostel A Block",
    drop: "CSED Department",
    eta: 3,
    seats: 3, // Can be 1-4 students
    mode: "pool", // pool or solo, doesn't matter for driver fare
    fare: 40, // FIXED: Always ₹40 for driver
  });
  
  // Today's rides history - updated to ₹40 per ride
  const [todayRides, setTodayRides] = useState<any[]>([
    {
      id: "1",
      time: "09:15 AM",
      pickup: "Hostel D Block",
      drop: "Main Academic Block",
      students: 3,
      fare: 40, // Fixed ₹40
      status: "completed",
    },
    {
      id: "2",
      time: "10:45 AM",
      pickup: "Main Gate",
      drop: "Library",
      students: 1,
      fare: 40, // Fixed ₹40 (solo ride)
      status: "completed",
    },
    {
      id: "3",
      time: "12:30 PM",
      pickup: "Girls Hostel Complex",
      drop: "Sports Complex",
      students: 2,
      fare: 40, // Fixed ₹40
      status: "completed",
    },
    {
      id: "4",
      time: "02:15 PM",
      pickup: "Hostel A Block",
      drop: "Jaggi Block",
      students: 4,
      fare: 40, // Fixed ₹40 (full capacity)
      status: "completed",
    },
  ]);

  // Fetch driver data on mount
  useEffect(() => {
    const fetchDriverData = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/auth/driver");
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
            vehicleNumber: userData.vehicleNumber || "",
            phone: userData.phone || "",
            licenseNumber: userData.licenseNumber || "",
          });
          
          // Set driver status from Firestore or default to available
          setStatus(userData.status || "available");
        } else {
          // Driver doesn't exist in Firestore
          const basicUser = {
            uid: user.uid,
            name: "Driver",
            email: user.email || "",
            vehicleNumber: "",
            phone: "",
            licenseNumber: "",
            status: "available" as const,
            role: "driver" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          setCurrentUser(basicUser);
          setProfileData({
            name: "Driver",
            vehicleNumber: "",
            phone: "",
            licenseNumber: "",
          });
          
          // Ask driver to complete profile
          toast.info("Please complete your profile details");
          setIsEditingProfile(true);
        }
      } catch (error) {
        console.error("Error fetching driver data:", error);
        toast.error("Failed to load driver data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriverData();
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

  // Map functions
  const handleResetMap = () => {
    setShowMapMarkers(false);
    setMapUrl("https://www.openstreetmap.org/export/embed.html?bbox=76.363,30.374,76.365,30.376&layer=mapnik");
    toast.info("Map markers cleared");
  };

  const handleLocateMe = () => {
    setShowMapMarkers(true);
    setMapUrl("https://www.openstreetmap.org/export/embed.html?bbox=76.363,30.374,76.365,30.376&layer=mapnik&marker=30.375,76.364");
    toast.success("Location markers restored");
  };

  const handleStatusChange = (newStatus: "available" | "on_ride" | "offline") => {
    setStatus(newStatus);
    
    if (newStatus === "available") {
      toast.success("You are now available for rides");
      // Simulate new ride request when available
      setTimeout(() => {
        setShowNotification(true);
        toast.info("New ride request received!");
      }, 1000);
      // Restore map markers when going available
      handleLocateMe();
    } else if (newStatus === "offline") {
      toast.info("You are now offline");
      setShowNotification(false);
      if (activeRide) {
        toast.warning("Active ride cancelled due to going offline");
        setActiveRide(null);
        setRideStage("waiting");
      }
      // Remove car from map when offline
      handleResetMap();
    } else if (newStatus === "on_ride") {
      // Keep markers when on ride
      handleLocateMe();
    }
  };

  const handleAcceptRide = () => {
    setActiveRide({
      ...rideRequest,
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      driverAssignedAt: new Date(),
    });
    setRideStage("assigned");
    setStatus("on_ride");
    setShowNotification(false);
    
    toast.success("Ride accepted! Head to pickup location. You'll earn ₹40 for this ride.");
  };

  const handleRejectRide = () => {
    setShowNotification(false);
    toast.info("Ride rejected. Looking for next request...");
    
    // Simulate new request after delay with random student count
    setTimeout(() => {
      const randomSeats = Math.floor(Math.random() * 4) + 1;
      setRideRequest({
        id: "req_" + Date.now(),
        studentName: ["Rohan Sharma", "Priya Singh", "Amit Kumar", "Neha Gupta", "Vikram Singh"][Math.floor(Math.random() * 5)],
        roll: "1023" + Math.floor(Math.random() * 10000),
        pickup: ["Hostel A Block", "Hostel B Block", "Main Gate", "Girls Hostel Complex", "PG Hostel"][Math.floor(Math.random() * 5)],
        drop: ["CSED Department", "Library", "Academic Block", "Sports Complex", "Cafeteria"][Math.floor(Math.random() * 5)],
        eta: Math.floor(Math.random() * 5) + 2,
        seats: randomSeats,
        mode: randomSeats === 1 ? "solo" : "pool",
        fare: 40, // Always ₹40
      });
      setShowNotification(true);
      toast.info("New ride request received!");
    }, 3000);
  };

  const handleVerifyOTP = () => {
    if (!otpInput || otpInput.length !== 4) {
      toast.error("Please enter a 4-digit OTP");
      return;
    }
    
    if (activeRide && otpInput === activeRide.otp) {
      setRideStage("enroute");
      toast.success("OTP verified! Ride started.");
    } else {
      toast.error("Invalid OTP. Please try again.");
    }
  };

  const handleStartRide = () => {
    if (rideStage === "assigned") {
      toast.info("Please verify OTP first");
      return;
    }
    
    setRideStage("enroute");
    toast.success("Ride started! Safe driving.");
  };

  const handleEndRide = () => {
    setRideStage("completed");
    
    // Add to today's rides
    const completedRide = {
      id: `ride_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pickup: activeRide.pickup,
      drop: activeRide.drop,
      students: activeRide.seats || 1,
      fare: 40, // Fixed ₹40
      status: "completed",
    };
    
    setTodayRides([completedRide, ...todayRides]);
    
    // Update stats - always add ₹40
    setTodayStats(prev => ({
      ...prev,
      rides: prev.rides + 1,
      earnings: prev.earnings + 40, // Always add ₹40
      distance: prev.distance + 7, // Assuming 7km per ride
    }));
    
    // Reset
    setActiveRide(null);
    setStatus("available");
    setOtpInput("");
    
    toast.success("Ride completed! ₹40 added to your earnings.");
    
    // Simulate new request after delay
    setTimeout(() => {
      const randomSeats = Math.floor(Math.random() * 4) + 1;
      setRideRequest({
        id: "req_" + Date.now(),
        studentName: ["Rohan Sharma", "Priya Singh", "Amit Kumar", "Neha Gupta", "Vikram Singh"][Math.floor(Math.random() * 5)],
        roll: "1023" + Math.floor(Math.random() * 10000),
        pickup: ["Hostel A Block", "Hostel B Block", "Main Gate", "Girls Hostel Complex", "PG Hostel"][Math.floor(Math.random() * 5)],
        drop: ["CSED Department", "Library", "Academic Block", "Sports Complex", "Cafeteria"][Math.floor(Math.random() * 5)],
        eta: Math.floor(Math.random() * 5) + 2,
        seats: randomSeats,
        mode: randomSeats === 1 ? "solo" : "pool",
        fare: 40, // Always ₹40
      });
      setShowNotification(true);
      toast.info("New ride request received!");
    }, 2000);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    try {
      await updateUserProfile(currentUser.uid, {
        name: profileData.name,
        vehicleNumber: profileData.vehicleNumber,
        phone: profileData.phone,
        licenseNumber: profileData.licenseNumber,
        status: status,
      });
      
      // Update local state
      setCurrentUser({
        ...currentUser,
        name: profileData.name,
        vehicleNumber: profileData.vehicleNumber,
        phone: profileData.phone,
        licenseNumber: profileData.licenseNumber,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-700";
      case "on_ride": return "bg-blue-100 text-blue-700";
      case "offline": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getRideStageColor = (stage: string) => {
    switch (stage) {
      case "waiting": return "bg-gray-100 text-gray-700";
      case "assigned": return "bg-yellow-100 text-yellow-700";
      case "enroute": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#A30303] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading driver dashboard...</p>
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
                  <div className="flex flex-col items-center">
                    <div className="text-[#A30303] font-bold text-xl leading-tight">TIET</div>
                    <div className="text-[8px] text-[#A30303] font-semibold uppercase tracking-wider mt-[-2px]">
                      Thapar Institute
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Driver Portal</h1>
                <p className="text-xs text-gray-500">Campus E-Rickshaw Pooling • ₹40 per ride</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
                {showNotification && !activeRide && status === "available" && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A30303] hover:bg-[#A30303]/10 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
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
              <h3 className="text-xl font-semibold text-gray-900">Driver Profile</h3>
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
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={profileData.vehicleNumber}
                  onChange={(e) => setProfileData({...profileData, vehicleNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. PB11-AB-1234"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="+91 98765 43210"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={profileData.licenseNumber}
                  onChange={(e) => setProfileData({...profileData, licenseNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="DL-1234567890123"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateProfile}
                className="flex-1 bg-[#A30303] hover:bg-[#A30303]/90 text-white py-2 rounded-lg font-medium transition-colors"
              >
                <Check className="w-4 h-4 inline mr-2" />
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
                {getGreeting()}, {currentUser?.name || "Driver"}
              </h1>
              <p className="text-gray-600 mt-2">
                {profileData.vehicleNumber || "Vehicle not set"} • Driver ID: {currentUser?.uid?.slice(-6)}
                {profileData.licenseNumber && ` • License: ${profileData.licenseNumber}`}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#A30303]" />
                  <span className="text-sm text-gray-600">
                    Online: {todayStats.onlineHours} hours today
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
            
            {/* Status Toggle */}
            <div className="mt-4 md:mt-0">
              <div className="flex flex-col items-end gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                  {status === "available" && "🟢 Available for rides"}
                  {status === "on_ride" && "🔵 On a ride"}
                  {status === "offline" && "⚫ Offline"}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange("available")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      status === "available"
                        ? "bg-[#A30303] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => handleStatusChange("offline")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      status === "offline"
                        ? "bg-[#A30303] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Offline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Requests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <div className="flex items-center mb-6">
                <TrendingUp className="w-6 h-6 text-[#A30303] mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Today's Earnings</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-50/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Rides Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{todayStats.rides}</p>
                    </div>
                    <Car className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">+2 from yesterday</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">₹{todayStats.earnings}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">₹40 per ride</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-50/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg per Hour</p>
                      <p className="text-2xl font-bold text-gray-900">₹{Math.round(todayStats.earnings / todayStats.onlineHours)}</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500 opacity-50" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">₹{Math.round(todayStats.earnings / todayStats.rides)} per ride</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-50/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{todayStats.rating}</p>
                    </div>
                    <div className="flex">
                      <span className="text-yellow-400">★</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-300">★</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">32 ratings today</p>
                </div>
              </div>
              
              {/* Earnings Breakdown */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Fixed Rate:</span>
                  <span className="font-medium text-gray-900">₹40 per ride</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">Today's Projection:</span>
                  <span className="font-medium text-green-600">₹{Math.round(todayStats.earnings / todayStats.onlineHours * 8)}</span>
                </div>
              </div>
            </motion.div>
            
            {/* New Ride Request / Active Ride */}
            {status === "available" && showNotification && !activeRide ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-blue-50/50 rounded-2xl p-6 shadow-lg border border-blue-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Bell className="w-6 h-6 text-blue-500 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">New Ride Request!</h2>
                      <p className="text-sm text-gray-600">Tap Accept within 30 seconds</p>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    New
                  </span>
                </div>
                
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{rideRequest.studentName}</p>
                          <p className="text-sm text-gray-600">Roll: {rideRequest.roll}</p>
                          <p className="text-xs text-gray-500 mt-1">Fare to student: {rideRequest.seats === 1 ? '₹10 (solo)' : `₹${rideRequest.seats * 8} (${rideRequest.seats} seat pool)`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Seats needed</div>
                        <div className="text-xl font-bold text-gray-900">{rideRequest.seats}/4</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Route Info */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                        <div className="w-3 h-3 rounded-full bg-[#A30303]"></div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-1">Pickup</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            {rideRequest.pickup}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Drop</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#A30303]" />
                            {rideRequest.drop}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ride Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-sm text-gray-600">ETA to Pickup</div>
                      <div className="text-lg font-bold text-gray-900">{rideRequest.eta} min</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-sm text-gray-600">Ride Type</div>
                      <div className="text-lg font-bold text-gray-900">{rideRequest.mode}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-sm text-gray-600">Your Earnings</div>
                      <div className="text-lg font-bold text-green-600">₹40</div>
                    </div>
                  </div>
                  
                  {/* Fixed Rate Notice */}
                  <div className="bg-gradient-to-r from-green-50 to-green-50/50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">Fixed Driver Rate</span>
                      </div>
                      <span className="text-sm text-gray-600">₹40 per ride</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      You earn ₹40 regardless of passengers (1-4 students)
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleRejectRide}
                      className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Reject Ride
                    </button>
                    <button
                      onClick={handleAcceptRide}
                      className="flex-1 bg-[#A30303] hover:bg-[#A30303]/90 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Accept Ride • ₹40
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : activeRide ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-green-50 to-green-50/50 rounded-2xl p-6 shadow-lg border border-green-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Car className="w-6 h-6 text-green-500 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Active Ride</h2>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRideStageColor(rideStage)}`}>
                    {rideStage.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-6">
                  {/* Route Info */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                        <div className="w-3 h-3 rounded-full bg-[#A30303]"></div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-1">Pickup</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            {activeRide.pickup}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Drop</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#A30303]" />
                            {activeRide.drop}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Passenger Info */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-[#A30303] mr-2" />
                        <h3 className="font-medium text-gray-900">Passenger Details</h3>
                      </div>
                      <span className="text-sm text-gray-600">{activeRide.seats || 1} passenger(s)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#A30303]/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-[#A30303]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activeRide.studentName}</p>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">+91 ••••• •••••</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Earnings Card */}
                  <div className="bg-gradient-to-r from-green-50 to-green-50/50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-green-500 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">This Ride: ₹40</p>
                          <p className="text-xs text-gray-600">Fixed rate for 1-4 passengers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">₹40</div>
                        <div className="text-xs text-gray-500">Driver earnings</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* OTP Verification */}
                  {rideStage === "assigned" && (
                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-50/50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Shield className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Verify OTP</p>
                            <p className="text-xs text-gray-600">Ask passenger for OTP to start ride</p>
                          </div>
                        </div>
                        <div className="text-sm font-mono font-bold text-gray-900">
                          {activeRide.otp}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Enter 4-digit OTP"
                          maxLength={4}
                          className="flex-1 p-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest"
                        />
                        <button
                          onClick={handleVerifyOTP}
                          className="px-6 bg-[#A30303] hover:bg-[#A30303]/90 text-white rounded-lg font-medium"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {rideStage === "enroute" && (
                    <div className="bg-gradient-to-r from-green-50 to-green-50/50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">OTP Verified</p>
                            <p className="text-xs text-gray-600">Ride in progress</p>
                          </div>
                        </div>
                        <div className="text-sm font-mono font-bold text-gray-900">
                          ✓ Verified
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Ride Controls */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex gap-3">
                      {rideStage === "assigned" && (
                        <button
                          onClick={handleStartRide}
                          className="flex-1 bg-[#A30303] hover:bg-[#A30303]/90 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                          Start Ride
                        </button>
                      )}
                      {rideStage === "enroute" && (
                        <button
                          onClick={handleEndRide}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                          Complete Ride • Earn ₹40
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveRide(null);
                          setRideStage("waiting");
                          setStatus("available");
                          toast.info("Ride cancelled");
                        }}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel Ride
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#A30303]/10 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-[#A30303]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {status === "available" ? "Waiting for rides" : "Currently offline"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {status === "available" 
                    ? "You'll be notified when a new ride request arrives"
                    : "Go online to start receiving ride requests"}
                </p>
                <div className="bg-gradient-to-r from-green-50 to-green-50/50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-900">Fixed Rate: ₹40 per ride</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Earn ₹40 for every ride (1-4 students)</p>
                </div>
              </motion.div>
            )}
            
            {/* Today's Rides */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-[#A30303] mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Today's Rides</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {todayRides.length} rides • ₹{todayStats.earnings}
                </span>
              </div>
              
              {todayRides.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No rides completed today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayRides.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">{ride.time}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            ride.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {ride.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mt-1">
                          {ride.pickup} → {ride.drop}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{ride.students} passenger(s)</span>
                          <span>Fixed rate</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">₹{ride.fare}</div>
                        <div className="text-xs text-gray-500">{ride.students} seat(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Right Column - Map & Quick Stats */}
          <div className="space-y-6">
            {/* Live Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg border overflow-hidden"
            >
              <div className="p-4 border-b bg-gradient-to-r from-[#A30303]/10 to-[#A30303]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Navigation className="w-5 h-5 text-[#A30303] mr-2" />
                    <h3 className="font-semibold text-gray-900">Live Campus Map</h3>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Live
                  </span>
                </div>
              </div>
              
              <div className="relative h-[400px] bg-gray-100">
                {/* OpenStreetMap iframe - Thapar University */}
                <iframe
                  title="Thapar University Campus Map"
                  src={mapUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                />
                
                {/* Driver Location Marker - No beeping effect */}
                {showMapMarkers && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#A30303] rounded-full flex items-center justify-center">
                        <Car className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Legend */}
                {showMapMarkers && (
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-[#A30303]"></div>
                        <span className="text-gray-700">You</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Pickup</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-700">Drop</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Map Controls */}
              <div className="p-3 border-t bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">Thapar Institute, Patiala</span>
                    <span className="ml-2 text-xs">📍 30.3750° N, 76.3640° E</span>
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
            
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Fixed Rate System</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Per Ride Rate</span>
                  <span className="font-semibold text-green-600">₹40</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg per Hour</span>
                  <span className="font-semibold text-gray-900">₹{Math.round(todayStats.earnings / todayStats.onlineHours)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ride Acceptance</span>
                  <span className="font-semibold text-green-600">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Rating</span>
                  <span className="font-semibold text-gray-900">{todayStats.rating}/5.0</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Battery Level</div>
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-900">78%</span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Tips & Alerts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-yellow-50 to-yellow-50/50 rounded-2xl p-6 border border-yellow-200"
            >
              <div className="flex items-center mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="font-semibold text-yellow-700">Fixed Rate System</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Fixed ₹40 per ride (1-4 passengers)
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Maximum 4 students per ride
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Always verify OTP before starting
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <div className="bg-white/50 rounded-lg p-2">
                  <p className="text-xs text-center text-gray-700">
                    💡 Tip: Complete 5+ rides daily for ₹200+ earnings
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-12 border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>Thapar Campus Mobility Service • Driver Portal</p>
          <p className="mt-1">Fixed Rate System: ₹40 per ride • For support: driver-support@tcms.thapar.edu</p>
        </div>
      </footer>
    </div>
  );
}