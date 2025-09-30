import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_remaining: number;
  created_at: string;
}

const Events = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchEvents();
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

    setUserRole(roles?.role || "participant");
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลอีเว้นท์ได้",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`คุณต้องการลบงานอีเว้นท์ "${title}" ใช่หรือไม่?`)) {
      return;
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบงานอีเว้นท์ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ลบสำเร็จ",
        description: `ลบงานอีเว้นท์ "${title}" เรียบร้อยแล้ว`,
      });
      fetchEvents();
    }
  };

  const isStaff = userRole === "admin" || userRole === "staff";

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
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">งานอีเว้นท์ทั้งหมด</h1>
              <p className="text-muted-foreground">
                {isStaff ? "จัดการงานอีเว้นท์ทั้งหมด" : "งานอีเว้นท์ที่เปิดรับสมัคร"}
              </p>
            </div>
            {isStaff && (
              <Button onClick={() => navigate("/events/create")}>
                <Plus className="mr-2 h-4 w-4" />
                สร้างงานอีเว้นท์
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Events List */}
      <main className="container mx-auto px-4 py-8">
        {events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">ยังไม่มีงานอีเว้นท์</h3>
              <p className="text-muted-foreground mb-4">
                {isStaff ? "เริ่มต้นสร้างงานอีเว้นท์แรกของคุณ" : "ยังไม่มีงานอีเว้นท์ที่เปิดรับสมัคร"}
              </p>
              {isStaff && (
                <Button onClick={() => navigate("/events/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  สร้างงานอีเว้นท์
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const seatsPercentage = (event.seats_remaining / event.seats_total) * 100;
              const isFull = event.seats_remaining === 0;
              
              return (
                <Card key={event.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  {event.cover_image_url && (
                    <div className="relative aspect-video w-full overflow-hidden">
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => navigate(`/events/${event.id}`)}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-2">{event.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {event.description || "ไม่มีรายละเอียด"}
                        </CardDescription>
                      </div>
                      {isFull && (
                        <Badge variant="destructive">เต็ม</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(event.start_date), "d MMM yyyy", { locale: th })}
                      </span>
                    </div>

                    {/* Seats Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>ที่นั่ง</span>
                        </div>
                        <span className="font-semibold">
                          {event.seats_remaining} / {event.seats_total}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
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

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {isStaff ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            ดูรายละเอียด
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/events/${event.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(event.id, event.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            ดูรายละเอียด
                          </Button>
                          <Button
                            className="flex-1"
                            disabled={isFull}
                            onClick={() => navigate(`/events/${event.id}/register`)}
                          >
                            {isFull ? "ที่นั่งเต็ม" : "ลงทะเบียน"}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;
