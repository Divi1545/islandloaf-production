import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantData {
  growthScore: number;
  weeklyTip: string;
  revenueGoal: {
    current: number;
    target: number;
  };
}

export default function AiAssistant() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [assistantData, setAssistantData] = useState<AIAssistantData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAssistantData = async () => {
      try {
        setIsDataLoading(true);
        const response = await fetch('/api/ai/assistant-data', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch assistant data');
        }

        const data = await response.json();
        setAssistantData(data);
      } catch (err) {
        console.error('Assistant data fetch error:', err);
        // Set fallback data
        setAssistantData({
          growthScore: 75,
          weeklyTip: "Consider adding more photos to your villa listings. Properties with 20+ photos get 38% more bookings.",
          revenueGoal: {
            current: 1200,
            target: 2000
          }
        });
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAssistantData();
  }, []);

  const handleAskAi = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setAiResponse(data.response);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      console.error('AI request error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGrowthScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const getGrowthScoreText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30 md:w-64 w-full max-w-xs">
        <Card className="border border-neutral-200 overflow-hidden shadow-lg">
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <i className="ri-robot-line mr-2"></i>
              <h3 className="font-medium">AI Assistant</h3>
            </div>
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:text-neutral-200"
            >
              <i className={isMinimized ? "ri-add-line" : "ri-subtract-line"}></i>
            </button>
          </div>
          
          {!isMinimized && (
            <CardContent className="p-4">
              {isDataLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-2 bg-gray-200 animate-pulse rounded-full"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-2 bg-gray-200 animate-pulse rounded-full"></div>
                </div>
              ) : assistantData ? (
                <>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-semibold">Growth Score</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${getGrowthScoreColor(assistantData.growthScore)}`}>
                        {getGrowthScoreText(assistantData.growthScore)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full animate-progress" style={{ width: `${assistantData.growthScore}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-neutral-500">
                      <span>0</span>
                      <span>{assistantData.growthScore}/100</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-1">Weekly Tip</h4>
                    <p className="text-xs text-neutral-700">{assistantData.weeklyTip}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-1">Revenue Goal</h4>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(assistantData.revenueGoal.current / assistantData.revenueGoal.target) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-neutral-500">
                      <span>$0</span>
                      <span>${assistantData.revenueGoal.current}/${assistantData.revenueGoal.target}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Unable to load assistant data
                </div>
              )}
              
              <div className="mt-3">
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  variant="outline" 
                  className="w-full bg-primary-50 text-primary hover:bg-primary-100 py-2 px-3 rounded-md text-sm font-medium"
                >
                  Ask AI Assistant
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask AI Assistant</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="What can I improve this week? How can I increase bookings?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            
            {aiResponse && (
              <div className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
                <h4 className="text-sm font-medium mb-1">AI Suggestion:</h4>
                <p className="text-sm">{aiResponse}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleAskAi}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? "Thinking..." : "Ask AI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
