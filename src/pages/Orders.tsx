import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Database } from "../lib/database.types";
import { useUpdatingSet } from "../hooks/use-updating-set";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Truck,
  Store,
  User,
  Package as PackageIcon,
  Check,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import { format } from "date-fns";
import { toast } from "sonner";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

// The select used in this page returns joined fields; define a friendly type
type Order = OrderRow & {
  profiles?: ProfileRow | null;
  locations?: Pick<LocationRow, "name"> | null;
  order_items?: (OrderItemRow & {
    products?: { name?: string } | null;
    size_name?: string | null;
  })[];
};

export default function Orders() {
  const { profile, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    add: addUpdatingId,
    remove: removeUpdatingId,
    has: hasUpdatingId,
  } = useUpdatingSet();

  const locationId = profile?.assigned_location_id;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("orders").select(`
        *,
        profiles:profiles!orders_customer_id_fkey (full_name, first_name, last_name, email, phone),
        locations (name),
        order_items (
            quantity,
            size_name,
            products (name)
        )
      `);

    if (!isAdmin && locationId) {
      query = query.eq("pickup_location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } else if (data) {
      const rawOrders = data as unknown as Order[];

      const sorted = rawOrders.sort((a, b) => {
        const openStatuses = ["paid", "pending", "packed", "ready", "transit"];
        const aIsOpen = openStatuses.includes(a.status ?? "");
        const bIsOpen = openStatuses.includes(b.status ?? "");

        if (aIsOpen && !bIsOpen) return -1;
        if (!aIsOpen && bIsOpen) return 1;
        return (
          (b.created_at ? new Date(b.created_at).getTime() : 0) -
          (a.created_at ? new Date(a.created_at).getTime() : 0)
        );
      });

      setOrders(sorted);
    }
    setLoading(false);
  }, [isAdmin, locationId]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (isMounted) {
        await fetchOrders();
      }
    })();

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (isMounted) {
            fetchOrders();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const updateStatus = async (
    id: string,
    status: Database["public"]["Enums"]["order_status"]
  ) => {
    addUpdatingId(id);

    // Snapshot previous orders so we can revert on failure
    const previousOrders = orders;

    // Optimistically update only the affected order in local state
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) {
        // Revert optimistic update
        setOrders(previousOrders);
        toast.error("Failed to update status");
        console.error("Failed to update order status:", error);
      } else {
        toast.success(`Order updated to ${status.toUpperCase()}`);
      }
    } catch (err) {
      // Revert optimistic update on unexpected error
      setOrders(previousOrders);
      toast.error("Failed to update status");
      console.error("Unexpected error updating order status:", err);
    } finally {
      removeUpdatingId(id);
    }
  };

  const getCustomerName = (p: ProfileRow | null) => {
    if (!p) return "Guest User";
    if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
    return p.full_name || "Unknown";
  };

  const renderActionButton = (order: Order) => {
    if (["pos_complete", "delivered", "collected"].includes(order.status ?? ""))
      return null;

    if (order.status === "paid") {
      return (
        <Button
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => updateStatus(order.id, "packed")}
          disabled={hasUpdatingId(order.id)}
        >
          {hasUpdatingId(order.id) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PackageIcon className="h-4 w-4" />
          )}{" "}
          Pack Order
        </Button>
      );
    }

    if (order.status === "packed") {
      if (order.fulfillment_type === "courier") {
        return (
          <Button
            className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
            onClick={() => updateStatus(order.id, "transit")}
            disabled={hasUpdatingId(order.id)}
          >
            {hasUpdatingId(order.id) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4" />
            )}{" "}
            Dispatch to Courier
          </Button>
        );
      } else {
        return (
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => updateStatus(order.id, "ready")}
            disabled={hasUpdatingId(order.id)}
          >
            {hasUpdatingId(order.id) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}{" "}
            Ready for Collection
          </Button>
        );
      }
    }

    if (order.status === "transit") {
      return (
        <Button
          variant="outline"
          className="w-full gap-2 border-orange-500 text-orange-600"
          disabled
        >
          <Truck className="h-4 w-4" /> In Transit
        </Button>
      );
    }

    if (order.status === "ready") {
      return (
        <Button
          className="w-full gap-2 bg-green-600 hover:bg-green-700"
          onClick={() => updateStatus(order.id, "collected")}
          disabled={hasUpdatingId(order.id)}
        >
          {hasUpdatingId(order.id) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}{" "}
          Mark Collected
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="h-12 w-12 opacity-20" />}
          title="No orders found"
          description="There are currently no orders to display."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={`flex flex-col border-l-4 
                  ${
                    order.status === "pos_complete"
                      ? "border-l-emerald-500"
                      : ["delivered", "collected"].includes(order.status ?? "")
                      ? "border-l-gray-400"
                      : "border-l-blue-600"
                  }`}
            >
              <CardHeader className="pb-3 bg-muted/10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-bold">
                      #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {order.created_at
                        ? format(new Date(order.created_at), "MMM dd, HH:mm")
                        : "-"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      ["delivered", "pos_complete", "collected"].includes(
                        order.status ?? ""
                      )
                        ? "secondary"
                        : "default"
                    }
                    className="capitalize"
                  >
                    {(order.status ?? "").replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-4">
                <div className="flex items-start gap-3 text-sm p-2 rounded bg-muted/40 border">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {getCustomerName(order.profiles ?? null)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.profiles?.phone || order.profiles?.email}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.fulfillment_type === "pickup" ||
                  order.fulfillment_type === "warehouse_pickup" ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900">
                      <Store className="h-4 w-4" />
                      <span className="font-medium">
                        Collect: {order.locations?.name || "Global Store"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-100 dark:border-orange-900">
                      <Truck className="h-4 w-4 mt-0.5" />
                      <div className="break-all">
                        <span className="font-medium block">Delivery to:</span>
                        <span className="opacity-90">
                          {order.delivery_address}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-sm">
                  <div className="font-medium mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Items
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {order.order_items?.map((item, i: number) => (
                      <li key={i}>
                        <span className="text-foreground font-medium">
                          {item.products?.name}
                        </span>
                        {item.size_name && (
                          <span className="opacity-70 ml-1">
                            - Size: {item.size_name}
                          </span>
                        )}
                        <span className="opacity-70 ml-1">
                          (x{item.quantity})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t bg-muted/10">
                {renderActionButton(order)}

                {order.status === "pos_complete" && (
                  <div className="w-full text-center text-xs text-muted-foreground italic">
                    POS Completed
                  </div>
                )}
                {order.status === "delivered" && (
                  <div className="w-full text-center text-xs text-muted-foreground italic flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Delivered
                  </div>
                )}
                {order.status === "collected" && (
                  <div className="w-full text-center text-xs text-muted-foreground italic flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Collected by Customer
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
