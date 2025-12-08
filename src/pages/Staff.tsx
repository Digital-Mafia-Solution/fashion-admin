import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { UserPlus, Shield, Loader2, KeyRound } from "lucide-react"; // Added Loader2
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  avatar_url: string | null;
  assigned_location_id?: string;
  locations?: { name: string };
}

export default function Staff() {
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  // Added 'creating' state for the button spinner
  const [creating, setCreating] = useState(false);
  
  const [newStaff, setNewStaff] = useState({ 
    email: "", 
    password: "", 
    fullName: "", 
    role: "manager", 
    location_id: "" 
  });

  const fetchData = async () => {
    // 1. Fetch Staff
    const { data: staffData } = await supabase
      .from("profiles")
      .select("*, locations(name)")
      .in('role', ['admin', 'manager', 'driver']);
    
    // 2. Fetch Locations
    const { data: locData } = await supabase.from("locations").select("id, name");

    if (staffData) setStaff(staffData as unknown as StaffMember[]);
    if (locData) setLocations(locData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreating(true);
    try {
      // CALL THE EDGE FUNCTION
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: newStaff
      });

      if (error) throw error; // Network/Edge error
      if (data?.error) throw new Error(data.error); // Application error from function

      toast.success("Staff account created successfully");
      setIsAddOpen(false);
      setNewStaff({ email: "", password: "", fullName: "", role: "manager", location_id: "" });
      
      // Refresh list
      fetchData();

    } catch (error: unknown) {
      console.error(error);
      // FIX: Handle error safely without 'any'
      let errorMessage = "Failed to create user";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    // Generate a simple temp password (or prompt for one)
    const tempPassword = "TempPassword123!"; 
    
    if(!confirm(`Reset this user's password to: ${tempPassword}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { userId, newPassword: tempPassword }
      });
      if (error || data.error) throw new Error(data?.error || error.message);
      
      toast.success("Password reset. User will be prompted to change it on login.");
    } catch (error: unknown) {
      let errorMessage = "Failed to reset password";
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      toast.error(errorMessage);
    }
  };

  if (!isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
            <Shield className="h-12 w-12 mb-4 text-orange-500" />
            <h2 className="text-xl font-bold">Access Restricted</h2>
            <p>Only Super Admins can manage staff.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
        <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add Staff
        </Button>
      </div>
      
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Assigned Store</TableHead><TableHead>Contact</TableHead><TableHead>Reset Password</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarImage src={s.avatar_url || ""} /><AvatarFallback>{s.full_name?.[0]}</AvatarFallback></Avatar>
                  {s.full_name}
                </TableCell>
                <TableCell>
                    <Badge variant={s.role === 'admin' ? 'default' : 'outline'} className="uppercase text-[10px]">
                        {s.role}
                    </Badge>
                </TableCell>
                <TableCell>{s.locations?.name || "Global / All"}</TableCell>
                <TableCell className="font-mono text-xs">{s.email}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleResetPassword(s.id)}>
                    <KeyRound className="w-4 h-4 mr-2" /> Reset
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>Create an account for a Store Manager or Driver.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Temporary Password</Label>
                    <Input type="password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select onValueChange={v => setNewStaff({...newStaff, role: v})}>
                            <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manager">Store Manager</SelectItem>
                                <SelectItem value="driver">Driver</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Assigned Location</Label>
                        <Select onValueChange={v => setNewStaff({...newStaff, location_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Select Store" /></SelectTrigger>
                            <SelectContent>
                                {locations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleAddStaff} disabled={creating}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}