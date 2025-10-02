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
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Cover Image Preview */}
                {generatedData.cover_image_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={generatedData.cover_image_url}
                      alt="Cover"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">
                    {generatedData.title}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                    {generatedData.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">วันเวลาเริ่ม</p>
                    <p className="text-sm font-medium">
                      {new Date(generatedData.startDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      {new Date(generatedData.startDate).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ระยะเวลา</p>
                    <p className="text-sm font-medium">
                      {(() => {
                        if (!generatedData.endDate) return '-';
                        const start = new Date(generatedData.startDate);
                        const end = new Date(generatedData.endDate);
                        const diffMs = end.getTime() - start.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (diffHours > 24) {
                          const days = Math.floor(diffHours / 24);
                          const hours = diffHours % 24;
                          return `${days} วัน ${hours} ชม.`;
                        }
                        return `${diffHours} ชม. ${diffMinutes} นาที`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">จำนวนที่นั่ง</p>
                    <p className="text-sm font-medium">{generatedData.suggestedCapacity} คน</p>
                  </div>
                  {generatedData.eventLocation && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">สถานที่</p>
                      <p className="text-sm font-medium">{generatedData.eventLocation}</p>
                    </div>
                  )}
                </div>

                {/* Registration Dates */}
                {(generatedData.registrationOpenDate || generatedData.registrationCloseDate) && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">📅 ช่วงเวลาลงทะเบียน</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {generatedData.registrationOpenDate && (
                        <p>
                          เปิด: {new Date(generatedData.registrationOpenDate).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                      {generatedData.registrationCloseDate && (
                        <p>
                          ปิด: {new Date(generatedData.registrationCloseDate).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {generatedData.suggestedCategories && generatedData.suggestedCategories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">🏷️ หมวดหมู่</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedData.suggestedCategories.map((category: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {generatedData.ticketTypes && generatedData.ticketTypes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">🎫 ประเภทบัตร</p>
                    <div className="space-y-2">
                      {generatedData.ticketTypes.map((ticket: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-background rounded-lg border flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{ticket.name}</p>
                            {ticket.description && (
                              <p className="text-xs text-muted-foreground">
                                {ticket.description}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold text-primary">
                            {ticket.price === 0 ? 'ฟรี' : `${ticket.price} บาท`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
