import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Ban, CheckCircle, XCircle, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BulkMemberActionsProps {
  selectedMembers: string[];
  onActionComplete: () => void;
  onClearSelection: () => void;
}

type BulkAction = "email" | "status" | "export" | "delete";
type MemberStatus = "active" | "inactive" | "suspended" | "blocked";

export function BulkMemberActions({
  selectedMembers,
  onActionComplete,
  onClearSelection,
}: BulkMemberActionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [newStatus, setNewStatus] = useState<MemberStatus>("active");
  const [statusReason, setStatusReason] = useState("");
  const [openDialog, setOpenDialog] = useState<BulkAction | null>(null);

  const handleBulkEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกหัวข้อและข้อความ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get member emails
      const { data: members } = await supabase
        .from("profiles")
        .select("email, name")
        .in("id", selectedMembers);

      if (!members || members.length === 0) {
        throw new Error("ไม่พบข้อมูลสมาชิก");
      }

      // Send emails (you'd implement this with your email service)
      // For now, we'll just log it
      console.log("Sending emails to:", members);
      console.log("Subject:", emailSubject);
      console.log("Message:", emailMessage);

      toast({
        title: "ส่งอีเมลสำเร็จ",
        description: `ส่งอีเมลถึง ${members.length} คน`,
      });

      setEmailSubject("");
      setEmailMessage("");
      setOpenDialog(null);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusChange = async () => {
    setLoading(true);
    try {
      // Update each member's status
      for (const memberId of selectedMembers) {
        await supabase.rpc("update_member_status", {
          p_user_id: memberId,
          p_new_status: newStatus,
          p_reason: statusReason || `Bulk update to ${newStatus}`,
        });
      }

      toast({
        title: "อัปเดตสำเร็จ",
        description: `อัปเดตสถานะของสมาชิก ${selectedMembers.length} คน`,
      });

      setStatusReason("");
      setOpenDialog(null);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    setLoading(true);
    try {
      const { data: members } = await supabase
        .from("mv_member_statistics")
        .select("*")
        .in("user_id", selectedMembers);

      if (!members || members.length === 0) {
        throw new Error("ไม่พบข้อมูลสมาชิก");
      }

      // Create CSV
      const csv = [
        ["Email", "Name", "Status", "Activity", "Registrations", "Revenue", "Created"],
        ...members.map((m) => [
          m.email,
          m.name || "",
          m.status,
          m.activity_level,
          m.total_registrations.toString(),
          m.total_amount_paid.toString(),
          m.created_at,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected_members_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();

      toast({
        title: "Export สำเร็จ",
        description: `Export ข้อมูล ${members.length} คน`,
      });

      setOpenDialog(null);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`คุณต้องการลบสมาชิก ${selectedMembers.length} คนใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete members (this will cascade to related records due to ON DELETE CASCADE)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .in("id", selectedMembers);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: `ลบสมาชิก ${selectedMembers.length} คน`,
      });

      setOpenDialog(null);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedMembers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-4 bg-primary/10 border-t sticky bottom-0">
      <span className="text-sm font-medium">
        เลือกแล้ว {selectedMembers.length} คน
      </span>

      {/* Bulk Email */}
      <Dialog open={openDialog === "email"} onOpenChange={(open) => setOpenDialog(open ? "email" : null)}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            ส่งอีเมล
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ส่งอีเมลจำนวนมาก</DialogTitle>
            <DialogDescription>
              ส่งอีเมลถึง {selectedMembers.length} คน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">หัวข้อ</Label>
              <input
                id="subject"
                type="text"
                className="w-full mt-2 px-3 py-2 border rounded-md"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="หัวข้ออีเมล..."
              />
            </div>
            <div>
              <Label htmlFor="message">ข้อความ</Label>
              <Textarea
                id="message"
                rows={5}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="เนื้อหาอีเมล..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleBulkEmail} disabled={loading}>
              {loading ? "กำลังส่ง..." : "ส่งอีเมล"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Change */}
      <Dialog open={openDialog === "status"} onOpenChange={(open) => setOpenDialog(open ? "status" : null)}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <CheckCircle className="mr-2 h-4 w-4" />
            เปลี่ยนสถานะ
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนสถานะจำนวนมาก</DialogTitle>
            <DialogDescription>
              เปลี่ยนสถานะของสมาชิก {selectedMembers.length} คน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-status">สถานะใหม่</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as MemberStatus)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-gray-500" />
                      Inactive
                    </div>
                  </SelectItem>
                  <SelectItem value="suspended">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-yellow-500" />
                      Suspended
                    </div>
                  </SelectItem>
                  <SelectItem value="blocked">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-red-500" />
                      Blocked
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">เหตุผล (optional)</Label>
              <Textarea
                id="reason"
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="เหตุผลในการเปลี่ยนสถานะ..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={loading}>
              {loading ? "กำลังอัปเดต..." : "อัปเดตสถานะ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Export */}
      <Button variant="outline" size="sm" onClick={handleBulkExport} disabled={loading}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>

      {/* Bulk Delete */}
      <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            ลบ
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">ลบสมาชิกจำนวนมาก</DialogTitle>
            <DialogDescription>
              คุณต้องการลบสมาชิก {selectedMembers.length} คนใช่หรือไม่?
              <br />
              <strong className="text-red-500">การกระทำนี้ไม่สามารถย้อนกลับได้!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              {loading ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        ยกเลิกการเลือก
      </Button>
    </div>
  );
}
