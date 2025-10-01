import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  REGISTRATION_FIELDS,
  FIELD_CATEGORIES,
  DEFAULT_ENABLED_FIELDS,
  getFieldsByCategory,
} from "@/lib/registrationFields";
import * as Icons from "lucide-react";

interface StaticFieldsConfigurationProps {
  enabledFields: string[];
  onChange: (enabledFields: string[]) => void;
}

export const StaticFieldsConfiguration = ({
  enabledFields,
  onChange,
}: StaticFieldsConfigurationProps) => {
  const [previewOpen, setPreviewOpen] = useState<string[]>(["basic"]);

  const toggleField = (fieldId: string) => {
    const field = REGISTRATION_FIELDS.find((f) => f.id === fieldId);
    if (field?.required) return; // Cannot toggle required fields

    if (enabledFields.includes(fieldId)) {
      onChange(enabledFields.filter((id) => id !== fieldId));
    } else {
      onChange([...enabledFields, fieldId]);
    }
  };

  const enableAllInCategory = (category: string) => {
    const categoryFields = getFieldsByCategory(category);
    const categoryFieldIds = categoryFields.map((f) => f.id);
    const newEnabledFields = Array.from(
      new Set([...enabledFields, ...categoryFieldIds])
    );
    onChange(newEnabledFields);
  };

  const disableAllInCategory = (category: string) => {
    const categoryFields = getFieldsByCategory(category).filter(
      (f) => !f.required
    );
    const categoryFieldIds = categoryFields.map((f) => f.id);
    onChange(enabledFields.filter((id) => !categoryFieldIds.includes(id)));
  };

  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const enabledCount = enabledFields.length;
  const totalCount = REGISTRATION_FIELDS.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>ฟิลด์ลงทะเบียน</span>
          <Badge variant="secondary">
            {enabledCount}/{totalCount} ฟิลด์
          </Badge>
        </CardTitle>
        <CardDescription>
          เลือกฟิลด์ที่ต้องการให้ผู้เข้าร่วมกรอกข้อมูล
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          value={previewOpen}
          onValueChange={setPreviewOpen}
          className="space-y-2"
        >
          {FIELD_CATEGORIES.map((category) => {
            const fields = getFieldsByCategory(category.id);
            const enabledInCategory = fields.filter((f) =>
              enabledFields.includes(f.id)
            ).length;
            const requiredInCategory = fields.filter((f) => f.required).length;
            const optionalInCategory = fields.length - requiredInCategory;

            return (
              <AccordionItem
                key={category.id}
                value={category.id}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      {getIcon(category.icon)}
                      <span className="font-medium">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {enabledInCategory}/{fields.length}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Category Actions */}
                  {optionalInCategory > 0 && (
                    <div className="flex gap-2 mb-3 text-xs">
                      <button
                        onClick={() => enableAllInCategory(category.id)}
                        className="text-primary hover:underline"
                      >
                        เปิดใช้ทั้งหมด
                      </button>
                      <span className="text-muted-foreground">•</span>
                      <button
                        onClick={() => disableAllInCategory(category.id)}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        ปิดฟิลด์เสริม
                      </button>
                    </div>
                  )}

                  {/* Fields List */}
                  <div className="space-y-3">
                    {fields.map((field) => {
                      const isEnabled = enabledFields.includes(field.id);
                      const isRequired = field.required;

                      return (
                        <div
                          key={field.id}
                          className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1 text-muted-foreground">
                              {getIcon(field.icon || "Circle")}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-medium cursor-pointer">
                                  {field.label}
                                </Label>
                                {isRequired && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs px-1.5 py-0"
                                  >
                                    จำเป็น
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {field.placeholder || field.labelEn}
                              </p>
                              {field.options && (
                                <p className="text-xs text-muted-foreground">
                                  ตัวเลือก: {field.options.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => toggleField(field.id)}
                            disabled={isRequired}
                            className="ml-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Summary */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-2 text-sm">
            <Icons.Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                ฟิลด์ที่เปิดใช้งาน: {enabledCount} ฟิลด์
              </p>
              <p className="text-muted-foreground text-xs">
                ฟิลด์ที่มีเครื่องหมาย "จำเป็น" จะต้องกรอกทุกครั้ง
                และไม่สามารถปิดการใช้งานได้
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
