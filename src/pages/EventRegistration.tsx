import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, ArrowLeft, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_remaining: number;
  custom_fields: any;
}

const EventRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    checkAuthAndFetch();
  }, [id]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนลงทะเบียน",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    fetchEvent();
  };

  const fetchEvent = async () => {
    if (!id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลงานอีเว้นท์ได้",
        variant: "destructive",
      });
      navigate("/");
    } else {
      setEvent(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !event) return;

    // Check if already registered
    const { data: existingReg } = await supabase
      .from("registrations")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingReg) {
      toast({
        title: "ลงทะเบียนแล้ว",
        description: "คุณได้ลงทะเบียนงานนี้ไปแล้ว",
        variant: "destructive",
      });
      navigate("/registrations");
      return;
    }

    setSubmitting(true);

    const status = event.seats_remaining > 0 ? "pending" : "waitlist";

    const { error } = await supabase
      .from("registrations")
      .insert([{
        event_id: event.id,
        user_id: userId,
        status,
        payment_status: "unpaid",
        form_data: formData,
      }]);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      // Update seats
      if (status === "pending") {
        await supabase
          .from("events")
          .update({ seats_remaining: event.seats_remaining - 1 })
          .eq("id", event.id);
      }

      toast({
        title: "สำเร็จ!",
        description: status === "pending" 
          ? "ลงทะเบียนเรียบร้อยแล้ว" 
          : "เพิ่มเข้ารายการรอเรียบร้อยแล้ว",
      });
      navigate("/registrations");
    }

    setSubmitting(false);
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

  if (!event) {
    return null;
  }

  const isFull = event.seats_remaining === 0;
  const seatsPercentage = (event.seats_remaining / event.seats_total) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                    <CardDescription className="text-base">
                      {event.description || "ไม่มีรายละเอียด"}
                    </CardDescription>
                  </div>
                  {isFull && <Badge variant="destructive">ที่นั่งเต็ม</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">วันที่จัดงาน</p>
                      <p className="font-medium">
                        {format(new Date(event.start_date), "d MMM yyyy", { locale: th })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">สิ้นสุดวันที่</p>
                      <p className="font-medium">
                        {format(new Date(event.end_date), "d MMM yyyy", { locale: th })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seats Info */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-medium">ที่นั่งคงเหลือ</span>
                    </div>
                    <span className="text-lg font-bold">
                      {event.seats_remaining} / {event.seats_total}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        seatsPercentage > 50
                          ? "bg-primary"
                          : seatsPercentage > 20
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${seatsPercentage}%` }}
                    />
                  </div>
                </div>

                {isFull && (
                  <Alert>
                    <AlertDescription>
                      ที่นั่งเต็มแล้ว คุณสามารถลงทะเบียนเข้ารายการรอได้
                      เมื่อมีที่นั่งว่างจะแจ้งเตือนให้คุณทราบ
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>ลงทะเบียนเข้าร่วมงาน</CardTitle>
                <CardDescription>
                  {isFull ? "เพิ่มเข้ารายการรอ" : "กรอกข้อมูลเพื่อลงทะเบียน"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                    <Input
                      id="name"
                      required
                      placeholder="กรอกชื่อของคุณ"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                    <Input
                      id="phone"
                      required
                      type="tel"
                      placeholder="0812345678"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={submitting}
                      size="lg"
                    >
                      {submitting 
                        ? "กำลังดำเนินการ..." 
                        : isFull 
                        ? "เข้ารายการรอ" 
                        : "ยืนยันการลงทะเบียน"
                      }
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      การลงทะเบียนไม่มีค่าใช้จ่าย
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventRegistration;
