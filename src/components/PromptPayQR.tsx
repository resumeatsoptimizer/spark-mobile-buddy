import { useState, useEffect } from "react";
import { QrCode, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PromptPayQRProps {
  qrCodeData: {
    qr_code_url: string;
    expires_at: string;
    amount: number;
    currency: string;
  };
  chargeId: string;
  onSuccess: () => void;
  onExpired: () => void;
}

export function PromptPayQR({ qrCodeData, chargeId, onSuccess, onExpired }: PromptPayQRProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Calculate initial time remaining
    const expiresAt = new Date(qrCodeData.expires_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, expiresAt - now);
    setTimeRemaining(remaining);

    // Update countdown every second
    const interval = setInterval(() => {
      const expiresAt = new Date(qrCodeData.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    // Auto-check payment status every 5 seconds
    const statusCheckInterval = setInterval(() => {
      checkPaymentStatus(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(statusCheckInterval);
    };
  }, [qrCodeData.expires_at]);

  const checkPaymentStatus = async (showToast = true) => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status, omise_charge_id')
        .eq('omise_charge_id', chargeId)
        .single();

      if (error) throw error;

      if (data.status === 'success') {
        if (showToast) {
          toast({
            title: "ชำระเงินสำเร็จ",
            description: "การชำระเงินผ่าน PromptPay สำเร็จแล้ว",
          });
        }
        onSuccess();
      } else if (data.status === 'failed') {
        if (showToast) {
          toast({
            title: "การชำระเงินล้มเหลว",
            description: "กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          });
        }
      } else if (showToast && data.status === 'pending') {
        toast({
          title: "รอการชำระเงิน",
          description: "กรุณาสแกน QR Code และยืนยันการชำระเงิน",
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (showToast) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้",
          variant: "destructive",
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isExpiringSoon = timeRemaining < 180000; // Less than 3 minutes

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {qrCodeData.qr_code_url ? (
            <img
              src={qrCodeData.qr_code_url}
              alt="PromptPay QR Code"
              className="w-64 h-64 border-2 border-border rounded-lg"
            />
          ) : (
            <div className="w-64 h-64 border-2 border-border rounded-lg flex items-center justify-center bg-muted">
              <QrCode className="w-32 h-32 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Amount Display */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">ยอดชำระ</p>
          <p className="text-3xl font-bold">
            ฿{qrCodeData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className={`flex items-center justify-center space-x-2 p-3 rounded-lg ${
        isExpiringSoon ? 'bg-destructive/10 text-destructive' : 'bg-muted'
      }`}>
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">
          เหลือเวลา: {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Instructions */}
      <div className="space-y-3 text-sm">
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p>เปิดแอพธนาคารที่รองรับ PromptPay</p>
        </div>
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p>สแกน QR Code ด้านบน</p>
        </div>
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p>ยืนยันการชำระเงินในแอพธนาคาร</p>
        </div>
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p>รอระบบตรวจสอบการชำระเงิน (โดยอัตโนมัติ)</p>
        </div>
      </div>

      {/* Status Check Button */}
      <button
        onClick={() => checkPaymentStatus(true)}
        disabled={isChecking}
        className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>กำลังตรวจสอบ...</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>ตรวจสอบสถานะการชำระเงิน</span>
          </>
        )}
      </button>

      {/* Auto-check notice */}
      <p className="text-xs text-center text-muted-foreground">
        ระบบจะตรวจสอบสถานะการชำระเงินอัตโนมัติทุก 5 วินาที
      </p>
    </div>
  );
}
