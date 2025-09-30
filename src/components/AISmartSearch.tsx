import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles, Calendar, MapPin, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  event_type: string;
  relevanceScore: number;
  matchReason: string;
  seats_remaining?: number;
}

const AISmartSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-smart-search', {
        body: { query }
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

      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to perform AI search",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Try 'tech events this weekend' or 'cooking classes near me'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Search
                </>
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Powered by AI - understands natural language queries
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">
                  No events found matching your search. Try different keywords!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} relevant events
                </p>
              </div>

              {results.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{result.title}</h3>
                            <Badge className="bg-primary/10 text-primary">
                              {result.relevanceScore}% Match
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(result.start_date).toLocaleDateString()}</span>
                            </div>
                            {result.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{result.location}</span>
                              </div>
                            )}
                            <Badge variant="outline">{result.event_type}</Badge>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.description}
                      </p>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">
                          <span className="font-medium">Why this matches: </span>
                          {result.matchReason}
                        </p>
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => navigate(`/events/${result.id}`)}
                      >
                        View Event Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AISmartSearch;
