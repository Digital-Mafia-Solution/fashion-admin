import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onSuccess: () => void;
}

export function ForcePasswordChange({ open, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      // 1. Update Auth Password
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      // 2. Clear the Flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);
        if (dbError) throw dbError;
      }

      toast.success("Password updated successfully");
      onSuccess();
    } catch (error: unknown) {
      let errorMessage = "Failed to update password";
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Security Update Required</DialogTitle>
          <DialogDescription>
            You must set a new password before continuing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter new secure password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}