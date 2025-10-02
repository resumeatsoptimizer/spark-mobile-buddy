import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EventData {
  title: string;
  description: string;
  cover_image_url?: string;
  eventLocation?: string;
  googleMapUrl?: string;
  googleMapEmbedCode?: string;
  startDate?: string;
  endDate?: string;
  suggestedDuration: { hours: number; minutes: number };
  suggestedCapacity: number;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  ticketTypes?: Array<{
    name: string;
    price: number;
    seats: number;
    description?: string;
  }>;
  waitlistEnabled?: boolean;
  maxWaitlistSize?: number;
  visibility?: string;
  meetingPlatform?: string;
  customFields?: any[];
  suggestedCategories?: string[];
  suggestedTags?: string[];
  marketingTips?: string[];
}

interface AIEventCreatorProps {
  onEventGenerated: (eventData: EventData) => void;
}

const AIEventCreator = ({ onEventGenerated }: AIEventCreatorProps) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<EventData | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "กรุณาใส่ Event Prompt",
        description: "โปรดระบุข้อมูลงานตามโครงสร้างที่กำหนด",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-event-creator', {
        body: { prompt }
      });

      if (error) {
        if (error.message.includes('Rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Too many requests. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        if (error.message.includes('Payment required')) {
          toast({
            title: "Credits Required",
            description: "Please add credits to continue using AI features.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setGeneratedData(data.eventData);
      toast({
        title: "Event Generated!",
        description: "AI has created your event details. Review and customize below.",
      });
    } catch (error) {
      console.error('Error generating event:', error);
      toast({
        title: "Error",
        description: "Failed to generate event details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseEvent = () => {
    if (generatedData) {
      onEventGenerated(generatedData);
      toast({
        title: "Event Data Applied",
        description: "AI-generated details have been applied to the form",
      });
      setGeneratedData(null);
      setPrompt("");
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          สร้างงานด้วย AI
        </CardTitle>
        <CardDescription>
          ใส่ข้อมูลงานตามโครงสร้างด้านล่าง AI จะสร้างรายละเอียดที่เกี่ยวข้องให้อัตโนมัติ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="prompt">Event Prompt</Label>
          <Textarea
            id="prompt"
            placeholder={`กรุณาใส่ข้อมูลตามโครงสร้างนี้:

ชื่องาน: [ระบุชื่องานที่ต้องการ]
ประเภท: [สัมมนา/workshop/กีฬา/คอนเสิร์ต/นิทรรศการ/ฝึกอบรม/การกุศล]
สถานที่: [ระบุสถานที่จัดงาน หรือ online]
จำนวนผู้เข้าร่วม: [จำนวนคน]
วันเวลาจัดงาน: [วัน/เดือน/ปี และเวลา]
เปิด-ปิดรับสมัคร: [วันที่เปิดและปิดรับสมัคร]
ราคา: [ฟรี หรือ ระบุราคา เช่น 500 บาท]
ภาพปก: [URL ภาพปก (ถ้ามี)]
Google Maps: [URL หรือ Embed Code (ถ้ามี)]
รายละเอียดเพิ่มเติม: [อธิบายลักษณะงาน กิจกรรม สิ่งที่ผู้เข้าร่วมจะได้รับ ฯลฯ]

ตัวอย่าง:
ชื่องาน: งานวิ่งมาราธอน Bangkok Half Marathon 2025
ประเภท: กีฬา
สถานที่: สวนลุมพินี กรุงเทพฯ
จำนวนผู้เข้าร่วม: 1000 คน
วันเวลาจัดงาน: 15 มกราคม 2025 เวลา 06:00-10:00 น.
เปิด-ปิดรับสมัคร: เปิด 1 พฤศจิกายน 2024 ปิด 10 มกราคม 2025
ราคา: 500 บาท
รายละเอียดเพิ่มเติม: วิ่งระยะทาง 21 กม. รับเสื้อ เหรียญ และของที่ระลึก มีจุดน้ำดื่มและเจลทุก 3 กม.`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[200px] mt-2 text-sm font-mono"
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={loading || !prompt.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Event Details
            </>
          )}
        </Button>

        {generatedData && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h4 className="font-semibold mb-2">Generated Event</h4>
              <div className="space-y-2">
                {generatedData.cover_image_url && (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border mb-3">
                    <img
                      src={generatedData.cover_image_url}
                      alt={generatedData.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Title:</span>
                  <p className="text-sm text-muted-foreground">{generatedData.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {generatedData.description}
                  </p>
                </div>
                {generatedData.eventLocation && (
                  <div>
                    <span className="text-sm font-medium">Location:</span>
                    <p className="text-sm text-muted-foreground">{generatedData.eventLocation}</p>
                  </div>
                )}
                {generatedData.startDate && (
                  <div className="flex gap-4">
                    <div>
                      <span className="text-sm font-medium">Start:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(generatedData.startDate).toLocaleDateString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">End:</span>
                      <p className="text-sm text-muted-foreground">
                        {generatedData.endDate ? new Date(generatedData.endDate).toLocaleDateString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) : '-'}
                      </p>
                    </div>
                  </div>
                )}
                {generatedData.registrationOpenDate && generatedData.registrationCloseDate && (
                  <div className="flex gap-4">
                    <div>
                      <span className="text-sm font-medium">เปิดรับสมัคร:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(generatedData.registrationOpenDate).toLocaleDateString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">ปิดรับสมัคร:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(generatedData.registrationCloseDate).toLocaleDateString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm font-medium">Duration:</span>
                    <p className="text-sm text-muted-foreground">
                      {generatedData.suggestedDuration.hours}h {generatedData.suggestedDuration.minutes}m
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Capacity:</span>
                    <p className="text-sm text-muted-foreground">
                      {generatedData.suggestedCapacity} people
                    </p>
                  </div>
                </div>
                {generatedData.ticketTypes && generatedData.ticketTypes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Ticket Types:</span>
                    <div className="space-y-1 mt-1">
                      {generatedData.ticketTypes.map((ticket, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex justify-between">
                          <span>{ticket.name}</span>
                          <span className="font-medium">
                            {ticket.price === 0 ? 'ฟรี' : `${ticket.price.toLocaleString('th-TH')} บาท`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {generatedData.suggestedCategories && (
                  <div>
                    <span className="text-sm font-medium">Categories:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {generatedData.suggestedCategories.map((cat, i) => (
                        <Badge key={i} variant="secondary">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUseEvent} className="flex-1">
                Use This Event
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setGeneratedData(null);
                  setPrompt("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIEventCreator;
