import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, MapPin, Clock, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Progress } from "@/components/ui/progress";
import { convertToEmbedUrl, isValidGoogleMapsUrl } from "@/lib/maps";

interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  google_map_url: string | null;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_remaining: number;
  registration_open_date: string | null;
  registration_close_date: string | null;
  visibility: string | null;
  waitlist_enabled: boolean | null;
  max_waitlist_size: number | null;
  allow_overbooking: boolean | null;
  overbooking_percentage: number | null;
  created_at: string;
}

const EventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchEvent();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      setUserRole(roles?.role || "participant");
    }
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
        description: "ไม่สามารถโหลดข้อมูลอีเว้นท์ได้",
        variant: "destructive",
      });
      navigate("/events");
    } else {
      setEvent(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!event || !confirm(`คุณต้องการลบงานอีเว้นท์ "${event.title}" ใช่หรือไม่?`)) {
      return;
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบงานอีเว้นท์ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ลบสำเร็จ",
        description: `ลบงานอีเว้นท์ "${event.title}" เรียบร้อยแล้ว`,
      });
      navigate("/events");
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

  if (!event) {
    return null;
  }

  const seatsPercentage = (event.seats_remaining / event.seats_total) * 100;
  const isFull = event.seats_remaining === 0;
  const registrationOpen = event.registration_open_date 
    ? new Date(event.registration_open_date) <= new Date()
    : true;
  const registrationClosed = event.registration_close_date
    ? new Date(event.registration_close_date) < new Date()
    : false;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/events")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับไปหน้าอีเว้นท์
          </Button>
        </div>
      </header>

      {/* Event Details */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            {event.cover_image_url && (
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-t-lg">
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-3xl">{event.title}</CardTitle>
                    {event.visibility === "private" && (
                      <Badge variant="secondary">Private</Badge>
                    )}
                  </div>
                  {event.description && (
                    <CardDescription className="text-base mt-2">
                      {event.description}
                    </CardDescription>
                  )}
                </div>
                {isFull && (
                  <Badge variant="destructive">ที่นั่งเต็ม</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Event Info Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">วันที่จัดงาน</p>
                        <p className="font-semibold">
                          {format(new Date(event.start_date), "d MMMM yyyy", { locale: th })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">เวลา</p>
                        <p className="font-semibold">
                          {format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")} น.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Location Info */}
              {(event.location || event.google_map_url) && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">สถานที่จัดงาน</p>
                        {event.location ? (
                          <p className="font-semibold">{event.location}</p>
                        ) : (
                          <p className="font-semibold text-muted-foreground">ดูตำแหน่งบนแผนที่</p>
                        )}
                        {event.google_map_url && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a
                              href={event.google_map_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              เปิดใน Google Maps →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Embedded Google Map */}
                    {(event.location || (event.google_map_url && isValidGoogleMapsUrl(event.google_map_url))) && (
                      <div className="w-full h-[300px] rounded-lg overflow-hidden border shadow-sm">
                        <iframe
                          src={convertToEmbedUrl(event.google_map_url || '', event.location || undefined)}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`แผนที่ ${event.location || 'สถานที่จัดงาน'}`}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Seats Info */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-semibold">ที่นั่งคงเหลือ</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {event.seats_remaining} / {event.seats_total}
                    </span>
                  </div>
                  <Progress value={seatsPercentage} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {seatsPercentage.toFixed(0)}% ของที่นั่งยังว่าง
                  </p>
                </CardContent>
              </Card>

              {/* Registration Period */}
              {(event.registration_open_date || event.registration_close_date) && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">ช่วงเวลาลงทะเบียน</h3>
                    <div className="space-y-2 text-sm">
                      {event.registration_open_date && (
                        <p>
                          <span className="text-muted-foreground">เปิดรับ: </span>
                          {format(new Date(event.registration_open_date), "d MMM yyyy HH:mm", { locale: th })} น.
                        </p>
                      )}
                      {event.registration_close_date && (
                        <p>
                          <span className="text-muted-foreground">ปิดรับ: </span>
                          {format(new Date(event.registration_close_date), "d MMM yyyy HH:mm", { locale: th })} น.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              {(event.waitlist_enabled || event.allow_overbooking) && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">ข้อมูลเพิ่มเติม</h3>
                    <div className="space-y-2 text-sm">
                      {event.waitlist_enabled && (
                        <p className="flex items-center gap-2">
                          <Badge variant="outline">Waitlist</Badge>
                          <span>มีระบบรายการรอ</span>
                          {event.max_waitlist_size && (
                            <span className="text-muted-foreground">
                              (สูงสุด {event.max_waitlist_size} คน)
                            </span>
                          )}
                        </p>
                      )}
                      {event.allow_overbooking && (
                        <p className="flex items-center gap-2">
                          <Badge variant="outline">Overbooking</Badge>
                          <span>อนุญาตให้รับเกิน {event.overbooking_percentage}%</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {isStaff ? (
                  <>
                    <Button
                      onClick={() => navigate(`/events/${event.id}/edit`)}
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      แก้ไขงานอีเว้นท์
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      ลบ
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={isFull || !registrationOpen || registrationClosed}
                    onClick={() => navigate(`/events/${event.id}/register`)}
                  >
                    {!registrationOpen
                      ? "ยังไม่เปิดรับสมัคร"
                      : registrationClosed
                      ? "ปิดรับสมัครแล้ว"
                      : isFull
                      ? "ที่นั่งเต็ม"
                      : "ลงทะเบียนเลย"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EventDetails;
