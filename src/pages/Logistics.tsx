import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { CheckCircle2, MapPin, Truck, Box, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Interfaces
interface OrderItem {
  quantity: number;
  products: {
    name: string;
  } | null;
}

interface Task {
  id: string;
  status: string;
  fulfillment_type: string;
  delivery_address: string | null;
  profiles: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  locations: {
    name: string;
    address: string | null;
  } | null;
  order_items: OrderItem[];
}

export default function Logistics() {
  const { isAdmin, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if the user is a driver
  const isDriver = profile?.role === 'driver';
  // Allow access if Admin OR Driver
  const hasAccess = isAdmin || isDriver;

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    async function loadLogistics() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
              id, status, fulfillment_type, delivery_address,
              profiles(full_name, first_name, last_name, phone, email),
              locations(name, address),
              order_items(
                  quantity,
                  products(name)
              )
          `)
          // Fetch orders that are ready for action (paid, packed, or already moving)
          .in('status', ['paid', 'packed', 'transit', 'ready'])
          .order('created_at', { ascending: true }); // Oldest first (FIFO)

        if (error) throw error;

        if (data) {
          setTasks(data as unknown as Task[]);
        }
      } catch (error) {
        console.error("Error loading logistics:", error);
        toast.error("Failed to load run sheet");
      } finally {
        setLoading(false);
      }
    }

    loadLogistics();
    
    // Realtime subscription for new tasks
    const channel = supabase.channel('logistics-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadLogistics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hasAccess]);

  const getCustomerName = (p: Task['profiles']) => {
    if (!p) return "Guest";
    if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
    return p.full_name || "Unknown";
  };

  const handleCompleteTask = async (taskId: string) => {
    // Determine next status based on current state (simplified logic)
    // Real logic would be: Picked Up -> In Transit -> Delivered
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', taskId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Task marked as complete");
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  // Access Denied View
  if (!hasAccess) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
            <Shield className="h-12 w-12 mb-4 text-orange-500" />
            <h2 className="text-xl font-bold">Access Restricted</h2>
            <p>Logistics runs are accessible to Drivers and Head Office only.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logistics Run Sheet</h1>
          <p className="text-muted-foreground">
            {isDriver ? `Driver: ${profile?.full_name}` : "Global Operations View"}
          </p>
        </div>
        <Badge variant="outline" className="h-fit">
          {tasks.length} Active Tasks
        </Badge>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-center py-20 border rounded-lg bg-card text-muted-foreground">
          No active logistics tasks found.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row border-l-4 border-blue-500">
                  {/* Left: Status & ID */}
                  <div className="bg-muted/10 p-4 w-full md:w-48 flex flex-col justify-center border-b md:border-b-0 md:border-r">
                      <div className="font-mono font-bold text-lg">#{task.id.slice(0,6)}</div>
                      <Badge variant="secondary" className="w-fit mt-2 uppercase text-[10px]">
                        {task.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-2 font-medium">
                        {getCustomerName(task.profiles)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.profiles?.phone || task.profiles?.email}
                      </div>
                  </div>

                  {/* Middle: The Route */}
                  <div className="p-4 flex-1 space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <Box className="h-4 w-4" />
                              {/* In a real app, you'd fetch the source store name from order_items or inventory */}
                              <span>Pickup: <strong>Check Inventory Source</strong></span> 
                          </div>
                          <div className="flex-1 border-b border-dashed border-muted-foreground/30"></div>
                          <div className="flex items-center gap-2">
                              {task.fulfillment_type === 'pickup' ? (
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <StoreIcon className="h-4 w-4"/>
                                    <span className="font-bold">Drop at: {task.locations?.name}</span>
                                  </div>
                              ) : (
                                  <div className="flex items-center gap-2 text-orange-600">
                                    <TruckIcon className="h-4 w-4"/>
                                    <span className="font-bold">Deliver to: {task.delivery_address}</span>
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <div className="bg-muted/30 p-3 rounded-md text-sm">
                          <div className="font-medium mb-1 text-xs uppercase tracking-wider text-muted-foreground">Manifest</div>
                          <ul className="list-disc pl-4 text-muted-foreground">
                              {task.order_items.map((item, i) => (
                                  <li key={i}>
                                    <span className="font-medium text-foreground">{item.quantity}x</span> {item.products?.name}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="p-4 flex items-center justify-end bg-muted/5 gap-2">
                      <button 
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-green-600 transition-colors p-2"
                      >
                          <CheckCircle2 className="h-8 w-8" />
                          <span>Complete</span>
                      </button>
                  </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper icons with typed props
const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => <Truck {...props} />;
const StoreIcon = (props: React.SVGProps<SVGSVGElement>) => <MapPin {...props} />;