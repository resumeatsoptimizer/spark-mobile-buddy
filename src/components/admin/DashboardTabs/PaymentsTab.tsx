import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { isSuccessfulPayment, PAYMENT_STATUS } from "@/lib/payment-constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function PaymentsTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    payment: any | null;
  }>({ open: false, payment: null });
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

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
          form_data,
          event:events(title),
          profiles!registrations_user_id_fkey(email, name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);
    
    // Debug: Log payment status distribution
    console.log('💳 PaymentsTab Data:', {
      total: data?.length || 0,
      statusBreakdown: data?.reduce((acc: any, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      amounts: data?.map(p => ({ status: p.status, amount: p.amount }))
    });
    
    setPayments(data || []);
    setLoading(false);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.registration?.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.registration?.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.registration?.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.omise_charge_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      [PAYMENT_STATUS.SUCCESSFUL]: { variant: "default", label: "Success" },
      [PAYMENT_STATUS.SUCCESS]: { variant: "default", label: "Success" },
      [PAYMENT_STATUS.COMPLETED]: { variant: "default", label: "Completed" },
      [PAYMENT_STATUS.PENDING]: { variant: "secondary", label: "Pending" },
      [PAYMENT_STATUS.FAILED]: { variant: "destructive", label: "Failed" },
      [PAYMENT_STATUS.REFUNDED]: { variant: "outline", label: "Refunded" },
    };
    const { variant, label } = config[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const totalRevenue = filteredPayments
    .filter(p => isSuccessfulPayment(p.status))
    .reduce((sum, p) => sum + (Number(p.amount) - Number(p.refund_amount || 0)), 0);

  const canRefund = (payment: any) => {
    // Check if payment has webhook data indicating it's paid and refundable
    const webhookData = payment.webhook_data;
    const isPaid = webhookData?.paid === true;
    const isRefundable = webhookData?.refundable === true;
    
    return isSuccessfulPayment(payment.status) && 
           Number(payment.refund_amount || 0) < Number(payment.amount) &&
           isPaid && 
           isRefundable;
  };

  const getPaymentStatusIndicator = (payment: any) => {
    const webhookData = payment.webhook_data;
    const isPaid = webhookData?.paid === true;
    const isRefundable = webhookData?.refundable === true;
    
    if (!isSuccessfulPayment(payment.status)) {
      return null;
    }

    if (isPaid && isRefundable) {
      return <span className="text-xs text-green-600">🟢 ชำระเงินแล้ว (สามารถคืนได้)</span>;
    } else if (!isPaid) {
      return <span className="text-xs text-yellow-600">🟡 รอการชำระเงิน (ยังคืนไม่ได้)</span>;
    } else if (!isRefundable) {
      return <span className="text-xs text-red-600">🔴 ไม่สามารถคืนได้</span>;
    }
    return null;
  };

  const handleRefundClick = (payment: any) => {
    const maxRefundable = Number(payment.amount) - Number(payment.refund_amount || 0);
    setRefundDialog({ open: true, payment });
    setRefundAmount(maxRefundable.toString());
    setRefundReason("");
  };

  const handleRefund = async () => {
    if (!refundDialog.payment) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "จำนวนเงินไม่ถูกต้อง",
        description: "กรุณากรอกจำนวนเงินที่ต้องการคืน",
        variant: "destructive",
      });
      return;
    }

    if (!refundReason.trim()) {
      toast({
        title: "กรุณากรอกเหตุผล",
        description: "กรุณาระบุเหตุผลในการคืนเงิน",
        variant: "destructive",
      });
      return;
    }

    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke('refund-omise-charge', {
        body: {
          paymentId: refundDialog.payment.id,
          amount: amount,
          reason: refundReason,
        },
      });

      if (error) throw error;

      toast({
        title: "คืนเงินสำเร็จ",
        description: `คืนเงิน ${amount} บาท สำเร็จ`,
      });

      setRefundDialog({ open: false, payment: null });
      fetchPayments();
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถคืนเงินได้ กรุณาลองอีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setRefunding(false);
    }
  };

  // Debug: Log revenue calculation
  console.log('💰 Revenue Summary:', {
    totalPayments: filteredPayments.length,
    successfulPayments: filteredPayments.filter(p => isSuccessfulPayment(p.status)).length,
    totalRevenue,
    breakdown: filteredPayments
      .filter(p => isSuccessfulPayment(p.status))
      .map(p => ({ amount: p.amount, status: p.status }))
  });

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
                variant={filterStatus === "success" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("success")}
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
                <TableHead>Refund</TableHead>
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
                        <p className="font-medium text-sm">
                          {payment.registration?.profiles?.name || 'ไม่ระบุ'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.registration?.profiles?.email || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{payment.registration?.event?.title}</TableCell>
                    <TableCell className="font-medium mono">฿{Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(payment.status)}
                        {getPaymentStatusIndicator(payment)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.refund_amount && Number(payment.refund_amount) > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          ฿{Number(payment.refund_amount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canRefund(payment) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefundClick(payment)}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            คืนเงิน
                          </Button>
                        )}
                        {payment.receipt_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(payment.receipt_url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
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

      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ open, payment: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>คืนเงิน</DialogTitle>
            <DialogDescription>
              กรอกจำนวนเงินและเหตุผลในการคืนเงินสำหรับรายการนี้
            </DialogDescription>
          </DialogHeader>
          
          {refundDialog.payment && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ลูกค้า:</span>
                  <span className="font-medium">{refundDialog.payment.registration?.profiles?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">กิจกรรม:</span>
                  <span className="font-medium">{refundDialog.payment.registration?.event?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ยอดชำระ:</span>
                  <span className="font-medium">฿{Number(refundDialog.payment.amount).toLocaleString()}</span>
                </div>
                {refundDialog.payment.refund_amount && Number(refundDialog.payment.refund_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">คืนแล้ว:</span>
                    <span className="font-medium text-destructive">
                      ฿{Number(refundDialog.payment.refund_amount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">คืนได้สูงสุด:</span>
                  <span className="font-bold">
                    ฿{(Number(refundDialog.payment.amount) - Number(refundDialog.payment.refund_amount || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-amount">จำนวนเงินที่ต้องการคืน (บาท)</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={Number(refundDialog.payment.amount) - Number(refundDialog.payment.refund_amount || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-reason">เหตุผลในการคืนเงิน</Label>
                <Textarea
                  id="refund-reason"
                  placeholder="ระบุเหตุผลในการคืนเงิน..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialog({ open: false, payment: null })}
              disabled={refunding}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refunding}
              variant="destructive"
            >
              {refunding ? "กำลังดำเนินการ..." : "ยืนยันคืนเงิน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
