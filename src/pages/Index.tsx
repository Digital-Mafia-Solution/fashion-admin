import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DollarSign, ShoppingBag, Package, Activity, TrendingUp, Store } from "lucide-react";

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState({ 
    ordersCount: 0, 
    productsCount: 0, 
    revenue: 0,
    activeOrders: 0 
  });

  useEffect(() => {
    async function loadStats() {
      // 1. Base Queries
      let ordersQuery = supabase.from('orders').select('*', { count: 'exact', head: true });
      let revenueQuery = supabase.from('orders').select('total_amount').eq('status', 'paid');
      let activeQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).neq('status', 'delivered');
      
      // 2. Apply Role Filters (If Manager, only show their store's data)
      if (!isAdmin && profile?.assigned_location_id) {
        ordersQuery = ordersQuery.eq('pickup_location_id', profile.assigned_location_id);
        revenueQuery = revenueQuery.eq('pickup_location_id', profile.assigned_location_id);
        activeQuery = activeQuery.eq('pickup_location_id', profile.assigned_location_id);
      }

      const { count: ordersCount } = await ordersQuery;
      const { count: activeOrders } = await activeQuery;
      const { data: revenueData } = await revenueQuery;
      
      // Products are global catalog, so we count them all
      const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true });

      const revenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      setStats({ 
        ordersCount: ordersCount || 0, 
        productsCount: productsCount || 0, 
        revenue,
        activeOrders: activeOrders || 0
      });
    }
    loadStats();
  }, [profile, isAdmin]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Global Command Center" : `Store Dashboard: ${profile?.assigned_location_id ? "Local View" : "My Store"}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? "Total Revenue" : "Store Revenue"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {stats.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" /> +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending fulfillment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Catalog</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Global SKUs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ordersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Processed orders</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Placeholder */}
      <Card className="col-span-4 border-dashed bg-muted/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" /> 
            {isAdmin ? "Network Activity" : "Store Activity"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No recent alerts or system notifications.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}