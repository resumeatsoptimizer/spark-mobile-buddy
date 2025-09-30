import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Tag, FolderTree, Repeat, FileText, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminEventManagement() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Category form
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1', icon: '' });
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Tag form
  const [newTag, setNewTag] = useState('');

  // Template form
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', template_data: {} });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, tagsRes, seriesRes, templatesRes] = await Promise.all([
        supabase.from('event_categories').select('*').order('name'),
        supabase.from('event_tags').select('*').order('name'),
        supabase.from('event_series').select('*').order('created_at', { ascending: false }),
        supabase.from('event_templates').select('*').order('created_at', { ascending: false }),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (tagsRes.data) setTags(tagsRes.data);
      if (seriesRes.data) setSeries(seriesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load management data",
        variant: "destructive",
      });
    }
  };

  const createCategory = async () => {
    if (!newCategory.name) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('event_categories')
        .insert([newCategory]);

      if (error) throw error;

      toast({ title: "Success", description: "Category created successfully" });
      setNewCategory({ name: '', description: '', color: '#6366f1', icon: '' });
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_categories')
        .update({
          name: editingCategory.name,
          description: editingCategory.description,
          color: editingCategory.color,
          icon: editingCategory.icon,
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({ title: "Success", description: "Category updated successfully" });
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Success", description: "Category deleted successfully" });
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTag) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_tags')
        .insert([{ name: newTag }]);

      if (error) throw error;

      toast({ title: "Success", description: "Tag created successfully" });
      setNewTag('');
      loadData();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Success", description: "Tag deleted successfully" });
      loadData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Event Management</h1>
          <p className="text-muted-foreground">
            Manage categories, tags, templates, and recurring events
          </p>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">
              <FolderTree className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="tags">
              <Tag className="w-4 h-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="series">
              <Repeat className="w-4 h-4 mr-2" />
              Series
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Create Category</CardTitle>
                  <CardDescription>Add a new event category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="category-name">Name</Label>
                    <Input
                      id="category-name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="Conference, Workshop, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-desc">Description</Label>
                    <Textarea
                      id="category-desc"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="Category description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-color">Color</Label>
                    <Input
                      id="category-color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    />
                  </div>
                  <Button onClick={createCategory} disabled={loading || !newCategory.name}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Category
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Categories</CardTitle>
                  <CardDescription>Manage your event categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <p className="font-medium">{category.name}</p>
                            {category.description && (
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingCategory(category)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Category</DialogTitle>
                              </DialogHeader>
                              {editingCategory && (
                                <div className="space-y-4">
                                  <div>
                                    <Label>Name</Label>
                                    <Input
                                      value={editingCategory.name}
                                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Description</Label>
                                    <Textarea
                                      value={editingCategory.description || ''}
                                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Color</Label>
                                    <Input
                                      type="color"
                                      value={editingCategory.color}
                                      onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                                    />
                                  </div>
                                  <Button onClick={updateCategory} disabled={loading}>
                                    Update Category
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No categories yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tags">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Create Tag</CardTitle>
                  <CardDescription>Add a new event tag</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="tag-name">Tag Name</Label>
                    <Input
                      id="tag-name"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="networking, beginner-friendly, etc."
                    />
                  </div>
                  <Button onClick={createTag} disabled={loading || !newTag}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tag
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Tags</CardTitle>
                  <CardDescription>Manage your event tags</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="flex items-center gap-2">
                        {tag.name}
                        <button
                          onClick={() => deleteTag(tag.id)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 w-full">No tags yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Event Templates</CardTitle>
                <CardDescription>Create reusable event templates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Templates feature coming soon. You'll be able to save event configurations as templates for quick reuse.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="series">
            <Card>
              <CardHeader>
                <CardTitle>Event Series</CardTitle>
                <CardDescription>Manage recurring event series</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Series feature coming soon. You'll be able to create recurring events with custom schedules.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}