import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";

export interface TicketType {
  id: string;
  name: string;
  seats_allocated: number;
  price: number;
}

interface CapacitySettingsProps {
  totalSeats: number;
  onTotalSeatsChange: (seats: number) => void;
  ticketTypes: TicketType[];
  onTicketTypesChange: (types: TicketType[]) => void;
  allowOverbooking: boolean;
  onAllowOverbookingChange: (allow: boolean) => void;
  overbookingPercentage: number;
  onOverbookingPercentageChange: (percentage: number) => void;
}

export const CapacitySettings = ({
  totalSeats,
  onTotalSeatsChange,
  ticketTypes,
  onTicketTypesChange,
  allowOverbooking,
  onAllowOverbookingChange,
  overbookingPercentage,
  onOverbookingPercentageChange,
}: CapacitySettingsProps) => {
  const [showTicketTypes, setShowTicketTypes] = useState(ticketTypes.length > 0);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);

  const addTicketType = () => {
    const newTicket: TicketType = {
      id: crypto.randomUUID(),
      name: "",
      seats_allocated: 0,
      price: 0,
    };
    setEditingTicket(newTicket);
  };

  const saveTicketType = () => {
    if (!editingTicket || !editingTicket.name || editingTicket.seats_allocated <= 0) return;

    const existingIndex = ticketTypes.findIndex((t) => t.id === editingTicket.id);
    if (existingIndex >= 0) {
      const updated = [...ticketTypes];
      updated[existingIndex] = editingTicket;
      onTicketTypesChange(updated);
    } else {
      onTicketTypesChange([...ticketTypes, editingTicket]);
    }
    setEditingTicket(null);
  };

  const removeTicketType = (id: string) => {
    onTicketTypesChange(ticketTypes.filter((t) => t.id !== id));
  };

  const editTicketType = (ticket: TicketType) => {
    setEditingTicket({ ...ticket });
  };

  const totalAllocated = ticketTypes.reduce((sum, t) => sum + t.seats_allocated, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>การจัดการที่นั่ง</CardTitle>
        <CardDescription>กำหนดจำนวนที่นั่งและประเภทตั๋ว</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Seats */}
        <div className="space-y-2">
          <Label>จำนวนที่นั่งทั้งหมด *</Label>
          <Input
            type="number"
            min="1"
            value={totalSeats || ""}
            onChange={(e) => onTotalSeatsChange(parseInt(e.target.value) || 0)}
            placeholder="เช่น 100"
          />
        </div>

        {/* Ticket Types Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>แบ่งประเภทตั๋ว</Label>
            <p className="text-sm text-muted-foreground">จัดการหลายประเภทตั๋วพร้อมราคา</p>
          </div>
          <Switch checked={showTicketTypes} onCheckedChange={setShowTicketTypes} />
        </div>

        {/* Ticket Types */}
        {showTicketTypes && (
          <div className="space-y-4">
            {ticketTypes.length > 0 && (
              <div className="space-y-2">
                {totalAllocated > totalSeats && (
                  <p className="text-sm text-destructive">
                    ⚠️ ที่นั่งที่จัดสรรเกินจำนวนทั้งหมด ({totalAllocated}/{totalSeats})
                  </p>
                )}
                {ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{ticket.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.seats_allocated} ที่นั่ง • ฿{ticket.price}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => editTicketType(ticket)}>
                        แก้ไข
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeTicketType(ticket.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Ticket Form */}
            {editingTicket ? (
              <div className="space-y-4 p-4 border rounded-lg bg-card">
                <div className="space-y-2">
                  <Label>ชื่อประเภทตั๋ว</Label>
                  <Input
                    value={editingTicket.name}
                    onChange={(e) => setEditingTicket({ ...editingTicket, name: e.target.value })}
                    placeholder="เช่น VIP, General"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวนที่นั่ง</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingTicket.seats_allocated || ""}
                      onChange={(e) =>
                        setEditingTicket({
                          ...editingTicket,
                          seats_allocated: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ราคา (฿)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editingTicket.price || ""}
                      onChange={(e) =>
                        setEditingTicket({ ...editingTicket, price: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveTicketType}
                    disabled={!editingTicket.name || editingTicket.seats_allocated <= 0}
                  >
                    บันทึกประเภทตั๋ว
                  </Button>
                  <Button variant="outline" onClick={() => setEditingTicket(null)}>
                    ยกเลิก
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={addTicketType} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มประเภทตั๋ว
              </Button>
            )}
          </div>
        )}

        {/* Overbooking */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>อนุญาตให้จองเกิน (Overbooking)</Label>
              <p className="text-sm text-muted-foreground">รับจองเกินจำนวนที่นั่งจริง</p>
            </div>
            <Switch checked={allowOverbooking} onCheckedChange={onAllowOverbookingChange} />
          </div>

          {allowOverbooking && (
            <div className="space-y-2">
              <Label>เปอร์เซ็นต์ Overbooking</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={overbookingPercentage || ""}
                onChange={(e) => onOverbookingPercentageChange(parseInt(e.target.value) || 0)}
                placeholder="เช่น 10 (สำหรับ 10%)"
              />
              <p className="text-sm text-muted-foreground">
                รับได้สูงสุด: {Math.floor(totalSeats * (1 + overbookingPercentage / 100))} ที่นั่ง
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
