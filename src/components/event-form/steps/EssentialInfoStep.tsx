import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { EventFormData } from "../hooks/useEventFormState";
import { Calendar, Users, FileText, Clock } from "lucide-react";

interface EssentialInfoStepProps {
  formData: EventFormData;
  onChange: (updates: Partial<EventFormData>) => void;
}

export const EssentialInfoStep = ({ formData, onChange }: EssentialInfoStepProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Event Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Enter event title"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe your event..."
              rows={4}
              className="mt-1.5 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date & Time *
              </Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => onChange({ start_date: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Date & Time *
              </Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => onChange({ end_date: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="seats_total" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Seats *
            </Label>
            <Input
              id="seats_total"
              type="number"
              min="1"
              value={formData.seats_total}
              onChange={(e) => onChange({ seats_total: parseInt(e.target.value) || 0 })}
              required
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of participants for this event
            </p>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        * Required fields
      </div>
    </div>
  );
};
