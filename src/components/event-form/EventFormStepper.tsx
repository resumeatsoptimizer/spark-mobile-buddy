import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useEventFormState } from "./hooks/useEventFormState";
import { EssentialInfoStep } from "./steps/EssentialInfoStep";
import { AdvancedSettingsStep } from "./steps/AdvancedSettingsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useNavigate } from "react-router-dom";

interface EventFormStepperProps {
  eventId?: string;
}

const STEPS = [
  { id: "essential", label: "Essential Info", icon: Circle },
  { id: "advanced", label: "Advanced", icon: Circle },
  { id: "review", label: "Review", icon: Circle },
];

export const EventFormStepper = ({ eventId }: EventFormStepperProps) => {
  const navigate = useNavigate();
  const {
    formData,
    updateFormData,
    saveEvent,
    isLoading,
    isSaving,
    currentStep,
    setCurrentStep,
  } = useEventFormState(eventId);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    try {
      await saveEvent();
      navigate("/events");
    } catch (error) {
      // Error already handled in saveEvent
    }
  };

  const isEssentialComplete = formData.title && formData.start_date && formData.end_date && formData.seats_total > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={STEPS[currentStep].id} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {STEPS.map((step, index) => {
            const isComplete = index < currentStep || (index === 0 && isEssentialComplete);
            const isCurrent = index === currentStep;
            
            return (
              <TabsTrigger
                key={step.id}
                value={step.id}
                onClick={() => setCurrentStep(index)}
                className="relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <div className="flex items-center gap-2">
                  {isComplete && !isCurrent ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className={`h-4 w-4 ${isCurrent ? "fill-current" : ""}`} />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="essential" className="mt-0">
          <EssentialInfoStep formData={formData} onChange={updateFormData} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <AdvancedSettingsStep formData={formData} onChange={updateFormData} />
        </TabsContent>

        <TabsContent value="review" className="mt-0">
          <ReviewStep formData={formData} onChange={updateFormData} />
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background border-t mt-6 p-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </div>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!isEssentialComplete && currentStep === 0}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={isSaving || !isEssentialComplete}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : eventId ? "Update Event" : "Create Event"}
          </Button>
        )}
      </div>
    </div>
  );
};
