import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const EventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("");

  const isEditMode = !!id;

  useEffect(() => {
    checkAuth();
    if (isEditMode) {
      fetchEvent();
    }
  }, [id]);

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

    const userRole = roles?.role;
    if (userRole !== "admin" && userRole !== "staff") {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์ในการจัดการงานอีเว้นท์",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const fetchEvent = async () => {
    if (!id) return;

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
      navigate("/events");
      return;
    }

    if (data) {
      setTitle(data.title);
      setDescription(data.description || "");
      setStartDate(data.start_date.split("T")[0]);
      setEndDate(data.end_date.split("T")[0]);
      setSeatsTotal(data.seats_total.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !startDate || !endDate || !seatsTotal) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    const seats = parseInt(seatsTotal);
    if (isNaN(seats) || seats <= 0) {
      toast({
        title: "จำนวนที่นั่งไม่ถูกต้อง",
        description: "กรุณากระบวนจำนวนที่นั่งที่มากกว่า 0",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "วันที่ไม่ถูกต้อง",
        description: "วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const eventData = {
      title,
      description: description || null,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      seats_total: seats,
      seats_remaining: seats,
      created_by: session.user.id,
    };

    let error;
    if (isEditMode) {
      const result = await supabase
        .from("events")
        .update(eventData)
        .eq("id", id);
      error = result.error;
    } else {
      const result = await supabase
        .from("events")
        .insert([eventData]);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถ${isEditMode ? "แก้ไข" : "สร้าง"}งานอีเว้นท์ได้`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: `${isEditMode ? "แก้ไข" : "สร้าง"}งานอีเว้นท์เรียบร้อยแล้ว`,
      });
      navigate("/events");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditMode ? "แก้ไขงานอีเว้นท์" : "สร้างงานอีเว้นท์ใหม่"}
              </h1>
              <p className="text-sm text-muted-foreground">
                กรอกข้อมูลงานอีเว้นท์
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>ข้อมูลงานอีเว้นท์</CardTitle>
            <CardDescription>
              กรอกข้อมูลรายละเอียดของงานอีเว้นท์
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">ชื่องานอีเว้นท์ *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น Yoga Workshop 2024"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดของงานอีเว้นท์..."
                  rows={4}
                />
              </div>

              {/* Dates */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">วันที่เริ่มต้น *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">วันที่สิ้นสุด *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Seats */}
              <div className="space-y-2">
                <Label htmlFor="seatsTotal">จำนวนที่นั่งทั้งหมด *</Label>
                <Input
                  id="seatsTotal"
                  type="number"
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(e.target.value)}
                  placeholder="เช่น 50"
                  min="1"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/events")}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "สร้างงานอีเว้นท์"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EventForm;
