import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Registration {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  events: {
    title: string;
    start_date: string;
    end_date: string;
  };
}

const Registrations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    fetchRegistrations(session.user.id);
  };

  const fetchRegistrations = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("registrations")
      .select(`
        id,
        status,
        payment_status,
        created_at,
        events (
          title,
          start_date,
          end_date
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      setRegistrations(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />ยืนยันแล้ว</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader className="mr-1 h-3 w-3" />รอดำเนินการ</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />ยกเลิก</Badge>;
      case "waitlist":
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />รายการรอ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-blue-500">ชำระแล้ว</Badge>;
      case "unpaid":
        return <Badge variant="outline">ยังไม่ชำระ</Badge>;
      case "failed":
        return <Badge variant="destructive">ชำระไม่สำเร็จ</Badge>;
      default:
        return <Badge>{paymentStatus}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">การลงทะเบียนของฉัน</h1>
          <p className="text-muted-foreground">
            รายการงานอีเว้นท์ทั้งหมดที่คุณลงทะเบียน
          </p>
        </div>

        {registrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">ยังไม่มีการลงทะเบียน</h3>
              <p className="text-muted-foreground mb-4">
                เริ่มต้นลงทะเบียนงานอีเว้นท์ของเราได้เลย
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {registrations.map((registration) => (
              <Card key={registration.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{registration.events.title}</CardTitle>
                    {getStatusBadge(registration.status)}
                  </div>
                  <CardDescription>
                    ลงทะเบียนเมื่อ {format(new Date(registration.created_at), "d MMM yyyy", { locale: th })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(registration.events.start_date), "d MMM yyyy", { locale: th })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">สถานะการชำระเงิน:</span>
                    {getPaymentBadge(registration.payment_status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Registrations;
