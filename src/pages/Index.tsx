import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Activity,
  Store,
  Clock,
  User,
  Truck,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  profiles: { full_name: string } | null;
  cashier: { full_name: string } | null;
  locations: { name: string } | null;
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false); // Added loading state for visual feedback

  const [stats, setStats] = useState({
    metric1: 0,
    metric2: 0,
    metric3: 0,
    metric4: 0,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const isDriver = profile?.role === "driver";
  const isManager = profile?.role === "manager";

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // DEFINITIONS
      const revenueStatuses = [
        "paid",
        "packed",
        "transit",
        "ready",
        "delivered",
        "collected",
        "pos_complete",
      ];
      const activeStatuses = ["paid", "packed", "transit", "ready"];

      // --- 1. DEFINE QUERIES ---
      let q1 = supabase
        .from("orders")
        .select("total_amount")
        .in("status", revenueStatuses);
      let q2 = supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", activeStatuses);
      let q3 = supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      let q4 = supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      let logsQuery = supabase
        .from("orders")
        .select(
          `
          id, created_at, status, total_amount,
          profiles:profiles!orders_customer_id_fkey(full_name),
          cashier:profiles!orders_cashier_id_fkey(full_name),
          locations(name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(15);

      // --- 2. APPLY ROLE FILTERS ---
      let activeCount = 0;

      if (isDriver) {
        // DRIVER STATS
        const activeTasksQuery = await supabase
          .from("orders")
          .select("status, fulfillment_type")
          .in("status", ["packed", "transit"]);

        q2 = supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "delivered");
        q3 = supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "ready");
        q4 = supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .neq("status", "pos_complete");
        logsQuery = logsQuery.in("status", [
          "ready",
          "transit",
          "delivered",
          "packed",
        ]);

        const activeTasksData = activeTasksQuery.data || [];
        activeCount = activeTasksData.filter(
          (t) =>
            (t.status === "transit" && t.fulfillment_type === "courier") ||
            (t.status === "packed" && t.fulfillment_type === "pickup")
        ).length;
      } else if (isManager && profile?.assigned_location_id) {
        // MANAGER STATS
        const storeId = profile.assigned_location_id;
        q1 = q1.eq("pickup_location_id", storeId);
        q2 = q2.eq("pickup_location_id", storeId);
        q3 = supabase
          .from("inventory")
          .select("*", { count: "exact", head: true })
          .eq("location_id", storeId)
          .gt("quantity", 0);
        q4 = q4.eq("pickup_location_id", storeId);
        logsQuery = logsQuery.eq("pickup_location_id", storeId);
      }

      // --- 3. EXECUTE ---
      const [r1, r2, r3, r4, rLogs] = await Promise.all([
        isDriver
          ? Promise.resolve({ data: [], count: activeCount, error: null })
          : q1,
        q2,
        q3,
        q4,
        logsQuery,
      ]);

      let val1 = 0;
      if (isDriver) {
        val1 = activeCount;
      } else {
        val1 =
          r1.data?.reduce(
            (sum: number, order: { total_amount: number }) =>
              sum + order.total_amount,
            0
          ) || 0;
      }

      setStats({
        metric1: val1,
        metric2: r2.count || 0,
        metric3: r3.count || 0,
        metric4: r4.count || 0,
      });

      if (rLogs.data) setActivities(rLogs.data as unknown as ActivityLog[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh dashboard");
    } finally {
      setLoading(false);
    }
  }, [isDriver, isManager, profile?.assigned_location_id]);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel("dashboard-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStats]);

  const kpiConfig = {
    card1: {
      label: isDriver
        ? "Active Tasks"
        : isAdmin
        ? "Total Revenue"
        : "Store Revenue",
      icon: isDriver ? Truck : DollarSign,
      value: isDriver ? stats.metric1 : `R ${stats.metric1.toFixed(2)}`,
      sub: isDriver ? "Tasks requiring action" : "Paid & Completed Orders",
    },
    card2: {
      label: isDriver ? "Completed Deliveries" : "Active Orders",
      icon: isDriver ? CheckCircle2 : ShoppingBag,
      value: stats.metric2,
      sub: isDriver ? "Dropped at customer" : "Pending fulfillment",
    },
    card3: {
      label: isDriver
        ? "Dropped at Store"
        : isManager
        ? "In Stock Items"
        : "Global Products",
      icon: isDriver ? MapPin : Package,
      value: stats.metric3,
      sub: isDriver
        ? "Waiting for customer pickup"
        : isManager
        ? "Unique SKUs available"
        : "Total SKUs Catalogued",
    },
    card4: {
      label: isDriver ? "Logistics Volume" : "Total Volume",
      icon: Activity,
      value: stats.metric4,
      sub: "Total processed orders",
    },
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Global Command Center"
              : isDriver
              ? "Logistics Dashboard"
              : "Store Dashboard"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStats}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.values(kpiConfig).map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            {isDriver ? "Run Sheet Updates" : "Recent Activity"}
          </CardTitle>
          <CardDescription>
            Real-time log of orders and status changes impacting your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No recent activity logged.
                </div>
              ) : (
                activities.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="mt-1 bg-primary/10 p-2 rounded-full">
                      {log.status === "pos_complete" ||
                      log.status === "collected" ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Activity className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Order #{log.id.slice(0, 6)}{" "}
                        <span className="text-muted-foreground font-normal">
                          is
                        </span>{" "}
                        <span className="uppercase text-xs font-bold">
                          {log.status.replace("_", " ")}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.status === "pos_complete" && log.cashier
                          ? `Processed by ${log.cashier.full_name} at ${
                              log.locations?.name || "Store"
                            }`
                          : log.profiles
                          ? `${log.profiles.full_name} - ${
                              log.locations?.name || "Delivery"
                            }`
                          : "Guest Order"}
                      </p>
                    </div>
                    <div className="text-right">
                      {!isDriver && (
                        <div className="text-sm font-bold">
                          R {log.total_amount}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />{" "}
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
