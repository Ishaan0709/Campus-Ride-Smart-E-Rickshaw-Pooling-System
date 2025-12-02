import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check credentials
    if (email === "Thapar_admin123@gmail.com" && password === "Admin1234") {
      setCurrentUser({ role: "admin", id: "a1" });
      toast.success("Admin login successful! Redirecting to dashboard...", {
        duration: 2000,
        position: "top-right",
      });
      setTimeout(() => {
        navigate("/admin");
      }, 1000);
    } else {
      if (!email || !password) {
        toast.error("Please enter both email and password", {
          duration: 3000,
          position: "top-right",
        });
      } else if (email !== "Thapar_admin123@gmail.com") {
        toast.error("Invalid admin email address", {
          duration: 3000,
          position: "top-right",
        });
      } else {
        toast.error("Incorrect password. Please try again", {
          duration: 3000,
          position: "top-right",
        });
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E6DADA] p-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-gray-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl p-8 bg-white shadow-2xl border border-red-200">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-[#AA0000]/15 text-4xl">
              🧑🏻‍💼
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Admin Portal
          </h1>

          <p className="text-center text-gray-600 mb-6">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Thapar_admin123@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-red-200"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Admin1234"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-red-200"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#AA0000] hover:bg-[#8A0000] text-white font-semibold py-3 rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p className="mb-1">
                <span className="font-medium">Email:</span> Thapar_admin123@gmail.com
              </p>
              <p>
                <span className="font-medium">Password:</span> Admin1234
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}