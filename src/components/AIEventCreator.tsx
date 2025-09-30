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
  suggestedDuration: { hours: number; minutes: number };
  suggestedCapacity: number;
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
  const [eventType, setEventType] = useState<"physical" | "virtual" | "hybrid">("physical");
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<EventData | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe the event you want to create",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-event-creator', {
        body: { prompt, eventType }
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
          AI Event Creator
        </CardTitle>
        <CardDescription>
          Describe your event idea and let AI generate comprehensive details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="prompt">Event Description</Label>
          <Textarea
            id="prompt"
            placeholder="e.g., 'A tech conference for AI developers with workshops on LLMs and practical sessions'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] mt-2"
          />
        </div>

        <div>
          <Label htmlFor="eventType">Event Type</Label>
          <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
            <SelectTrigger id="eventType" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
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
                {generatedData.marketingTips && (
                  <div>
                    <span className="text-sm font-medium">Marketing Tips:</span>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                      {generatedData.marketingTips.slice(0, 3).map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
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
