import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "checkbox" | "radio" | "textarea" | "number" | "date";
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: string;
}

interface FieldBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export const FieldBuilder = ({ fields, onChange }: FieldBuilderProps) => {
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const addField = () => {
    const newField: CustomField = {
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    };
    setEditingField(newField);
  };

  const saveField = () => {
    if (!editingField || !editingField.label.trim()) {
      return;
    }

    const existingIndex = fields.findIndex((f) => f.id === editingField.id);
    if (existingIndex >= 0) {
      const updated = [...fields];
      updated[existingIndex] = editingField;
      onChange(updated);
      console.log("✏️ Field updated:", editingField);
    } else {
      onChange([...fields, editingField]);
      console.log("➕ Field added:", editingField);
    }
    setEditingField(null);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const editField = (field: CustomField) => {
    setEditingField({ ...field });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>ฟิลด์ลงทะเบียน</span>
          {fields.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({fields.length} ฟิลด์เพิ่มเติม)
            </span>
          )}
        </CardTitle>
        <CardDescription>กำหนดฟิลด์ที่ต้องการให้ผู้เข้าร่วมกรอก</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fixed Fields Info */}
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-1">ฟิลด์พื้นฐาน (ถูกเพิ่มอัตโนมัติ):</p>
          <p className="text-muted-foreground">ชื่อ-นามสกุล, อีเมล, เบอร์โทรศัพท์</p>
        </div>

        {/* Custom Fields List */}
        {fields.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm">ฟิลด์เพิ่มเติม:</p>
            {fields.map((field) => (
              <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {field.type} {field.required && "• จำเป็น"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => editField(field)}>
                    แก้ไข
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeField(field.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Field Form */}
        {editingField ? (
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="space-y-2">
              <Label>ชื่อฟิลด์</Label>
              <Input
                value={editingField.label}
                onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                placeholder="เช่น อายุ, ที่อยู่"
              />
            </div>

            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select
                value={editingField.type}
                onValueChange={(value: any) => setEditingField({ ...editingField, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">ข้อความ</SelectItem>
                  <SelectItem value="email">อีเมล</SelectItem>
                  <SelectItem value="phone">เบอร์โทร</SelectItem>
                  <SelectItem value="number">ตัวเลข</SelectItem>
                  <SelectItem value="date">วันที่</SelectItem>
                  <SelectItem value="textarea">ข้อความยาว</SelectItem>
                  <SelectItem value="select">เลือกตัวเลือก</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={editingField.placeholder || ""}
                onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                placeholder="ข้อความช่วยเหลือ"
              />
            </div>

            {(editingField.type === "select" || editingField.type === "radio") && (
              <div className="space-y-2">
                <Label>ตัวเลือก (แยกด้วยเครื่องหมายจุลภาค)</Label>
                <Input
                  value={editingField.options?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      options: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                  placeholder="ตัวเลือก 1, ตัวเลือก 2"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={editingField.required}
                onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
              />
              <Label>จำเป็นต้องกรอก</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveField} disabled={!editingField.label.trim()}>
                บันทึกฟิลด์
              </Button>
              <Button variant="outline" onClick={() => setEditingField(null)}>
                ยกเลิก
              </Button>
            </div>
            {!editingField.label.trim() && (
              <p className="text-sm text-destructive">กรุณากรอกชื่อฟิลด์</p>
            )}
          </div>
        ) : (
          <Button onClick={addField} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มฟิลด์
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
