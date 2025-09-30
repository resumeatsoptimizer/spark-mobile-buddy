import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, Globe, Linkedin, Twitter, Facebook, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  timezone: string | null;
  social_links: Record<string, string>;
}

interface Interest {
  id: string;
  interest_tag: string;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState("");

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
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้",
        variant: "destructive",
      });
    } else {
      setProfile(data as any);
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

  const updateProfile = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        timezone: profile.timezone,
        social_links: profile.social_links,
      })
      .eq("id", profile.id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทโปรไฟล์ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "บันทึกสำเร็จ",
        description: "อัพเดทข้อมูลโปรไฟล์เรียบร้อยแล้ว",
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">โปรไฟล์ของฉัน</h1>
          <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและความสนใจ</p>
        </div>

        <div className="grid gap-6">
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
                  <Label htmlFor="timezone">เขตเวลา</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="timezone"
                      className="pl-10"
                      value={profile.timezone || ""}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      placeholder="Asia/Bangkok"
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

              <Button onClick={updateProfile} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                บันทึกข้อมูล
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>โซเชียลมีเดีย</CardTitle>
              <CardDescription>เพิ่มลิงก์โซเชียลมีเดีย</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    className="pl-10"
                    value={profile.social_links?.linkedin || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        social_links: { ...profile.social_links, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="twitter"
                    className="pl-10"
                    value={profile.social_links?.twitter || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        social_links: { ...profile.social_links, twitter: e.target.value },
                      })
                    }
                    placeholder="https://twitter.com/username"
                  />
                </div>
              </div>
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
            </CardContent>
          </Card>

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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
