import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2 } from "lucide-react";
import { validateCard, formatCardNumber } from "@/lib/payment-validation";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate card data first
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
      // Load Omise script
      await loadOmiseScript();

      // Get public key from env (NEVER hardcode API keys!)
      const publicKey = import.meta.env.VITE_OMISE_PUBLIC_KEY;

      if (!publicKey) {
        toast({
          title: "Configuration Error",
          description: "Payment gateway not configured. Please contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      window.Omise.setPublicKey(publicKey);

      // Create token
      window.Omise.createToken("card", {
        name: cardData.name,
        number: cardData.number,
        expiration_month: cardData.expiration_month,
        expiration_year: cardData.expiration_year,
        security_code: cardData.security_code,
      }, async (statusCode: number, response: any) => {
        if (statusCode === 200) {
          // Token created successfully
          const token = response.id;

          try {
            // Call edge function to create charge (secure server-side processing)
            const { data, error } = await supabase.functions.invoke('create-omise-charge', {
              body: {
                amount,
                currency: 'THB',
                description: `Payment for ${eventTitle}`,
                token,
                registrationId,
                return_uri: window.location.origin + '/registrations', // For 3D Secure
              },
            });

            if (error) {
              console.error('Payment error:', error);
              toast({
                title: "การชำระเงินล้มเหลว",
                description: error.message || "กรุณาลองใหม่อีกครั้ง",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            // Check if 3D Secure required
            if (data?.require_3ds && data?.authorize_uri) {
              // Redirect to 3DS page
              window.location.href = data.authorize_uri;
              return;
            }

            // Check payment status
            if (data?.status === 'success') {
              toast({
                title: "ชำระเงินสำเร็จ",
                description: "ระบบได้รับการชำระเงินของคุณแล้ว และส่งอีเมลยืนยันไปแล้ว",
              });
              onSuccess();
              onOpenChange(false);
            } else if (data?.status === 'processing') {
              toast({
                title: "กำลังดำเนินการ",
                description: "กรุณารอสักครู่ ระบบกำลังยืนยันการชำระเงิน",
              });
              onOpenChange(false);
            } else {
              toast({
                title: "การชำระเงินล้มเหลว",
                description: data?.failure_message || "กรุณาลองใหม่อีกครั้ง",
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
          console.error('Omise token error:', response);
          toast({
            title: "เกิดข้อผิดพลาด",
            description: response.message || "ไม่สามารถสร้าง token ได้",
            variant: "destructive",
          });
        }
        setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ชำระเงิน
          </DialogTitle>
          <DialogDescription>
            จำนวนเงิน: ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="pt-4 space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                `ชำระเงิน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ชำระเงินผ่าน Omise Payment Gateway อย่างปลอดภัย
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
