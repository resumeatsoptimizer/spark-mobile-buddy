import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, Save, Camera, Upload, Instagram, Facebook, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  line_id: string | null;
  social_links: Record<string, string>;
}

interface Interest {
  id: string;
  interest_tag: string;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchProfile();
    fetchInterests();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Explicitly select only columns that exist
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, name, phone, bio, avatar_url, social_links, timezone, preferences, created_at, updated_at")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้",
        variant: "destructive",
      });
    } else if (data) {
      // Initialize social_links if null
      const profileData = {
        ...data,
        social_links: (data.social_links as any) || {},
      };
      setProfile(profileData as any);
    }
    setLoading(false);
  };

  const fetchInterests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("user_interests")
      .select("*")
      .eq("user_id", session.user.id);

    if (data) {
      setInterests(data);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !profile) return;

      // Validate file size (1 MB)
      if (file.size > 1048576) {
        toast({
          title: "ไฟล์ใหญ่เกินไป",
          description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 1 MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "ประเภทไฟล์ไม่ถูกต้อง",
          description: "กรุณาเลือกไฟล์ JPG, PNG หรือ WebP",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: urlData.publicUrl });

      toast({
        title: "อัพโหลดสำเร็จ",
        description: "อัพเดทรูปโปรไฟล์เรียบร้อยแล้ว",
      });
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัพโหลดรูปได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    try {
      // Only include fields that are safe to update
      const updateData: any = {
        name: profile.name || null,
      };

      // Add optional fields only if they're defined and not causing errors
      if (profile.phone !== undefined) updateData.phone = profile.phone;
      if (profile.bio !== undefined) updateData.bio = profile.bio;
      if (profile.line_id !== undefined) updateData.line_id = profile.line_id;
      if (profile.social_links !== undefined) updateData.social_links = profile.social_links;

      console.log("Updating profile with data:", updateData);

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (error) {
        console.error("Profile update error:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);

        // Provide specific error messages based on error type
        let errorMessage = "ไม่สามารถอัพเดทโปรไฟล์ได้";
        let errorTitle = "เกิดข้อผิดพลาด";

        if (error.code === "42703") {
          // Column does not exist
          errorTitle = "ต้องอัพเดทฐานข้อมูล";
          errorMessage = "กรุณารัน SQL migrations ในฐานข้อมูล Supabase";
        } else if (error.code === "42501") {
          // Permission denied
          errorMessage = "คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้ กรุณาเข้าสู่ระบบใหม่";
        } else if (error.message.includes("policy")) {
          errorMessage = "ระบบรักษาความปลอดภัย กรุณาเข้าสู่ระบบใหม่";
        } else if (error.message) {
          errorMessage = `${error.message} (Code: ${error.code || 'unknown'})`;
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      setIsEditing(false);
      toast({
        title: "บันทึกสำเร็จ",
        description: "อัพเดทข้อมูลโปรไฟล์เรียบร้อยแล้ว",
      });
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด",
        variant: "destructive",
      });
    }
  };

  const addInterest = async () => {
    if (!newInterest.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("user_interests")
      .insert({
        user_id: session.user.id,
        interest_tag: newInterest.trim(),
      });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มความสนใจได้",
        variant: "destructive",
      });
    } else {
      setNewInterest("");
      fetchInterests();
      toast({
        title: "เพิ่มสำเร็จ",
        description: "เพิ่มความสนใจเรียบร้อยแล้ว",
      });
    }
  };

  const removeInterest = async (id: string) => {
    const { error } = await supabase
      .from("user_interests")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบความสนใจได้",
        variant: "destructive",
      });
    } else {
      fetchInterests();
      toast({
        title: "ลบสำเร็จ",
        description: "ลบความสนใจเรียบร้อยแล้ว",
      });
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center">
          <div className="text-center">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">โปรไฟล์ของฉัน</h1>
          <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและความสนใจ</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.name || "User"} />
                    <AvatarFallback className="text-4xl">
                      {profile.name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploading ? (
                      <Upload className="h-8 w-8 text-white animate-pulse" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="w-full">
                  <h2 className="text-2xl font-bold">{profile.name || "ไม่ระบุชื่อ"}</h2>
                  <p className="text-muted-foreground">{profile.email}</p>

                  {/* Display profile info when not editing */}
                  {!isEditing && (
                    <div className="mt-6 space-y-3 text-left max-w-md mx-auto">
                      {profile.bio && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">เกี่ยวกับฉัน</p>
                          <p className="text-sm mt-1">{profile.bio}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {profile.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.phone}</span>
                          </div>
                        )}

                        {profile.line_id && (
                          <div className="flex items-center gap-2 text-sm">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.line_id}</span>
                          </div>
                        )}
                      </div>

                      {/* Social Links */}
                      {(profile.social_links?.facebook || profile.social_links?.instagram) && (
                        <div className="flex justify-center gap-3 pt-2">
                          {profile.social_links?.facebook && (
                            <a
                              href={profile.social_links.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                              <Facebook className="h-5 w-5" />
                            </a>
                          )}
                          {profile.social_links?.instagram && (
                            <a
                              href={profile.social_links.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                              <Instagram className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="mt-4">
                    แก้ไขโปรไฟล์
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Form - Show only when editing */}
          {isEditing && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                  <CardDescription>อัพเดทข้อมูลส่วนตัวของคุณ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          className="pl-10"
                          value={profile.name || ""}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          placeholder="ชื่อ-นามสกุล"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">อีเมล</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          className="pl-10"
                          value={profile.email}
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          className="pl-10"
                          value={profile.phone || ""}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="0812345678"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="line_id">Line ID</Label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="line_id"
                          className="pl-10"
                          value={profile.line_id || ""}
                          onChange={(e) => setProfile({ ...profile, line_id: e.target.value })}
                          placeholder="@yourlineid"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">เกี่ยวกับฉัน</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio || ""}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="บอกเล่าเกี่ยวกับตัวคุณ..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>โซเชียลมีเดีย</CardTitle>
                  <CardDescription>เพิ่มลิงก์โซเชียลมีเดีย</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="facebook"
                        className="pl-10"
                        value={profile.social_links?.facebook || ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            social_links: { ...profile.social_links, facebook: e.target.value },
                          })
                        }
                        placeholder="https://facebook.com/username"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="instagram"
                        className="pl-10"
                        value={profile.social_links?.instagram || ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            social_links: { ...profile.social_links, instagram: e.target.value },
                          })
                        }
                        placeholder="https://instagram.com/username"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interests - Show only when editing */}
              <Card>
                <CardHeader>
                  <CardTitle>ความสนใจ</CardTitle>
                  <CardDescription>เพิ่มความสนใจของคุณเพื่อหาผู้ร่วมงานที่ใช่</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="เช่น Technology, Marketing, Design"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addInterest();
                        }
                      }}
                    />
                    <Button onClick={addInterest}>เพิ่ม</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <Badge
                        key={interest.id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeInterest(interest.id)}
                      >
                        {interest.interest_tag} ×
                      </Badge>
                    ))}
                    {interests.length === 0 && (
                      <p className="text-sm text-muted-foreground">ยังไม่มีความสนใจ</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Sticky Save Button - Show only when editing */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4">
          <div className="container mx-auto max-w-4xl flex gap-4">
            <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={updateProfile} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              บันทึกข้อมูล
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
