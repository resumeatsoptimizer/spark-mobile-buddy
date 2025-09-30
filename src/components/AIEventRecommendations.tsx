import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  start_date: string;
  event_type: string;
  relevanceScore: number;
  reasoning: string;
  seats_remaining?: number;
}

const AIEventRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-event-recommendations', {
        body: {}
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

      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Recommendations
          </CardTitle>
          <CardDescription>
            Personalized event suggestions based on your interests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No recommendations available yet. Register for more events to improve suggestions!
            </p>
            <Button onClick={fetchRecommendations}>
              Refresh Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended For You
        </CardTitle>
        <CardDescription>
          AI-powered event suggestions based on your interests and activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{rec.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(rec.start_date).toLocaleDateString()}</span>
                      <Badge variant="outline" className="ml-2">
                        {rec.event_type}
                      </Badge>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary">
                    {rec.relevanceScore}% Match
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {rec.description}
                </p>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">
                    <span className="font-medium">Why this event? </span>
                    {rec.reasoning}
                  </p>
                </div>

                {rec.seats_remaining !== undefined && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{rec.seats_remaining} seats remaining</span>
                  </div>
                )}

                <Button 
                  className="w-full"
                  onClick={() => navigate(`/events/${rec.id}`)}
                >
                  View Event Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={fetchRecommendations}>
          Refresh Recommendations
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIEventRecommendations;
