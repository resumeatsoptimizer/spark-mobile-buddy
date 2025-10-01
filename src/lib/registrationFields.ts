import { z } from "zod";

export interface RegistrationField {
  id: string;
  label: string;
  labelEn?: string;
  type: "text" | "email" | "tel" | "select" | "textarea";
  required: boolean;
  category: "basic" | "work" | "event" | "emergency";
  placeholder?: string;
  options?: string[];
  icon?: string;
  order: number;
}

export const REGISTRATION_FIELDS: RegistrationField[] = [
  // Basic Information
  {
    id: "full_name",
    label: "ชื่อ-นามสกุล",
    labelEn: "Full Name",
    type: "text",
    required: true,
    category: "basic",
    placeholder: "กรอกชื่อ-นามสกุล",
    icon: "User",
    order: 1,
  },
  {
    id: "email",
    label: "อีเมล",
    labelEn: "Email",
    type: "email",
    required: true,
    category: "basic",
    placeholder: "example@email.com",
    icon: "Mail",
    order: 2,
  },
  {
    id: "phone",
    label: "เบอร์โทรศัพท์",
    labelEn: "Phone Number",
    type: "tel",
    required: true,
    category: "basic",
    placeholder: "0812345678",
    icon: "Phone",
    order: 3,
  },
  {
    id: "line_id",
    label: "Line ID",
    labelEn: "Line ID",
    type: "text",
    required: true,
    category: "basic",
    placeholder: "กรอก Line ID",
    icon: "MessageCircle",
    order: 4,
  },

  // Work Information
  {
    id: "organization",
    label: "องค์กร/บริษัท",
    labelEn: "Organization",
    type: "text",
    required: true,
    category: "work",
    placeholder: "ชื่อองค์กรหรือบริษัท",
    icon: "Building2",
    order: 5,
  },
  {
    id: "position",
    label: "ตำแหน่งงาน",
    labelEn: "Position",
    type: "text",
    required: false,
    category: "work",
    placeholder: "ตำแหน่งงาน",
    icon: "Briefcase",
    order: 6,
  },

  // Event Preferences
  {
    id: "dietary_requirements",
    label: "ข้อจำกัดด้านอาหาร",
    labelEn: "Dietary Requirements",
    type: "select",
    required: false,
    category: "event",
    placeholder: "เลือกข้อจำกัดด้านอาหาร",
    options: ["ไม่มี", "มังสวิรัติ", "ฮาลาล", "แพ้อาหารทะเล", "อื่นๆ"],
    icon: "UtensilsCrossed",
    order: 7,
  },
  {
    id: "shirt_size",
    label: "ไซส์เสื้อ",
    labelEn: "Shirt Size",
    type: "select",
    required: false,
    category: "event",
    placeholder: "เลือกไซส์เสื้อ",
    options: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    icon: "Shirt",
    order: 8,
  },
  {
    id: "transportation",
    label: "การเดินทาง",
    labelEn: "Transportation",
    type: "select",
    required: false,
    category: "event",
    placeholder: "วิธีการเดินทาง",
    options: ["รถยนต์ส่วนตัว", "รถสาธารณะ", "แท็กซี่/Grab", "จักรยาน/เดิน"],
    icon: "Car",
    order: 9,
  },

  // Emergency Contact
  {
    id: "emergency_contact_name",
    label: "ผู้ติดต่อฉุกเฉิน (ชื่อ)",
    labelEn: "Emergency Contact Name",
    type: "text",
    required: false,
    category: "emergency",
    placeholder: "ชื่อผู้ติดต่อฉุกเฉิน",
    icon: "UserCircle",
    order: 10,
  },
  {
    id: "emergency_contact_phone",
    label: "ผู้ติดต่อฉุกเฉิน (เบอร์โทร)",
    labelEn: "Emergency Contact Phone",
    type: "tel",
    required: false,
    category: "emergency",
    placeholder: "เบอร์โทรผู้ติดต่อฉุกเฉิน",
    icon: "PhoneCall",
    order: 11,
  },

  // Additional Notes
  {
    id: "additional_notes",
    label: "หมายเหตุเพิ่มเติม",
    labelEn: "Additional Notes",
    type: "textarea",
    required: false,
    category: "event",
    placeholder: "ข้อมูลเพิ่มเติมหรือความต้องการพิเศษ",
    icon: "FileText",
    order: 12,
  },
];

// Zod validation schema
export const createRegistrationSchema = (enabledFields: string[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  REGISTRATION_FIELDS.forEach((field) => {
    if (!enabledFields.includes(field.id)) return;

    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "email":
        fieldSchema = z.string().email("กรุณากรอกอีเมลที่ถูกต้อง");
        break;
      case "tel":
        fieldSchema = z
          .string()
          .regex(/^[0-9]{9,10}$/, "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง");
        break;
      case "textarea":
        fieldSchema = z.string().max(500, "ข้อความยาวเกิน 500 ตัวอักษร");
        break;
      default:
        fieldSchema = z.string();
    }

    if (field.required) {
      if (fieldSchema instanceof z.ZodString) {
        fieldSchema = fieldSchema.min(1, `กรุณากรอก${field.label}`);
      }
    } else {
      fieldSchema = fieldSchema.optional().or(z.literal(""));
    }

    schemaFields[field.id] = fieldSchema;
  });

  return z.object(schemaFields);
};

export type RegistrationFormData = z.infer<
  ReturnType<typeof createRegistrationSchema>
>;

export const DEFAULT_ENABLED_FIELDS = [
  "full_name",
  "email",
  "phone",
  "line_id",
  "organization",
];

export const getFieldsByCategory = (category: string) => {
  return REGISTRATION_FIELDS.filter((field) => field.category === category).sort(
    (a, b) => a.order - b.order
  );
};

export const FIELD_CATEGORIES = [
  { id: "basic", label: "ข้อมูลพื้นฐาน", icon: "UserCircle" },
  { id: "work", label: "ข้อมูลการทำงาน", icon: "Briefcase" },
  { id: "event", label: "ข้อมูลเกี่ยวกับงาน", icon: "Calendar" },
  { id: "emergency", label: "ผู้ติดต่อฉุกเฉิน", icon: "AlertCircle" },
];
