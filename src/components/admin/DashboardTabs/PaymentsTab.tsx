import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export function PaymentsTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select(`
        *,
        registration:registrations(
          event:events(title),
          user_id!inner(email, name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);
    setPayments(data || []);
    setLoading(false);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.registration?.user_id?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.registration?.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.omise_charge_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      successful: { variant: "default", label: "Success" },
      success: { variant: "default", label: "Success" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
      refunded: { variant: "outline", label: "Refunded" },
    };
    const { variant, label } = config[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const totalRevenue = filteredPayments
    .filter(p => p.status === "successful" || p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground">Manage payment transactions</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold mono">฿{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Filter Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, event, or charge ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button
                variant={filterStatus === "successful" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("successful")}
              >
                Success
              </Button>
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("pending")}
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("failed")}
              >
                Failed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Recent Payments</CardTitle>
          <CardDescription className="text-xs">{filteredPayments.length} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No payments found</TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {format(new Date(payment.created_at), "d MMM yyyy, HH:mm", { locale: th })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{payment.registration?.user_id?.name}</p>
                        <p className="text-xs text-muted-foreground">{payment.registration?.user_id?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{payment.registration?.event?.title}</TableCell>
                    <TableCell className="font-medium mono">฿{Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.receipt_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(payment.receipt_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
