import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, RefreshCw, Download, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";

interface Payment {
  id: string;
  registration_id: string;
  amount: number;
  status: string;
  currency: string;
  omise_charge_id: string | null;
  receipt_url: string | null;
  card_last4: string | null;
  created_at: string;
  refunded_at: string | null;
  refund_amount: number;
  registration: {
    id: string;
    event: {
      title: string;
    };
    user_id: string;
    profiles: {
      email: string;
      name: string;
    };
  };
}

const PaymentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    checkAuth();
    fetchPayments();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (roles?.role !== "admin" && roles?.role !== "staff") {
      navigate("/");
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        variant: "destructive",
      });
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        registration:registrations(
          id,
          user_id,
          event:events(title),
          profiles:user_id(email, name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการชำระเงินได้",
        variant: "destructive",
      });
    } else {
      setPayments(data || []);
    }
    
    setLoading(false);
  };

  const handleRefund = async (paymentId: string, amount: number) => {
    const reason = prompt(`คุณต้องการคืนเงินจำนวน ฿${amount.toLocaleString()} ใช่หรือไม่?\n\nกรุณาระบุเหตุผล:`);

    if (!reason) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('refund-omise-charge', {
        body: {
          paymentId,
          amount,
          reason,
        },
      });

      if (error) {
        console.error('Refund error:', error);
        toast({
          title: "การคืนเงินล้มเหลว",
          description: error.message || "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "คืนเงินสำเร็จ",
        description: `คืนเงินจำนวน ฿${data.amount.toLocaleString()} เรียบร้อยแล้ว`,
      });

      // Refresh payments list
      await fetchPayments();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดำเนินการคืนเงินได้",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      successful: "default",
      pending: "secondary",
      processing: "secondary",
      failed: "destructive",
      refunded: "outline",
    };

    const labels: Record<string, string> = {
      success: "สำเร็จ",
      successful: "สำเร็จ",
      pending: "รอดำเนินการ",
      processing: "กำลังดำเนินการ",
      failed: "ล้มเหลว",
      refunded: "คืนเงินแล้ว",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.registration?.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.registration?.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.registration?.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.omise_charge_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const totalRevenue = payments
    .filter(p => p.status === "successful" || p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount) - Number(p.refund_amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">จัดการการชำระเงิน</h1>
              <p className="text-muted-foreground">ตรวจสอบและจัดการการชำระเงินทั้งหมด</p>
            </div>
            <Button onClick={fetchPayments} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              รีเฟรช
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ชำระสำเร็จ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(p => p.status === "successful" || p.status === "success").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(p => p.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ล้มเหลว</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(p => p.status === "failed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ค้นหาและกรองข้อมูล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่องาน, อีเมล, Charge ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  ทั้งหมด
                </Button>
                <Button
                  variant={filterStatus === "successful" ? "default" : "outline"}
                  onClick={() => setFilterStatus("successful")}
                >
                  สำเร็จ
                </Button>
                <Button
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  onClick={() => setFilterStatus("pending")}
                >
                  รอดำเนินการ
                </Button>
                <Button
                  variant={filterStatus === "failed" ? "default" : "outline"}
                  onClick={() => setFilterStatus("failed")}
                >
                  ล้มเหลว
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการชำระเงิน</CardTitle>
            <CardDescription>รายการชำระเงินทั้งหมด ({filteredPayments.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>งานอีเว้นท์</TableHead>
                  <TableHead>ผู้ลงทะเบียน</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>Charge ID</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.created_at), "d MMM yyyy, HH:mm", { locale: th })}
                      </TableCell>
                      <TableCell>{payment.registration?.event?.title}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.registration?.profiles?.name}</p>
                          <p className="text-xs text-muted-foreground">{payment.registration?.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ฿{Number(payment.amount).toLocaleString()}
                        {payment.refund_amount > 0 && (
                          <p className="text-xs text-red-500">คืนเงิน: ฿{payment.refund_amount.toLocaleString()}</p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {payment.omise_charge_id || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {payment.receipt_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(payment.receipt_url!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {(payment.status === "successful" || payment.status === "success") &&
                           Number(payment.refund_amount || 0) < Number(payment.amount) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefund(payment.id, Number(payment.amount) - Number(payment.refund_amount || 0))}
                            >
                              {payment.refund_amount > 0 ? "คืนเงินเพิ่ม" : "คืนเงิน"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentManagement;
