import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Store, ShieldAlert } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStoreLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!profile || !['manager', 'admin', 'driver'].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error("Access denied: Not authorized for this portal");
      }

      toast.success("Welcome back!");
      navigate("/");
    } catch (error: unknown) {
      let errorMessage = "Failed to login";
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuperLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@digital-mafia.co.za",
        password: secretKey,
      });

      if (error) throw new Error("Invalid Secret Key");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== 'admin') {
         throw new Error("Key is valid but account permissions are missing");
      }

      toast.success("Welcome, Super Admin");
      navigate("/");
    } catch (error: unknown) {
      let errorMessage = "Failed to login";
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
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Command Center</CardTitle>
          <CardDescription>Restricted Access Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="store" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="store">Store Admin</TabsTrigger>
              <TabsTrigger value="super">Super Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="store">
              <form onSubmit={handleStoreLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    placeholder="manager@menlyn.co.za" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="super">
              <form onSubmit={handleSuperLogin} className="space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex gap-3 items-start">
                    <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-xs text-red-600 leading-tight">
                        This area is restricted to Digital Mafia executive staff. All access attempts are logged.
                    </p>
                </div>
                <div className="space-y-2">
                  <Label>Master Key</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter your issued key..." 
                    value={secretKey}
                    onChange={e => setSecretKey(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
                <Button variant="destructive" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Authenticate
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}