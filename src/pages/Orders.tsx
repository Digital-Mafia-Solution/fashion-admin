import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Truck, Store, User, PackageCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Interfaces
interface Profile { 
  full_name: string | null; 
  first_name: string | null; 
  last_name: string | null;
  email: string | null; 
  phone: string | null; 
}
interface OrderItem { quantity: number; products: { name: string; } | null; }
interface Order {
  id: string; created_at: string; status: string; total_amount: number; fulfillment_type: string; delivery_address: string | null;
  locations: { name: string; } | null; profiles: Profile | null; order_items: OrderItem[]; pickup_location_id: string | null;
}

export default function Orders() {
  const { profile, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX: Moved fetchOrders inside useEffect to avoid memoization errors
  useEffect(() => {
    const fetchOrders = async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          profiles (full_name, first_name, last_name, email, phone),
          locations (name),
          order_items (
              quantity,
              products (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin && profile?.assigned_location_id) {
         query = query.eq('fulfillment_type', 'pickup')
                      .eq('pickup_location_id', profile.assigned_location_id);
      }
        
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching orders:", error);
      } else if (data) {
        setOrders(data as unknown as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
         toast.info("Order list updated");
         fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, profile]); // Simple dependencies

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) toast.success(`Order marked as ${status}`);
    else toast.error("Failed to update status");
  };

  // Helper to format name
  const getCustomerName = (p: Profile | null) => {
    if (!p) return "Guest User";
    if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
    return p.full_name || "Unknown";
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <Card key={order.id} className="flex flex-col border-l-4 border-l-primary">
            <CardHeader className="pb-3 bg-muted/10">
              <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-base font-bold">#{order.id.slice(0, 8)}</CardTitle>
                    <CardDescription>{format(new Date(order.created_at), "MMM dd, HH:mm")}</CardDescription>
                </div>
                <Badge className={
                    order.status === 'paid' ? 'bg-green-600' : 
                    order.status === 'pending' ? 'bg-orange-500' : 'bg-secondary'
                }>
                    {order.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 space-y-4 pt-4">
              <div className="flex items-start gap-3 text-sm p-2 rounded bg-muted/40 border">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                    <div className="font-medium">{getCustomerName(order.profiles)}</div>
                    <div className="text-xs text-muted-foreground">{order.profiles?.phone || order.profiles?.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                {order.fulfillment_type === 'pickup' ? (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900">
                    <Store className="h-4 w-4" />
                    <span className="font-medium">Collect: {order.locations?.name}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-100 dark:border-orange-900">
                    <Truck className="h-4 w-4 mt-0.5" />
                    <div className="break-all">
                        <span className="font-medium block">Delivery to:</span>
                        <span className="opacity-90">{order.delivery_address}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-sm">
                  <div className="font-medium mb-1 text-xs uppercase tracking-wider text-muted-foreground">Items</div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {/* FIX: Replaced 'any' with OrderItem type */}
                      {order.order_items?.map((item: OrderItem, i: number) => (
                          <li key={i}>
                             <span className="text-foreground font-medium">{item.products?.name}</span> 
                             <span className="opacity-70 ml-1">(x{item.quantity})</span>
                          </li>
                      ))}
                  </ul>
              </div>
            </CardContent>
            
            <CardFooter className="pt-4 border-t bg-muted/10">
                {order.status !== 'ready' && order.status !== 'delivered' && (
                    <Button className="w-full gap-2" onClick={() => updateStatus(order.id, 'ready')}>
                        <PackageCheck className="h-4 w-4" /> Mark as Ready
                    </Button>
                )}
                {order.status === 'ready' && (
                    <Button variant="outline" className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50" disabled>
                        <CheckIcon className="h-4 w-4" /> Ready for Collection
                    </Button>
                )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Helper icon component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CheckIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
}