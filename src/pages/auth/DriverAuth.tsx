import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export default function DriverAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      if (email && password) {
        setCurrentUser({ role: 'driver', id: 'd1' });
        toast.success('Logged in successfully!');
        navigate('/driver');
      } else toast.error('Please fill all fields');
    } else {
      if (email && password && name && plate) {
        setCurrentUser({ role: 'driver', id: 'd1' });
        toast.success('Account created successfully!');
        navigate('/driver');
      } else toast.error('Please fill all fields');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#DCD6D6]
 p-4">

      {/* Back Button */}
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

          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-[#AA0000]/15 text-4xl">
              🚗
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Driver Portal
          </h1>
          <p className="text-center text-gray-600 mb-6">
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
                    className="border-red-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input
                    type="text"
                    placeholder="PB11-ER-4101"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="border-red-200"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="driver@thapar.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-red-200"
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-red-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#AA0000] hover:bg-[#8A0000] text-white font-semibold py-3 rounded-xl"
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-700 hover:text-[#AA0000] transition"
            >
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <span className="ml-1 font-semibold text-[#AA0000]">
                {isLogin ? "Sign Up" : "Sign In"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
