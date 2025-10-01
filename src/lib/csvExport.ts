import { format } from "date-fns";

interface Registration {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  form_data?: any;
  events: {
    id: string;
    title: string;
    start_date: string;
    location: string | null;
  };
  ticket_types: {
    name: string;
    price: number;
  } | null;
  user_id: {
    email: string;
    name: string;
  };
}

const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    confirmed: "ยืนยันแล้ว",
    pending: "รอดำเนินการ",
    cancelled: "ยกเลิก",
    waitlist: "รายการรอ",
  };
  return statusMap[status] || status;
};

const translatePaymentStatus = (status: string): string => {
  const paymentMap: Record<string, string> = {
    paid: "ชำระแล้ว",
    unpaid: "ยังไม่ชำระ",
    refunded: "คืนเงินแล้ว",
  };
  return paymentMap[status] || status;
};

const formatThaiDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  } catch {
    return dateString;
  }
};

const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) return "";
  const stringField = String(field);
  if (stringField.includes(",") || stringField.includes('"') || stringField.includes("\n")) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

export const exportRegistrationsToCSV = (registrations: Registration[], filename?: string) => {
  // CSV Header
  const headers = [
    "ลำดับ",
    "ชื่องาน",
    "ชื่อผู้ลงทะเบียน",
    "อีเมล",
    "เบอร์โทร",
    "ประเภทบัตร",
    "ราคา (บาท)",
    "สถานะการลงทะเบียน",
    "สถานะการชำระ",
    "วันที่ลงทะเบียน",
    "วันที่งาน",
    "สถานที่จัดงาน",
  ];

  // Build CSV rows
  const rows = registrations.map((reg, index) => [
    index + 1,
    escapeCSVField(reg.events.title),
    escapeCSVField(reg.form_data?.name || "-"),
    escapeCSVField(reg.user_id.email),
    escapeCSVField(reg.form_data?.phone || "-"),
    escapeCSVField(reg.ticket_types?.name || "-"),
    escapeCSVField(reg.ticket_types?.price || 0),
    escapeCSVField(translateStatus(reg.status)),
    escapeCSVField(translatePaymentStatus(reg.payment_status)),
    escapeCSVField(formatThaiDate(reg.created_at)),
    escapeCSVField(formatThaiDate(reg.events.start_date)),
    escapeCSVField(reg.events.location || "-"),
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.join(","))
    .join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const defaultFilename = `registrations_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename || defaultFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportEventRegistrations = (
  registrations: Registration[],
  eventTitle: string
) => {
  const sanitizedEventTitle = eventTitle.replace(/[^a-zA-Z0-9ก-๙]/g, "_");
  const filename = `registrations_${sanitizedEventTitle}_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
  exportRegistrationsToCSV(registrations, filename);
};
