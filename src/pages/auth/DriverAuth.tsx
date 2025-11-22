import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Car, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export default function DriverAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");

  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      if (email && password) {
        setCurrentUser({ role: "driver", id: "d1" });
        toast.success("Logged in successfully!");
        navigate("/driver");
      } else toast.error("Please fill all fields");
    } else {
      if (email && password && name && plate) {
        setCurrentUser({ role: "driver", id: "d1" });
        toast.success("Account created!");
        navigate("/driver");
      } else toast.error("Please fill all fields");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-gray-200">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#FFD5D5] p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 rounded-xl bg-[#FCE8E8]">
            <Car className="w-10 h-10 text-[#8A0000]" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900">
          Driver Portal
        </h1>
        <p className="text-center text-gray-600 mt-1 mb-8">
          {isLogin ? "Sign in to start driving" : "Create your driver account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-gray-300 focus:border-[#8A0000]"
                />
              </div>

              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  type="text"
                  placeholder="PB10-ER-1234"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="border-gray-300 focus:border-[#8A0000]"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-gray-300 focus:border-[#8A0000]"
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-gray-300 focus:border-[#8A0000]"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#8A0000] hover:bg-[#750000] text-white rounded-full py-2 text-lg font-semibold"
          >
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-600 hover:text-[#8A0000]"
          >
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span className="font-semibold text-[#8A0000] ml-1">
              {isLogin ? "Sign Up" : "Sign In"}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
