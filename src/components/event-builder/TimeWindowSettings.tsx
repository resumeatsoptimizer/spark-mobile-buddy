import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimeWindowSettingsProps {
  startDate: string;
  endDate: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRegistrationOpenDateChange: (date: string) => void;
  onRegistrationCloseDateChange: (date: string) => void;
}

export const TimeWindowSettings = ({
  startDate,
  endDate,
  registrationOpenDate,
  registrationCloseDate,
  onStartDateChange,
  onEndDateChange,
  onRegistrationOpenDateChange,
  onRegistrationCloseDateChange,
}: TimeWindowSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ช่วงเวลา</CardTitle>
        <CardDescription>กำหนดวันเวลาของงานและการลงทะเบียน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Event Dates */}
        <div className="space-y-4">
          <h3 className="font-medium">วันจัดงาน</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>วันที่เริ่มต้น *</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>วันที่สิ้นสุด *</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Registration Window */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">ช่วงเวลาลงทะเบียน</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>เปิดลงทะเบียน</Label>
              <Input
                type="datetime-local"
                value={registrationOpenDate}
                onChange={(e) => onRegistrationOpenDateChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">ว่างไว้ = เปิดทันที</p>
            </div>
            <div className="space-y-2">
              <Label>ปิดลงทะเบียน</Label>
              <Input
                type="datetime-local"
                value={registrationCloseDate}
                onChange={(e) => onRegistrationCloseDateChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">ว่างไว้ = ปิดเมื่องานเริ่ม</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
