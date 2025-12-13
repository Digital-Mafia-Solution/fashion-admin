import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Database } from "../lib/database.types";
import { useUpdatingSet } from "../hooks/use-updating-set";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  CheckCircle2,
  MapPin,
  Truck,
  Shield,
  Loader2,
  RefreshCw,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import EmptyState from "../components/EmptyState";

// Interfaces
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

type Task = OrderRow & {
  profiles?: ProfileRow | null;
  locations?: Pick<LocationRow, "name" | "address"> | null;
  order_items?: (OrderItemRow & { products?: { name?: string } | null })[];
};

export default function Logistics() {
  const { isAdmin, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    add: addUpdatingId,
    remove: removeUpdatingId,
    has: hasUpdatingId,
  } = useUpdatingSet();

  const isDriver = profile?.role === "driver";
  const hasAccess = isAdmin || isDriver;

  async function loadLogistics() {
    setLoading(true);
    try {
      // 1. Fetch potential tasks (Packed or Transit)
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            id, status, fulfillment_type, delivery_address,
            profiles:profiles!orders_customer_id_fkey (full_name, first_name, last_name, phone, email),
            locations(name, address),
            order_items(
                quantity,
                products(name)
            )
        `
        )
        .neq("status", "pos_complete")
        .in("status", ["packed", "transit"]) // Fetch broader set, filter below
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        const allTasks = data as unknown as Task[];

        // 2. Strict Filtering Logic
        const visibleTasks = allTasks.filter((task) => {
          // Rule 1: Delivery orders must be 'transit' (Dispatched)
          if (task.fulfillment_type === "courier") {
            return task.status === "transit";
          }

          // Rule 2: Pickup orders must be 'packed' (Ready to move to store)
          if (task.fulfillment_type === "pickup") {
            return task.status === "packed";
          }

          return false;
        });

        setTasks(visibleTasks);
      }
    } catch (error) {
      console.error("Error loading logistics:", error);
      toast.error("Failed to load run sheet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    loadLogistics();

    const channel = supabase
      .channel("logistics-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadLogistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasAccess]);

  const getCustomerName = (p: Task["profiles"]) => {
    if (!p) return "Guest";
    if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
    return p.full_name || "Unknown";
  };

  const handleCompleteTask = async (task: Task) => {
    // Logic:
    // Pickup (Packed) -> Driver drops at store -> Ready
    // Courier (Transit) -> Driver drops at customer -> Delivered
    const newStatus =
      task.fulfillment_type === "pickup" ? "ready" : "delivered";
    addUpdatingId(task.id);

    const previousTasks = tasks;

    // Optimistically remove the task from the list
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) {
        // revert
        setTasks(previousTasks);
        toast.error("Failed to update status");
        console.error("Failed to update logistics task:", error);
      } else {
        const msg =
          newStatus === "ready"
            ? "Dropped at store (Ready)"
            : "Delivered to customer";
        toast.success(msg);
      }
    } catch (err) {
      setTasks(previousTasks);
      toast.error("Failed to update status");
      console.error("Unexpected error updating logistics task:", err);
    } finally {
      removeUpdatingId(task.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10 md:static">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">
            Logistics
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isDriver ? `Driver: ${profile?.full_name}` : "Global Operations"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => loadLogistics()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Badge variant="default" className="h-fit">
            {tasks.length} Active
          </Badge>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-12 w-12 opacity-20" />}
          title="You're all caught up"
          description="No active tasks."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="overflow-hidden border-l-4 border-l-blue-500 flex flex-col h-full shadow-sm"
            >
              <CardContent className="p-4 flex-1 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-sm font-bold text-muted-foreground">
                      #{task.id.slice(0, 6)}
                    </div>
                    <h3 className="font-bold text-lg">
                      {getCustomerName(task.profiles)}
                    </h3>
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px]">
                    {task.status}
                  </Badge>
                </div>

                {/* Address */}
                <div className="bg-muted/30 p-3 rounded-md border border-border/50">
                  <div className="flex items-start gap-3">
                    {task.fulfillment_type === "pickup" ? (
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                    ) : (
                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                        <Truck className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-semibold block text-xs text-muted-foreground uppercase tracking-wide">
                        {task.fulfillment_type === "pickup"
                          ? "Store Pickup"
                          : "Delivery"}
                      </span>
                      <span className="text-sm leading-tight">
                        {task.fulfillment_type === "pickup"
                          ? task.locations?.name
                          : task.delivery_address}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                {(task.profiles?.phone || task.profiles?.email) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <Phone className="h-3 w-3" />
                    <span>{task.profiles.phone || task.profiles.email}</span>
                  </div>
                )}

                {/* Items */}
                <div className="pt-2 border-t border-dashed">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Items ({task.order_items?.length ?? 0})
                  </div>
                  <ul className="text-sm space-y-1">
                    {(task.order_items ?? []).map((item, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="truncate pr-2">
                          {item.products?.name}
                        </span>
                        <span className="font-mono text-xs font-bold bg-muted px-1.5 rounded">
                          x{item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t bg-muted/10">
                <Button
                  className="w-full rounded-t-none h-12 gap-2 text-base"
                  onClick={() => handleCompleteTask(task)}
                  disabled={hasUpdatingId(task.id)}
                >
                  {hasUpdatingId(task.id) ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {task.fulfillment_type === "pickup"
                    ? "Dropped at Store"
                    : "Delivered"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
