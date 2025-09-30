import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, AlertCircle, Target, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type AIInsight = Database['public']['Tables']['ai_insights']['Row'];

interface InsightData {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems?: string[];
  metrics?: Record<string, any>;
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'prediction': return TrendingUp;
    case 'recommendation': return Lightbulb;
    case 'trend': return TrendingUp;
    case 'anomaly': return AlertCircle;
    case 'optimization': return Target;
    default: return Sparkles;
  }
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'default';
  }
};

export const AIInsightsPanel = ({ eventId }: { eventId?: string }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async (insightType: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights-generator', {
        body: { eventId, insightType }
      });

      if (error) throw error;

      setInsights(prev => [data.insight, ...prev]);
      
      toast({
        title: "Insight Generated",
        description: "New AI insight has been generated successfully",
      });
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: "Error",
        description: "Failed to generate insight",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_insights')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => generateInsights('prediction')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          <span className="ml-2">Predict Attendance</span>
        </Button>
        <Button
          onClick={() => generateInsights('recommendation')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
          <span className="ml-2">Get Recommendations</span>
        </Button>
        <Button
          onClick={() => generateInsights('trend')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          <span className="ml-2">Analyze Trends</span>
        </Button>
        <Button
          onClick={() => generateInsights('optimization')}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          <span className="ml-2">Optimize Event</span>
        </Button>
        <Button
          onClick={loadInsights}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No insights yet. Generate AI insights to get started.</p>
            </CardContent>
          </Card>
        ) : (
          insights.map((insight) => {
            const Icon = getInsightIcon(insight.insight_type);
            // Safely parse the insight_data JSONB field
            let insightData: InsightData;
            try {
              insightData = typeof insight.insight_data === 'string' 
                ? JSON.parse(insight.insight_data)
                : insight.insight_data as unknown as InsightData;
            } catch {
              insightData = {
                title: 'Parse Error',
                description: 'Could not parse insight data',
                impact: 'low'
              };
            }

            return (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{insightData.title}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getImpactColor(insightData.impact) as any}>
                        {insightData.impact} impact
                      </Badge>
                      <Badge variant="outline">
                        {Math.round((insight.confidence_score || 0) * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="capitalize">{insight.insight_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{insightData.description}</p>
                  
                  {insightData.actionItems && insightData.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Action Items:</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {insightData.actionItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insightData.metrics && Object.keys(insightData.metrics).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Key Metrics:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(insightData.metrics).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-muted-foreground">{key}:</span>{' '}
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Generated {new Date(insight.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
