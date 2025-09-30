import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface WaitlistSettingsProps {
  waitlistEnabled: boolean;
  onWaitlistEnabledChange: (enabled: boolean) => void;
  maxWaitlistSize: number;
  onMaxWaitlistSizeChange: (size: number) => void;
  autoPromoteRule: "immediate" | "manual" | "timed";
  onAutoPromoteRuleChange: (rule: "immediate" | "manual" | "timed") => void;
  promoteWindowHours: number;
  onPromoteWindowHoursChange: (hours: number) => void;
}

export const WaitlistSettings = ({
  waitlistEnabled,
  onWaitlistEnabledChange,
  maxWaitlistSize,
  onMaxWaitlistSizeChange,
  autoPromoteRule,
  onAutoPromoteRuleChange,
  promoteWindowHours,
  onPromoteWindowHoursChange,
}: WaitlistSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการรอ (Waitlist)</CardTitle>
        <CardDescription>จัดการรายการรอเมื่องานเต็ม</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Waitlist */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>เปิดใช้งานรายการรอ</Label>
            <p className="text-sm text-muted-foreground">อนุญาตให้ผู้ใช้เข้ารายการรอเมื่อที่นั่งเต็ม</p>
          </div>
          <Switch checked={waitlistEnabled} onCheckedChange={onWaitlistEnabledChange} />
        </div>

        {waitlistEnabled && (
          <>
            {/* Max Waitlist Size */}
            <div className="space-y-2">
              <Label>จำนวนรายการรอสูงสุด</Label>
              <Input
                type="number"
                min="0"
                value={maxWaitlistSize || ""}
                onChange={(e) => onMaxWaitlistSizeChange(parseInt(e.target.value) || 0)}
                placeholder="ว่างไว้ = ไม่จำกัด"
              />
              <p className="text-sm text-muted-foreground">
                {maxWaitlistSize > 0 ? `รับได้สูงสุด ${maxWaitlistSize} คน` : "ไม่จำกัดจำนวน"}
              </p>
            </div>

            {/* Auto-Promote Rules */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>กฎการเลื่อนจากรายการรอ</Label>
                <Select value={autoPromoteRule} onValueChange={(value: any) => onAutoPromoteRuleChange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">เลื่อนทันที (Immediate)</SelectItem>
                    <SelectItem value="manual">เลื่อนด้วยตนเอง (Manual)</SelectItem>
                    <SelectItem value="timed">เลื่อนตามเวลา (Timed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rule Descriptions */}
              <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                {autoPromoteRule === "immediate" && (
                  <p>เมื่อมีที่นั่งว่าง ผู้ใช้ในรายการรอจะถูกเลื่อนขึ้นทันที</p>
                )}
                {autoPromoteRule === "manual" && (
                  <p>Admin ต้องอนุมัติการเลื่อนผู้ใช้จากรายการรอด้วยตนเอง</p>
                )}
                {autoPromoteRule === "timed" && (
                  <>
                    <p>ส่งการแจ้งเตือนให้ผู้ใช้ในรายการรอ พร้อมระยะเวลายืนยัน</p>
                    <div className="space-y-2 mt-3">
                      <Label>ระยะเวลายืนยัน (ชั่วโมง)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={promoteWindowHours || ""}
                        onChange={(e) => onPromoteWindowHoursChange(parseInt(e.target.value) || 24)}
                        placeholder="เช่น 24"
                      />
                      <p className="text-xs text-muted-foreground">
                        ผู้ใช้มีเวลา {promoteWindowHours} ชม. ในการยืนยัน
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
