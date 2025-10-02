import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={registrationOpenDate}
                  onChange={(e) => onRegistrationOpenDateChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onRegistrationOpenDateChange("")}
                  title="Reset เป็นค่าเริ่มต้น (เปิดทันที)"
                  disabled={!registrationOpenDate}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">ว่างไว้ = เปิดทันที</p>
            </div>
            <div className="space-y-2">
              <Label>ปิดลงทะเบียน</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={registrationCloseDate}
                  onChange={(e) => onRegistrationCloseDateChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onRegistrationCloseDateChange("")}
                  title="Reset เป็นค่าเริ่มต้น (ปิดเมื่องานเริ่ม)"
                  disabled={!registrationCloseDate}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">ว่างไว้ = ปิดเมื่องานเริ่ม</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
