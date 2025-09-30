import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface VisibilitySettingsProps {
  visibility: "public" | "private";
  onVisibilityChange: (visibility: "public" | "private") => void;
  invitationCode: string;
  onInvitationCodeChange: (code: string) => void;
}

export const VisibilitySettings = ({
  visibility,
  onVisibilityChange,
  invitationCode,
  onInvitationCodeChange,
}: VisibilitySettingsProps) => {
  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    onInvitationCodeChange(code);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>การมองเห็น</CardTitle>
        <CardDescription>กำหนดว่าใครสามารถเห็นและลงทะเบียนงานนี้</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Select */}
        <div className="space-y-2">
          <Label>ระดับการมองเห็น</Label>
          <Select value={visibility} onValueChange={(value: any) => onVisibilityChange(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">สาธารณะ (Public)</SelectItem>
              <SelectItem value="private">ส่วนตัว (Private)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Visibility Description */}
        <div className="p-3 bg-muted rounded-lg text-sm">
          {visibility === "public" ? (
            <p>งานนี้จะแสดงในรายการงานทั้งหมดและทุกคนสามารถลงทะเบียนได้</p>
          ) : (
            <p>งานนี้จะซ่อนจากรายการงานทั่วไป และต้องมีรหัสเชิญชวนเท่านั้นจึงจะสามารถเข้าถึงได้</p>
          )}
        </div>

        {/* Invitation Code for Private Events */}
        {visibility === "private" && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>รหัสเชิญชวน</Label>
              <div className="flex gap-2">
                <Input
                  value={invitationCode}
                  onChange={(e) => onInvitationCodeChange(e.target.value.toUpperCase())}
                  placeholder="เช่น ABC123"
                />
                <Button type="button" variant="outline" size="icon" onClick={generateCode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                ผู้ใช้ต้องใช้รหัสนี้เพื่อเข้าถึงหน้าลงทะเบียน
              </p>
            </div>

            {invitationCode && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium">ลิงก์ลงทะเบียน:</p>
                <p className="text-sm font-mono break-all mt-1">
                  {window.location.origin}/events/[event-id]/register?code={invitationCode}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
