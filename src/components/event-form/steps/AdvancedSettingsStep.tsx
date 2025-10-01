import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, MapPin, Video, Calendar, ListChecks, Ticket } from "lucide-react";
import { EventFormData, TicketType } from "../hooks/useEventFormState";
import { StaticFieldsConfiguration } from "@/components/event-builder/StaticFieldsConfiguration";
import { DEFAULT_ENABLED_FIELDS } from "@/lib/registrationFields";
import { useState } from "react";

interface AdvancedSettingsStepProps {
  formData: EventFormData;
  onChange: (updates: Partial<EventFormData>) => void;
}

export const AdvancedSettingsStep = ({ formData, onChange }: AdvancedSettingsStepProps) => {
  const [openSections, setOpenSections] = useState<string[]>(["fields"]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const addTicketType = () => {
    const newTicket: TicketType = {
      id: Date.now().toString(),
      name: "General Admission",
      price: 0,
      seats_allocated: 50,
    };
    onChange({ ticket_types: [...formData.ticket_types, newTicket] });
  };

  const updateTicketType = (index: number, updates: Partial<TicketType>) => {
    const updated = [...formData.ticket_types];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ticket_types: updated });
  };

  const removeTicketType = (index: number) => {
    onChange({ ticket_types: formData.ticket_types.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {/* Registration Fields */}
      <Collapsible open={openSections.includes("fields")} onOpenChange={() => toggleSection("fields")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="font-medium">Registration Fields</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("fields") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0">
            <div className="text-sm text-muted-foreground p-4 text-center">
              Registration fields are now configured in the main event form
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Ticket Types */}
      <Collapsible open={openSections.includes("tickets")} onOpenChange={() => toggleSection("tickets")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                <span className="font-medium">Ticket Types ({formData.ticket_types.length})</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("tickets") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0">
            <div className="space-y-3">
              {formData.ticket_types.map((ticket, index) => (
                <Card key={ticket.id || index} className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Ticket Name</Label>
                      <Input
                        value={ticket.name}
                        onChange={(e) => updateTicketType(index, { name: e.target.value })}
                        placeholder="e.g., VIP, Early Bird"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price (THB)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={ticket.price}
                        onChange={(e) => updateTicketType(index, { price: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Seats</Label>
                      <Input
                        type="number"
                        min="1"
                        value={ticket.seats_allocated}
                        onChange={(e) => updateTicketType(index, { seats_allocated: parseInt(e.target.value) || 0 })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTicketType(index)}
                        className="w-full"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTicketType} className="w-full">
                Add Ticket Type
              </Button>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Registration Window */}
      <Collapsible open={openSections.includes("window")} onOpenChange={() => toggleSection("window")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Registration Window</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("window") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Open Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.registration_open_date}
                  onChange={(e) => onChange({ registration_open_date: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Close Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.registration_close_date}
                  onChange={(e) => onChange({ registration_close_date: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Waitlist Settings */}
      <Collapsible open={openSections.includes("waitlist")} onOpenChange={() => toggleSection("waitlist")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="font-medium">Waitlist</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("waitlist") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Enable Waitlist</Label>
              <Switch
                checked={formData.waitlist_enabled}
                onCheckedChange={(checked) => onChange({ waitlist_enabled: checked })}
              />
            </div>
            {formData.waitlist_enabled && (
              <>
                <div>
                  <Label className="text-xs">Max Waitlist Size</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.max_waitlist_size || ""}
                    onChange={(e) => onChange({ max_waitlist_size: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Unlimited"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Auto-Promote Rule</Label>
                  <Select
                    value={formData.auto_promote_rule}
                    onValueChange={(value) => onChange({ auto_promote_rule: value })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="fcfs">First Come First Served</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Promotion Window (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.promote_window_hours}
                    onChange={(e) => onChange({ promote_window_hours: parseInt(e.target.value) || 24 })}
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Location */}
      <Collapsible open={openSections.includes("location")} onOpenChange={() => toggleSection("location")}>
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Location & Meeting</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("location") ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 space-y-3">
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => onChange({ event_type: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.event_type === "physical" || formData.event_type === "hybrid") && (
              <>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => onChange({ location: e.target.value })}
                    placeholder="Event venue address"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Google Maps URL</Label>
                  <Input
                    value={formData.google_map_url}
                    onChange={(e) => onChange({ google_map_url: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}

            {(formData.event_type === "online" || formData.event_type === "hybrid") && (
              <>
                <div>
                  <Label className="text-xs">Meeting Platform</Label>
                  <Select
                    value={formData.meeting_platform}
                    onValueChange={(value) => onChange({ meeting_platform: value })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Meeting URL</Label>
                  <Input
                    value={formData.meeting_url}
                    onChange={(e) => onChange({ meeting_url: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Meeting ID</Label>
                  <Input
                    value={formData.meeting_id}
                    onChange={(e) => onChange({ meeting_id: e.target.value })}
                    placeholder="123 456 7890"
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
