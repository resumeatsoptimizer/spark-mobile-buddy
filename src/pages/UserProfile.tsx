import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, Save, Camera, Upload, Instagram, Facebook, MessageCircle, Shield } from "lucide-react";
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

      if (file.size > 1048576) {
        toast({
          title: "ไฟล์ใหญ่เกินไป",
          description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 1 MB",
          variant: "destructive",
        });
        return;
      }

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

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/avatar.${fileExt}`;

      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

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
      const updateData: any = {
        name: profile.name || null,
      };

      if (profile.phone !== undefined) updateData.phone = profile.phone;
      if (profile.bio !== undefined) updateData.bio = profile.bio;
      if (profile.line_id !== undefined) updateData.line_id = profile.line_id;
      if (profile.social_links !== undefined) updateData.social_links = profile.social_links;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (error) {
        let errorMessage = "ไม่สามารถอัพเดทโปรไฟล์ได้";
        let errorTitle = "เกิดข้อผิดพลาด";

        if (error.code === "42703") {
          errorTitle = "ต้องอัพเดทฐานข้อมูล";
          errorMessage = "กรุณารัน SQL migrations ในฐานข้อมูล Supabase";
        } else if (error.code === "42501") {
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
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">กำลังโหลดโปรไฟล์...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border">
        <div className="container mx-auto py-12 px-4 max-w-4xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">โปรไฟล์ของฉัน</h1>
            <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและความสนใจของคุณ</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Main Profile Card */}
        <Card className="border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-0">
            {/* Avatar Section */}
            <div className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-8 rounded-t-lg">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar with Upload */}
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-lg ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.name || "User"} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {profile.name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    {uploading ? (
                      <Upload className="h-8 w-8 text-white animate-pulse" />
                    ) : (
                      <div className="text-center">
                        <Camera className="h-8 w-8 text-white mx-auto mb-1" />
                        <span className="text-xs text-white font-medium">เปลี่ยนรูป</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-accent rounded-full border-4 border-background shadow-md" />
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left">
                  {isEditing ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <Label htmlFor="name" className="text-xs text-muted-foreground">ชื่อ-นามสกุล</Label>
                        <Input
                          id="name"
                          value={profile.name || ""}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          placeholder="ชื่อ-นามสกุล"
                          className="mt-1 font-semibold text-lg"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{profile.email}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <h2 className="text-3xl font-bold text-foreground">{profile.name || "ไม่ระบุชื่อ"}</h2>
                      <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{profile.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                {!isEditing && (
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    variant="outline" 
                    className="hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    แก้ไขโปรไฟล์
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-8 space-y-6">
              {isEditing ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Personal Info Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      ข้อมูลส่วนตัว
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone" className="text-xs text-muted-foreground">เบอร์โทรศัพท์</Label>
                        <div className="relative mt-1">
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
                        <Label htmlFor="line_id" className="text-xs text-muted-foreground">LINE ID</Label>
                        <div className="relative mt-1">
                          <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="line_id"
                            className="pl-10"
                            value={profile.line_id || ""}
                            onChange={(e) => setProfile({ ...profile, line_id: e.target.value })}
                            placeholder="LINE ID"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bio" className="text-xs text-muted-foreground">เกี่ยวกับฉัน</Label>
                      <Textarea
                        id="bio"
                        className="mt-1 min-h-[100px]"
                        value={profile.bio || ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="บอกเล่าเกี่ยวกับตัวคุณ..."
                      />
                    </div>
                  </div>

                  {/* Social Links Section */}
                  <div className="space-y-4 pt-6 border-t border-border">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Instagram className="h-5 w-5 text-primary" />
                      โซเชียลมีเดีย
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="facebook" className="text-xs text-muted-foreground">Facebook</Label>
                        <div className="relative mt-1">
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
                        <Label htmlFor="instagram" className="text-xs text-muted-foreground">Instagram</Label>
                        <div className="relative mt-1">
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
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Bio Section */}
                  {profile.bio && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground mb-1">เกี่ยวกับฉัน</p>
                      <p className="text-foreground leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Contact Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.phone && (
                      <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">เบอร์โทรศัพท์</p>
                          <p className="text-sm font-medium text-foreground">{profile.phone}</p>
                        </div>
                      </div>
                    )}
                    {profile.line_id && (
                      <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg border border-border hover:border-accent/50 transition-colors">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">LINE ID</p>
                          <p className="text-sm font-medium text-foreground">{profile.line_id}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  {(profile.social_links?.facebook || profile.social_links?.instagram) && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-3">โซเชียลมีเดีย</p>
                      <div className="flex gap-3">
                        {profile.social_links?.facebook && (
                          <a
                            href={profile.social_links.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-primary hover:text-primary-foreground rounded-lg border border-border transition-all duration-300 group"
                          >
                            <Facebook className="h-5 w-5" />
                            <span className="text-sm font-medium">Facebook</span>
                          </a>
                        )}
                        {profile.social_links?.instagram && (
                          <a
                            href={profile.social_links.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-accent hover:text-accent-foreground rounded-lg border border-border transition-all duration-300 group"
                          >
                            <Instagram className="h-5 w-5" />
                            <span className="text-sm font-medium">Instagram</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!profile.bio && !profile.phone && !profile.line_id && !profile.social_links?.facebook && !profile.social_links?.instagram && (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลโปรไฟล์</p>
                      <Button 
                        onClick={() => setIsEditing(true)} 
                        variant="outline" 
                        size="sm"
                        className="mt-3"
                      >
                        เพิ่มข้อมูลโปรไฟล์
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Interests Section */}
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">ความสนใจ</h3>
                  <Badge variant="secondary" className="text-xs">
                    {interests.length} รายการ
                  </Badge>
                </div>
                
                {/* Interests Display */}
                <div className="flex flex-wrap gap-2">
                  {interests.length > 0 ? (
                    interests.map((interest) => (
                      <Badge
                        key={interest.id}
                        variant="secondary"
                        className="px-3 py-1.5 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover:scale-105"
                        onClick={() => removeInterest(interest.id)}
                      >
                        {interest.interest_tag}
                        <span className="ml-1.5 font-bold">×</span>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-2">
                      ยังไม่มีความสนใจ เพิ่มความสนใจเพื่อรับคำแนะนำกิจกรรมที่เหมาะกับคุณ
                    </p>
                  )}
                </div>

                {/* Add Interest Form */}
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="เช่น กีฬา, ดนตรี, ศิลปะ, เทคโนโลยี"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={addInterest} disabled={!newInterest.trim()}>
                    เพิ่ม
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy Card */}
        <Card className="border-border shadow-lg hover:shadow-xl transition-shadow duration-300 mt-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">ข้อมูลและความเป็นส่วนตัว</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  จัดการข้อมูลส่วนตัวของคุณ ดาวน์โหลดข้อมูลทั้งหมด หรือขอลบข้อมูลตามนโยบายความเป็นส่วนตัว
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/data-privacy")}
                  className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  จัดการข้อมูลและความเป็นส่วนตัว
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sticky Footer with Save/Cancel Buttons */}
        {isEditing && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-50 animate-in slide-in-from-bottom duration-300">
            <div className="container mx-auto max-w-4xl px-4 py-4 flex justify-between items-center">
              <p className="text-sm text-muted-foreground hidden sm:block">
                อย่าลืมบันทึกการเปลี่ยนแปลงของคุณ
              </p>
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={updateProfile} className="gap-2">
                  <Save className="h-4 w-4" />
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;