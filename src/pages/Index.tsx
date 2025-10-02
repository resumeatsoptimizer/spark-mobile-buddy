import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ArrowRight, Sparkles } from "lucide-react";
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
}

const Index = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true })
      .limit(6);

    setEvents(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-background"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Iwelty Wellness Community</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-relaxed bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              ค้นพบกิจกรรม Wellness
              <br />
              ที่เหมาะกับคุณ
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              เข้าร่วมกิจกรรมด้านสุขภาพและความเป็นอยู่ที่ดี
              <br />
              พร้อมชุมชนที่ใส่ใจในทุกมิติของชีวิต
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/events")}>
                <Calendar className="mr-2 h-5 w-5" />
                ดูกิจกรรมทั้งหมด
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                เข้าสู่ระบบ
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">กิจกรรมที่กำลังจะมาถึง</h2>
          <p className="text-muted-foreground">
            เลือกกิจกรรมที่ท่านสนใจและลงทะเบียนได้ทันที
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">ยังไม่มีกิจกรรม</h3>
              <p className="text-muted-foreground">กลับมาตรวจสอบอีกครั้งในภายหลัง</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(event.start_date), "d MMM yyyy", { locale: th })}
                        </span>
                      </div>

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

                      <div className="flex gap-2">
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="text-center">
              <Button variant="outline" size="lg" onClick={() => navigate("/events")}>
                ดูกิจกรรมทั้งหมด
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Index;
