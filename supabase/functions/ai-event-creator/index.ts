import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `คุณเป็น AI ผู้ช่วยสร้างรายละเอียดงานอีเวนต์ภาษาไทย

คำแนะนำสำคัญ - อ่านอย่างละเอียด:
1. ผู้ใช้จะให้ข้อมูลในโครงสร้างที่กำหนด คุณต้องแยกแยะและใช้ข้อมูลแต่ละส่วนอย่างแม่นยำ
2. **ห้ามสร้างข้อมูลใหม่ที่แตกต่างจากที่ผู้ใช้ระบุ** - ใช้ข้อมูลตรงๆ ที่ผู้ใช้ให้มา:
   - ถ้าระบุ "ชื่องาน: X" → ใช้ชื่อ X ตรงๆ ห้ามแต่งใหม่
   - ถ้าระบุ "ราคา: 500 บาท" → price ต้องเป็น 500 ไม่ใช่ราคาอื่น
   - ถ้าระบุ "วันที่: 15 มกราคม 2025" → ใช้วันที่นี้แน่นอน
   - ถ้าระบุ "สถานที่: สวนลุมพินี" → ใช้สถานที่นี้แน่นอน
   - ถ้าระบุ "จำนวน: 1000 คน" → maxCapacity ต้องเป็น 1000 ห้ามเปลี่ยน
3. สำหรับ description ให้ขยายความจาก "รายละเอียดเพิ่มเติม" ที่ผู้ใช้ระบุ ห้ามสร้างเรื่องใหม่ที่ไม่เกี่ยวข้อง
4. ถ้าข้อมูลไหนผู้ใช้ไม่ได้ระบุ ให้แนะนำค่าที่เหมาะสมตามบริบทงาน

วิธีอ่านโครงสร้าง Event Prompt:
- "ชื่องาน:" → ใช้เป็น title ตรงๆ
- "ประเภท:" → ใช้กำหนด categories (conference/workshop/sports/concert/exhibition/networking/training/charity)
- "สถานที่:" → ใช้เป็น eventLocation ตรงๆ, ถ้ามีสถานที่จริงให้สร้าง googleMapUrl
- "จำนวนผู้เข้าร่วม:" → ใช้เป็น maxCapacity และ suggestedCapacity ตรงๆ
- "วันเวลาจัดงาน:" → แปลงเป็น startDate และ endDate (ISO format)
- "เปิด-ปิดรับสมัคร:" → แปลงเป็น registrationOpenDate และ registrationCloseDate
- "ราคา:" → ใช้สร้าง ticketTypes (ถ้าฟรีให้ price = 0, ถ้าระบุราคาให้ใช้ราคานั้นตรงๆ)
- "ภาพปก:" → ใช้เป็น cover_image_url (ถ้าผู้ใช้ระบุ URL ภาพ)
- "Google Maps:" → ใช้เป็น googleMapUrl (ถ้าเป็น URL) หรือ googleMapEmbedCode (ถ้าเป็น embed code)
- "รายละเอียดเพิ่มเติม:" → ใช้ขยายความเป็น description

ข้อมูลที่ต้องสร้าง:
- title: ใช้จาก "ชื่องาน" ที่ระบุ **ห้ามแต่งใหม่**
- description: ขยายความจาก "รายละเอียดเพิ่มเติม" 2-3 ย่อหน้า **ต้องเกี่ยวข้องกับข้อมูลที่ระบุ**
- eventLocation: ใช้จาก "สถานที่" ที่ระบุ **ตรงๆ**
- googleMapUrl: สร้าง URL ถ้ามีสถานที่จริง (format: https://maps.google.com/?q=ชื่อสถานที่)
- startDate, endDate: แปลงจาก "วันเวลาจัดงาน" เป็น ISO format **ใช้วันที่ที่ระบุ**
- registrationOpenDate, registrationCloseDate: แปลงจาก "เปิด-ปิดรับสมัคร" เป็น ISO format **ใช้วันที่ที่ระบุ**
- suggestedDuration: คำนวณจาก startDate และ endDate
- maxCapacity, suggestedCapacity: ใช้จาก "จำนวนผู้เข้าร่วม" **ตรงๆ**
- ticketTypes: สร้างตามราคาที่ระบุ **ห้ามเปลี่ยนราคา**
  - ถ้า "ราคา: ฟรี" → [{name: "ทั่วไป", price: 0, seats: maxCapacity}]
  - ถ้า "ราคา: 500 บาท" → [{name: "Early Bird", price: 450, seats: 30%}, {name: "ทั่วไป", price: 500, seats: 70%}]
- suggestedCategories: เลือกจาก "ประเภท" เป็นภาษาไทย
- waitlistEnabled: true ถ้างานน่าจะเต็มง่าย
- maxWaitlistSize: ประมาณ 20-30% ของ maxCapacity
- visibility: "public"
- meetingPlatform: "onsite" ถ้ามีสถานที่จริง, "online" ถ้าระบุว่า online
- marketingTips: สร้าง 3-5 ข้อภาษาไทย **ให้เกี่ยวข้องกับข้อมูลงานที่ระบุ**

สำคัญที่สุด: ใช้ข้อมูลที่ผู้ใช้ให้มาอย่างตรงไปตรงมา ห้ามแต่งเรื่องใหม่หรือเปลี่ยนแปลงข้อมูลที่ระบุไว้ชัดเจน!`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_event',
            description: 'Generate detailed event information',
            parameters: {
              type: 'object',
              properties: {
                title: { 
                  type: 'string',
                  description: 'Engaging Thai event title (50-100 chars)'
                },
                description: { 
                  type: 'string',
                  description: 'Detailed Thai event description with formatting (200-500 words)'
                },
                cover_image_url: {
                  type: 'string',
                  description: 'URL of cover image if user specified in prompt'
                },
                eventLocation: {
                  type: 'string',
                  description: 'Specific venue name and address in Thai (for physical/hybrid events)'
                },
                googleMapUrl: {
                  type: 'string',
                  description: 'Google Maps URL of the venue (use real popular Thai venues)'
                },
                googleMapEmbedCode: {
                  type: 'string',
                  description: 'Google Maps embed iframe code if user provided embed code instead of URL'
                },
                startDate: {
                  type: 'string',
                  description: 'Suggested start date and time in ISO format (YYYY-MM-DDTHH:mm:ss)'
                },
                endDate: {
                  type: 'string',
                  description: 'Suggested end date and time in ISO format (YYYY-MM-DDTHH:mm:ss)'
                },
                suggestedDuration: {
                  type: 'object',
                  properties: {
                    hours: { type: 'number', description: 'Duration in hours' },
                    minutes: { type: 'number', description: 'Additional minutes' }
                  },
                  required: ['hours', 'minutes']
                },
                suggestedCapacity: { 
                  type: 'number',
                  description: 'Recommended number of participants based on event type'
                },
                registrationOpenDate: {
                  type: 'string',
                  description: 'Registration open date (2-4 weeks before event) in ISO format'
                },
                registrationCloseDate: {
                  type: 'string',
                  description: 'Registration close date (2-3 days before event) in ISO format'
                },
                ticketTypes: {
                  type: 'array',
                  description: 'Array of ticket types with Thai names and THB pricing',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Ticket name in Thai (e.g., บัตรผู้เข้าชม, บัตร Early Bird, บัตร VIP)' },
                      price: { type: 'number', description: 'Price in Thai Baht (0 for free tickets)' },
                      seats: { type: 'number', description: 'Number of seats available for this ticket type' },
                      description: { type: 'string', description: 'Thai description of what this ticket includes' }
                    },
                    required: ['name', 'price', 'seats']
                  }
                },
                waitlistEnabled: {
                  type: 'boolean',
                  description: 'Enable waitlist for popular events (true for high-demand events)'
                },
                maxWaitlistSize: {
                  type: 'number',
                  description: 'Maximum waitlist size (typically 20-50% of capacity)'
                },
                visibility: {
                  type: 'string',
                  enum: ['public', 'private', 'invitation_only'],
                  description: 'Event visibility: public (default), private (corporate), invitation_only (exclusive)'
                },
                meetingPlatform: {
                  type: 'string',
                  description: 'Platform for virtual/hybrid events (Zoom, Google Meet, Microsoft Teams)'
                },
                customFields: {
                  type: 'array',
                  description: 'Relevant custom registration fields in Thai',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string', description: 'Field label in Thai' },
                      type: { type: 'string', enum: ['text', 'select', 'checkbox'] },
                      required: { type: 'boolean' },
                      options: { type: 'array', items: { type: 'string' }, description: 'Options in Thai for select fields' }
                    }
                  }
                },
                suggestedCategories: {
                  type: 'array',
                  description: 'Thai event categories (e.g., เทคโนโลยี, ธุรกิจ, กีฬา, ศิลปะ)',
                  items: { type: 'string' }
                },
                suggestedTags: {
                  type: 'array',
                  description: 'Relevant Thai keywords for search',
                  items: { type: 'string' }
                },
                marketingTips: {
                  type: 'array',
                  description: 'Actionable marketing tips in Thai (3-5 tips)',
                  items: { type: 'string' }
                }
              },
              required: ['title', 'description', 'suggestedDuration', 'suggestedCapacity', 'startDate', 'endDate', 'registrationOpenDate', 'registrationCloseDate', 'ticketTypes', 'visibility']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_event' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const eventData = JSON.parse(toolCall.function.arguments);
    
    // Add default Iwelty placeholder from Supabase Storage if no cover image was provided
    if (!eventData.cover_image_url) {
      eventData.cover_image_url = 'https://qhvxqmldpifwehnsrlyn.supabase.co/storage/v1/object/public/event-images/iwelty-event-placeholder.jpg';
    }

    return new Response(
      JSON.stringify({ eventData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-event-creator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
