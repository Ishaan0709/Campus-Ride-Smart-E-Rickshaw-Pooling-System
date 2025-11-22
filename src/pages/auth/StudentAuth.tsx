import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export default function StudentAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");

  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      if (email && password) {
        setCurrentUser({ role: "student", id: "s1" });
        toast.success("Logged in!");
        navigate("/student");
      } else toast.error("Fill all fields");
    } else {
      if (email && password && name && roll) {
        setCurrentUser({ role: "student", id: "s1" });
        toast.success("Account created!");
        navigate("/student");
      } else toast.error("Fill all fields");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#1E1B1B] text-white">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#2A1414] border border-[#8A0000]/30 rounded-2xl p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 rounded-xl bg-[#2A1414] border border-[#8A0000]/40">
            <GraduationCap className="w-10 h-10 text-[#8A0000]" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center">Student Portal</h1>
        <p className="text-center text-white/70 mt-1 mb-6">
          {isLogin ? "Sign in to book rides" : "Create your student account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#2A1414] border border-[#8A0000]/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Roll Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. 102303795"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  className="bg-[#2A1414] border border-[#8A0000]/30 text-white"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="your.email@thapar.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#2A1414] border border-[#8A0000]/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#2A1414] border border-[#8A0000]/30 text-white"
            />
          </div>

          <Button className="w-full bg-[#8A0000] hover:bg-[#700000] text-white rounded-full py-2">
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-white/70 hover:text-[#8A0000]"
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
