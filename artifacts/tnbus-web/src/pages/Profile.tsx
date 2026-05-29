import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPassenger, useUpdatePassenger, getGetPassengerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export default function Profile() {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();
  const passengerId = user?.id ?? 0;
  const { data: passenger, isLoading } = useGetPassenger(passengerId);
  const updatePassenger = useUpdatePassenger();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (passenger) {
      setName(passenger.name);
      setEmail(passenger.email);
      setPhone(passenger.phone);
    }
  }, [passenger]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePassenger.mutateAsync({ id: passengerId, data: { name, email, phone } });
    queryClient.invalidateQueries({ queryKey: getGetPassengerQueryKey(passengerId) });
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      {isLoading ? <Skeleton className="h-64 rounded-2xl" /> : passenger && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-2xl font-bold text-white">
              {passenger.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-lg">{passenger.name}</p>
              <p className="text-sm text-muted-foreground">Member since {new Date(passenger.createdAt).getFullYear()}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={name} onChange={e => setName(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-sm text-muted-foreground">
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-xs mb-0.5">Wallet Balance</p>
                <p className="font-semibold text-foreground">₹{Number(passenger.walletBalance).toFixed(2)}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-xs mb-0.5">Reward Points</p>
                <p className="font-semibold text-foreground">{passenger.rewardPoints}</p>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary" disabled={updatePassenger.isPending}>
              {saved ? "Saved!" : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
