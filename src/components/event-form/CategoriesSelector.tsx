import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface CategoriesSelectorProps {
  selectedCategories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

export function CategoriesSelector({
  selectedCategories,
  onCategoriesChange,
}: CategoriesSelectorProps) {
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("event_categories")
      .select("id, name, color")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    setAvailableCategories(data || []);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreating(true);
    const { data, error } = await supabase
      .from("event_categories")
      .insert({ name: newCategoryName.trim() })
      .select()
      .single();

    setIsCreating(false);

    if (error) {
      toast.error("ไม่สามารถสร้างหมวดหมู่ได้");
      return;
    }

    if (data) {
      setAvailableCategories([...availableCategories, data]);
      onCategoriesChange([...selectedCategories, data]);
      setNewCategoryName("");
      toast.success("สร้างหมวดหมู่สำเร็จ");
    }
  };

  const handleSelectCategory = (category: Category) => {
    const isSelected = selectedCategories.some((c) => c.id === category.id);
    
    if (isSelected) {
      onCategoriesChange(selectedCategories.filter((c) => c.id !== category.id));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleRemoveCategory = (categoryId: string) => {
    onCategoriesChange(selectedCategories.filter((c) => c.id !== categoryId));
  };

  return (
    <div className="space-y-2">
      <Label>หมวดหมู่งาน</Label>
      
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCategories.map((category) => (
          <Badge
            key={category.id}
            variant="secondary"
            className="pl-3 pr-1 py-1"
            style={category.color ? { backgroundColor: category.color } : undefined}
          >
            {category.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 ml-1 hover:bg-transparent"
              onClick={() => handleRemoveCategory(category.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มหมวดหมู่
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="ค้นหาหมวดหมู่..." />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">ไม่พบหมวดหมู่</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ชื่อหมวดหมู่ใหม่"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={isCreating || !newCategoryName.trim()}
                    >
                      สร้าง
                    </Button>
                  </div>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {availableCategories.map((category) => {
                  const isSelected = selectedCategories.some((c) => c.id === category.id);
                  return (
                    <CommandItem
                      key={category.id}
                      onSelect={() => {
                        handleSelectCategory(category);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {category.color && (
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <span>{category.name}</span>
                      </div>
                      {isSelected && <span className="ml-auto">✓</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
