import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Eye, EyeOff, Image, Settings } from "lucide-react";
import { EventFormData } from "../hooks/useEventFormState";
import { useState } from "react";
import { format } from "date-fns";

interface ReviewStepProps {
  formData: EventFormData;
  onChange: (updates: Partial<EventFormData>) => void;
}

export const ReviewStep = ({ formData, onChange }: ReviewStepProps) => {
  const [openSections, setOpenSections] = useState<string[]>(["summary"]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  return (
    <div className="space-y-3">
      {/* Event Summary */}
      <Collapsible open={openSections.includes("summary")} onOpenChange={() => toggleSection("summary")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Event Summary</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("summary") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0">
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Title</span>
                <p className="font-medium">{formData.title || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Description</span>
                <p className="text-sm">{formData.description || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Start</span>
                  <p className="text-sm">
                    {formData.start_date ? format(new Date(formData.start_date), "PPp") : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">End</span>
                  <p className="text-sm">
                    {formData.end_date ? format(new Date(formData.end_date), "PPp") : "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Seats</span>
                  <p className="font-medium">{formData.seats_total}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Custom Fields</span>
                  <p className="font-medium">{formData.custom_fields.length}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ticket Types</span>
                  <p className="font-medium">{formData.ticket_types.length}</p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Visibility Settings */}
      <Collapsible open={openSections.includes("visibility")} onOpenChange={() => toggleSection("visibility")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                {formData.visibility === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="font-medium">Visibility</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("visibility") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 space-y-3">
            <div>
              <Label className="text-xs">Event Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => onChange({ visibility: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="invite_only">Invite Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.visibility === "private" || formData.visibility === "invite_only") && (
              <div>
                <Label className="text-xs">Invitation Code</Label>
                <Input
                  value={formData.invitation_code}
                  onChange={(e) => onChange({ invitation_code: e.target.value })}
                  placeholder="Enter invitation code"
                  className="h-8 text-sm"
                />
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Advanced Settings */}
      <Collapsible open={openSections.includes("advanced")} onOpenChange={() => toggleSection("advanced")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="font-medium">Advanced Settings</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("advanced") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Allow Overbooking</Label>
              <Switch
                checked={formData.allow_overbooking}
                onCheckedChange={(checked) => onChange({ allow_overbooking: checked })}
              />
            </div>

            {formData.allow_overbooking && (
              <div>
                <Label className="text-xs">Overbooking Percentage</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.overbooking_percentage}
                  onChange={(e) => onChange({ overbooking_percentage: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Allow {formData.overbooking_percentage}% more registrations than capacity
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Cover Image */}
      <Collapsible open={openSections.includes("image")} onOpenChange={() => toggleSection("image")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="font-medium">Cover Image</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("image") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0">
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input
                value={formData.cover_image_url}
                onChange={(e) => onChange({ cover_image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="h-8 text-sm"
              />
              {formData.cover_image_url && (
                <div className="mt-3">
                  <img
                    src={formData.cover_image_url}
                    alt="Cover preview"
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
