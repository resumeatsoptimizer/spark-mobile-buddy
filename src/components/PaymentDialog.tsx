import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { validateCard } from "@/lib/payment-validation";
import { PromptPayQR } from "./PromptPayQR";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  amount: number;
  eventTitle: string;
  onSuccess: () => void;
}

declare global {
  interface Window {
    Omise: any;
  }
}

export function PaymentDialog({ open, onOpenChange, registrationId, amount, eventTitle, onSuccess }: PaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay'>('card');
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [chargeId, setChargeId] = useState<string>("");
  const [cardData, setCardData] = useState({
    name: "",
    number: "",
    expiration_month: "",
    expiration_year: "",
    security_code: "",
  });

  const loadOmiseScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Omise) {
        resolve(window.Omise);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.omise.co/omise.js";
      script.async = true;
      script.onload = () => resolve(window.Omise);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCard(cardData);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast({
        title: "ข้อมูลบัตรไม่ถูกต้อง",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await loadOmiseScript();
      const publicKey = import.meta.env.VITE_OMISE_PUBLIC_KEY;

      if (!publicKey || publicKey.trim() === '') {
        toast({
          title: "การตั้งค่าไม่ถูกต้อง",
          description: "ระบบชำระเงินยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      window.Omise.setPublicKey(publicKey);

      window.Omise.createToken("card", {
        name: cardData.name,
        number: cardData.number,
        expiration_month: cardData.expiration_month,
        expiration_year: cardData.expiration_year,
        security_code: cardData.security_code,
      }, async (statusCode: number, response: any) => {
        if (statusCode === 200) {
          try {
            const { data, error } = await supabase.functions.invoke('create-omise-charge', {
              body: {
                amount,
                token: response.id,
                registrationId,
                paymentMethod: 'card',
                returnUri: `${window.location.origin}/registrations`,
              },
            });

            if (error) {
              const errorMessage = error.message || "กรุณาลองใหม่อีกครั้ง";
              const isConfigError = errorMessage.includes('not configured') || errorMessage.includes('gateway');
              
              toast({
                title: isConfigError ? "การตั้งค่าไม่ถูกต้อง" : "การชำระเงินล้มเหลว",
                description: isConfigError 
                  ? "ระบบชำระเงินยังไม่ได้ตั้งค่าที่ฝั่ง backend กรุณาติดต่อผู้ดูแลระบบ"
                  : errorMessage,
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            if (data?.success === false || data?.error) {
              toast({
                title: "การชำระเงินล้มเหลว",
                description: data?.failure_message || data?.error || "กรุณาตรวจสอบข้อมูลบัตรและลองใหม่อีกครั้ง",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            if (data?.require_3ds && data?.authorize_uri) {
              window.location.href = data.authorize_uri;
              return;
            }

            if (data?.success && (data?.status === 'success' || data?.status === 'completed')) {
              toast({
                title: "ชำระเงินสำเร็จ",
                description: "ระบบได้รับการชำระเงินของคุณแล้ว คุณจะได้รับ QR Code เข้างานทางอีเมล",
              });
              onSuccess();
              onOpenChange(false);
            } else if (data?.status === 'processing') {
              toast({
                title: "กำลังดำเนินการ",
                description: "กรุณารอสักครู่ ระบบกำลังยืนยันการชำระเงิน คุณจะได้รับ QR Code เมื่อการชำระเงินสำเร็จ",
              });
              onSuccess();
              onOpenChange(false);
            } else {
              toast({
                title: "การชำระเงินล้มเหลว",
                description: data?.failure_message || "กรุณาตรวจสอบข้อมูลบัตรและลองใหม่อีกครั้ง",
                variant: "destructive",
              });
            }
          } catch (invokeError) {
            console.error('Error invoking payment function:', invokeError);
            toast({
              title: "เกิดข้อผิดพลาด",
              description: "ไม่สามารถดำเนินการชำระเงินได้ กรุณาลองใหม่",
              variant: "destructive",
            });
          }
          setLoading(false);
        } else {
          let errorMessage = response.message || "ไม่สามารถสร้าง token ได้";
          
          if (response.code === 'invalid_card') {
            errorMessage = "หมายเลขบัตรไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่";
          } else if (response.code === 'invalid_expiration_date') {
            errorMessage = "วันหมดอายุของบัตรไม่ถูกต้อง";
          } else if (response.code === 'invalid_security_code') {
            errorMessage = "รหัส CVV ไม่ถูกต้อง";
          } else if (response.code === 'insufficient_fund') {
            errorMessage = "ยอดเงินในบัตรไม่เพียงพอ";
          }
          
          toast({
            title: "ข้อมูลบัตรไม่ถูกต้อง",
            description: errorMessage,
            variant: "destructive",
          });
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดำเนินการชำระเงินได้",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handlePromptPaySubmit = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-omise-charge', {
        body: {
          amount,
          registrationId,
          paymentMethod: 'promptpay',
          returnUri: `${window.location.origin}/registrations`,
        },
      });

      if (error) throw error;

      if (data?.qr_code_data && data?.qr_code_data.qr_code_url) {
        setQrCodeData(data.qr_code_data);
        setChargeId(data.charge_id);
        toast({
          title: "สร้าง QR Code สำเร็จ",
          description: "กรุณาสแกน QR Code เพื่อชำระเงิน",
        });
      } else {
        // QR code generation failed
        const errorMsg = data?.error || data?.details || 'ไม่สามารถสร้าง QR Code ได้';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('PromptPay payment error:', error);
      
      // Enhanced error messages
      let errorTitle = "เกิดข้อผิดพลาด";
      let errorDescription = error.message || "ไม่สามารถสร้าง QR Code สำหรับการชำระเงินได้";
      
      if (error.message?.includes('QR code generation failed')) {
        errorTitle = "ไม่สามารถสร้าง QR Code";
        errorDescription = "ระบบไม่สามารถสร้าง PromptPay QR Code ได้ อาจเป็นเพราะการตั้งค่าบัญชีผู้รับเงิน กรุณาติดต่อผู้ดูแลระบบหรือลองใช้วิธีชำระเงินอื่น";
      } else if (error.message?.includes('not configured')) {
        errorTitle = "ระบบยังไม่พร้อม";
        errorDescription = "ระบบชำระเงิน PromptPay ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRSuccess = () => {
    toast({
      title: "ชำระเงินสำเร็จ",
      description: "การชำระเงินผ่าน PromptPay สำเร็จแล้ว คุณจะได้รับ QR Code ทาง Email",
    });
    onOpenChange(false);
    onSuccess();
  };

  const handleQRExpired = () => {
    setQrCodeData(null);
    setChargeId("");
    toast({
      title: "QR Code หมดอายุ",
      description: "กรุณาสร้าง QR Code ใหม่",
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ชำระเงิน</DialogTitle>
          <DialogDescription>
            เลือกวิธีการชำระเงินที่ต้องการ
          </DialogDescription>
        </DialogHeader>

        {qrCodeData ? (
          <PromptPayQR
            qrCodeData={qrCodeData}
            chargeId={chargeId}
            onSuccess={handleQRSuccess}
            onExpired={handleQRExpired}
          />
        ) : (
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'promptpay')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                บัตรเครดิต
              </TabsTrigger>
              <TabsTrigger value="promptpay" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                PromptPay QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4">
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อบนบัตร</Label>
                  <Input
                    id="name"
                    required
                    placeholder="JOHN DOE"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">หมายเลขบัตร</Label>
                  <Input
                    id="number"
                    required
                    placeholder="4242424242424242"
                    maxLength={16}
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '') })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">เดือน</Label>
                    <Input
                      id="month"
                      required
                      placeholder="MM"
                      maxLength={2}
                      value={cardData.expiration_month}
                      onChange={(e) => setCardData({ ...cardData, expiration_month: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">ปี</Label>
                    <Input
                      id="year"
                      required
                      placeholder="YYYY"
                      maxLength={4}
                      value={cardData.expiration_year}
                      onChange={(e) => setCardData({ ...cardData, expiration_year: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      required
                      placeholder="123"
                      maxLength={3}
                      value={cardData.security_code}
                      onChange={(e) => setCardData({ ...cardData, security_code: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm">
                    <p className="text-muted-foreground">งาน</p>
                    <p className="font-medium">{eventTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">ยอดชำระ</p>
                    <p className="text-2xl font-bold">฿{amount.toLocaleString('th-TH')}</p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังประมวลผล...
                    </>
                  ) : (
                    `ชำระเงิน ฿${amount.toLocaleString('th-TH')}`
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  การชำระเงินปลอดภัยด้วย Omise • ประมวลผลทันที
                </p>
              </form>
            </TabsContent>

            <TabsContent value="promptpay" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm">
                    <p className="text-muted-foreground">งาน</p>
                    <p className="font-medium">{eventTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">ยอดชำระ</p>
                    <p className="text-2xl font-bold">฿{amount.toLocaleString('th-TH')}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    ชำระเงินผ่าน PromptPay QR Code
                  </p>
                  <p className="text-xs">
                    • รองรับทุกธนาคารที่มี PromptPay<br />
                    • ไม่มีค่าธรรมเนียม<br />
                    • QR Code หมดอายุใน 15 นาที<br />
                    • รับยืนยันการชำระเงินทันที
                  </p>
                </div>

                <Button 
                  onClick={handlePromptPaySubmit} 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังสร้าง QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      สร้าง QR Code
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  การชำระเงินปลอดภัยด้วย Omise PromptPay
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
