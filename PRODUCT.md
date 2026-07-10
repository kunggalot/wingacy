# Product

## Register

brand

## Users

นักวิ่ง/สาย gym อายุ ~18-35 ที่ซื้อเสื้อผ้าแนว streetwear — เข้าเว็บจากมือถือ/desktop เพื่อดู drop ใหม่และสั่งซื้อ งานหลักของหน้าเว็บ: ทำให้แบรนด์ดู "ของจริง" และพาไปถึง Add to Cart ให้เร็ว

## Product Purpose

Storefront ของแบรนด์ Wingacy (running/streetwear) — single-file HTML, self-contained, ไม่มี backend สำเร็จ = หน้าเว็บที่ดูเป็นแบรนด์ street จริงจัง ไม่ใช่ template demo

## Brand Personality

Raw · Loud · Confident — พลังงานแบบ drop culture (Supreme/Corteiz): ตัวหนังสือใหญ่หนา, uppercase, mono receipt-style labels, ความรู้สึกของแท้จำนวนจำกัด ไม่ใช่ luxury เนี้ยบและไม่ใช่ minimal เงียบ

## Anti-references

- SaaS landing page เรียบๆ (hero กลาง + การ์ด 3 ใบ + gradient)
- Editorial-magazine (serif italic, drop caps) — ไม่ใช่นิตยสาร
- เว็บเดิมของโปรเจกต์นี้เอง: hero ลอยเปล่าๆ กลางจอ, grid หลุดๆ มีช่องว่างประหลาด, placeholder ฟ้าเทาที่หลุดธีม
- **AI-slop copy** — ประโยคโฆษณาบรรยายบรรยากาศแบบ "Gear built for the street and the split. Printed loud, cut to move, gone when it's gone." ห้ามใช้ (ดู CLAUDE.md ส่วน Copy)

## Design Principles

1. **Type IS the imagery** — เมื่อยังไม่มีรูปสินค้าจริง ให้ typography + โลโก้ arrow ทำงานหนักแทน ห้ามปล่อยพื้นที่ตาย
2. **ทุกอย่างอยู่บน hairline grid** — เส้น 1px คุมทั้งหน้า ความดิบมาจากความหนาแน่น ไม่ใช่ความรก
3. **Drop energy** — marquee, stamp, index number, sold-out ต้องรู้สึกว่าของหมดได้จริง
4. **หนึ่ง accent เดียว ใช้น้อยแต่ชัด** — safety orange ตัดบน ขาว/ดำ เท่านั้น
5. **Self-contained เสมอ** — system font + base64 asset ห้ามพึ่ง CDN

## Accessibility & Inclusion

- ปุ่ม icon-only มี aria-label, interactive ทุกตัวมี :focus-visible, aria-current บน nav/tabs (convention เดิมของโปรเจกต์)
- prefers-reduced-motion: marquee หยุด, wipe เป็น fade — ยกเว้น tilt engine ที่ผู้ใช้สั่งให้คงไว้เสมอ
- Contrast: ตัวหนังสือ body ≥4.5:1 ทั้ง light/dark
