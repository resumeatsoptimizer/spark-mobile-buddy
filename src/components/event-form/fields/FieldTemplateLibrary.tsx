import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, MessageSquare, Calendar, Hash } from "lucide-react";
import { CustomField } from "../hooks/useEventFormState";

interface FieldTemplate {
  icon: any;
  label: string;
  field: Omit<CustomField, "id">;
}

const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    icon: User,
    label: "Full Name",
    field: {
      label: "Full Name",
      type: "text",
      required: true,
      placeholder: "Enter your full name",
    },
  },
  {
    icon: Mail,
    label: "Email",
    field: {
      label: "Email Address",
      type: "email",
      required: true,
      placeholder: "your@email.com",
    },
  },
  {
    icon: Phone,
    label: "Phone",
    field: {
      label: "Phone Number",
      type: "tel",
      required: false,
      placeholder: "+66 XX XXX XXXX",
    },
  },
  {
    icon: Calendar,
    label: "Date of Birth",
    field: {
      label: "Date of Birth",
      type: "date",
      required: false,
    },
  },
  {
    icon: Hash,
    label: "Age",
    field: {
      label: "Age",
      type: "number",
      required: false,
      placeholder: "Your age",
      validation: { min: 1, max: 120 },
    },
  },
  {
    icon: MapPin,
    label: "Address",
    field: {
      label: "Address",
      type: "textarea",
      required: false,
      placeholder: "Enter your address",
    },
  },
  {
    icon: MessageSquare,
    label: "Dietary Restrictions",
    field: {
      label: "Dietary Restrictions",
      type: "select",
      required: false,
      options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"],
    },
  },
  {
    icon: MessageSquare,
    label: "T-Shirt Size",
    field: {
      label: "T-Shirt Size",
      type: "select",
      required: false,
      options: ["XS", "S", "M", "L", "XL", "XXL"],
    },
  },
];

interface FieldTemplateLibraryProps {
  onAddField: (field: Omit<CustomField, "id">) => void;
}

export const FieldTemplateLibrary = ({ onAddField }: FieldTemplateLibraryProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3">Quick Add Fields</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {FIELD_TEMPLATES.map((template, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={() => onAddField(template.field)}
          >
            <template.icon className="h-4 w-4" />
            <span className="text-xs">{template.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
