import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Trash2, GripVertical, Plus, Edit2, Check, X } from "lucide-react";
import { CustomField } from "../hooks/useEventFormState";
import { FieldTemplateLibrary } from "./FieldTemplateLibrary";

interface InlineFieldBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export const InlineFieldBuilder = ({ fields, onChange }: InlineFieldBuilderProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const addField = (fieldTemplate?: Omit<CustomField, "id">) => {
    const newField: CustomField = fieldTemplate
      ? { id: Date.now().toString(), ...fieldTemplate }
      : {
          id: Date.now().toString(),
          label: "New Field",
          type: "text",
          required: false,
          placeholder: "",
        };
    
    onChange([...fields, newField]);
    setEditingId(newField.id);
    setEditingField(newField);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const startEdit = (field: CustomField) => {
    setEditingId(field.id);
    setEditingField({ ...field });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
  };

  const saveEdit = () => {
    if (!editingField) return;
    onChange(fields.map(f => f.id === editingField.id ? editingField : f));
    setEditingId(null);
    setEditingField(null);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...fields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newFields.length) return;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    onChange(newFields);
  };

  return (
    <div className="space-y-4">
      <FieldTemplateLibrary onAddField={addField} />

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Registration Fields ({fields.length})</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addField()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Field
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-3">
              {editingId === field.id ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Field Label</Label>
                    <Input
                      value={editingField?.label || ""}
                      onChange={(e) =>
                        setEditingField(editingField ? { ...editingField, label: e.target.value } : null)
                      }
                      placeholder="Field label"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Field Type</Label>
                      <Select
                        value={editingField?.type || "text"}
                        onValueChange={(value) =>
                          setEditingField(editingField ? { ...editingField, type: value } : null)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="tel">Phone</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={editingField?.placeholder || ""}
                        onChange={(e) =>
                          setEditingField(
                            editingField ? { ...editingField, placeholder: e.target.value } : null
                          )
                        }
                        placeholder="Placeholder text"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {editingField?.type === "select" && (
                    <div>
                      <Label className="text-xs">Options (comma-separated)</Label>
                      <Input
                        value={editingField?.options?.join(", ") || ""}
                        onChange={(e) =>
                          setEditingField(
                            editingField
                              ? { ...editingField, options: e.target.value.split(",").map(o => o.trim()) }
                              : null
                          )
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingField?.required || false}
                      onCheckedChange={(checked) =>
                        setEditingField(editingField ? { ...editingField, required: checked } : null)
                      }
                    />
                    <Label className="text-xs">Required field</Label>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button type="button" variant="default" size="sm" onClick={saveEdit}>
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 p-0 hover:bg-transparent"
                      onClick={() => moveField(index, "up")}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 p-0 hover:bg-transparent"
                      onClick={() => moveField(index, "down")}
                      disabled={index === fields.length - 1}
                    >
                      <GripVertical className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{field.label}</span>
                      {field.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {field.type} {field.placeholder && `• ${field.placeholder}`}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(field)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No custom fields yet. Add one using the templates above or create a custom field.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
