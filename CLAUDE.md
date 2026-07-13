# Wingacy — Shop

Storefront UI สำหรับแบรนด์ running/streetwear **Wingacy** (พอร์ตดีไซน์มาจาก wingacy.com)
แยกไฟล์แล้ว (2026-07-13): `index.html` (markup) + `css/` ต่อเพจ + `js/` ต่อฟีเจอร์ + `assets/` — ยังไม่มี build step, ไม่มี dependency ภายนอก

## Workflow (ทำตามลำดับนี้ทุกครั้งที่จะแก้)

1. **สำรวจก่อนแตะ** — ดูตาราง "โครงสร้างไฟล์" ด้านล่างก่อน แล้ว**อ่านเฉพาะไฟล์ของเพจ/ฟีเจอร์ที่จะแก้** (css+js คู่กัน) ห้ามอ่านทุกไฟล์ไล่ทั้งโปรเจกต์ ถ้าไม่แน่ใจว่าอยู่ไฟล์ไหนให้ `grep -rn <selector/fn> css/ js/ index.html` ก่อน
2. **อธิบายโครงสร้าง** — สรุปสั้นๆ ว่าโค้ดส่วนที่จะแก้ทำงานยังไง + เชื่อมกับอะไรบ้าง ก่อนลงมือ
3. **วางแผนก่อนแก้** — บอกแผนเป็นขั้นๆ ว่าจะแตะไฟล์/ส่วนไหน ผลที่จะได้คืออะไร (งานใหญ่ให้ผู้ใช้ยืนยันแผนก่อน)
4. **แก้ทีละส่วน** — edit เล็กๆ ทีละจุด ไม่ rewrite ทั้งไฟล์รวด ให้ diff ตรวจง่าย
5. **รัน build/test/lint** — โปรเจกต์นี้ไม่มี build/test/lint → verify ด้วยการเปิดจริงในเบราว์เซอร์ตาม section "Verification" ด้านล่าง (ถ้าอนาคตมี toolchain ให้รันจริงทุกครั้ง)
6. **สรุป diff** — จบงานสรุปว่าแก้อะไรไปบ้าง (ไฟล์/บรรทัด/เหตุผล) สั้นกระชับ
7. **ช่วย comment** — ใส่ comment อธิบาย "ทำไม" (ไม่ใช่ "ทำอะไร") ตรงจุดที่ไม่ชัด เช่น ค่าคงที่ของ tilt, เหตุผลที่ tilt ไม่สน reduced-motion — ตาม density ของ comment เดิมในไฟล์

## โครงสร้างไฟล์ (แก้เพจไหน อ่านเฉพาะไฟล์นั้น)

**`index.html`** (~350 บรรทัด) — markup ล้วน: navbar → views (`#view-home/shop/pro/pri/watch/product/cart/checkout/login/register/account`) → footer → templates (`cardTpl`, `cartLineTpl`, `addressFormTpl`) → `<link>`/`<script src>`

**`css/`** — โหลดตามลำดับใน `<head>` **ห้ามสลับลำดับ `<link>`** (cascade เดิมขึ้นกับลำดับนี้):
| ไฟล์ | ดูแล |
|---|---|
| `base.css` | tokens `:root`, theme dark/light, layout, `.hoverable`, navbar |
| `home.css` | hero, pro, home-band |
| `shop.css` | catalog, collections, grid, card, swatch |
| `pdp.css` | product detail, gallery, size chips |
| `account.css` | auth, address card/form, order history |
| `cart.css` | cart lines, summary, mini-cart |
| `overrides.css` | footer, mobile `@media 860px`, reduced-motion, view crossfade |

**`js/`** — classic script โหลดตามลำดับท้าย `<body>` **ห้ามสลับลำดับ** (top-level `const/let` แชร์ scope ข้ามไฟล์ ไม่ใช่ ES module ห้ามใส่ `type="module"`):
| ไฟล์ | ดูแล |
|---|---|
| `router.js` | `show()`, data-view binding |
| `auth.js` | `authFetch`, login/register, account, addresses, place order, orders |
| `data.js` | `products` array |
| `shop.js` | collections, `buildCard`, `renderShop` |
| `pdp.js` | gallery, `openProduct`, Add to Cart |
| `cart.js` | mini-cart, `cart` state, `renderCart` |
| `checkout.js` | `renderCheckout`, `renderCheckoutAddresses` |
| `tilt.js` | heroTilt + setupTilt |

**`assets/`** — รูป/ไอคอนทั้งหมด (โลโก้, hero, รูปสินค้า) — **ห้าม Read ไฟล์ในนี้** (binary)

**แก้ css/js แล้วต้อง bump `?v=N`** ของไฟล์นั้นใน `index.html` ทุกครั้ง (cache-bust)

ทิศทางดีไซน์: **raw streetwear (drop culture)** — ดู `PRODUCT.md` ประกอบ; หน้ากว้างเต็มจอ (max 1440px) ไม่ใช่ mobile frame แล้ว

## Design tokens (`:root`)

แก้สี/ระยะ/ฟอนต์ **ที่ตัวแปรเท่านั้น** ห้าม hardcode ค่าซ้ำในแต่ละ component
- สี: `--stage --surface --card --ink --muted --line --invert-bg --invert-fg`
- **Accent (white → steel-blue):** `--accent` เป็น `linear-gradient(135deg, #FFFFFF, #5E8BA8)` ใช้เป็นพื้นบล็อกทึบเท่านั้น (stamp, sold-out) คู่กับตัวหนังสือดำ `#100F0A` (contrast ผ่านทั้ง 2 ปลายเกรเดียนต์); ตัวหนังสือ accent บนพื้น surface ใช้ `--accent-text` (flat color ดึงมาจากปลายฟ้าของเกรเดียนต์ เข้ม/สว่างตามธีมเพื่อ contrast ≥4.5:1) — **ห้ามทำ gradient text** (`background-clip:text` + gradient) เด็ดขาด ห้ามใช้ `--accent` เป็นสีตัวอักษรเล็กเช่นกัน
- อื่นๆ: `--shadow --radius(2px) --gutter(clamp 16-40px)`
- ฟอนต์: `--font-display` (Helvetica Neue 800), `--font-body` (500), `--font-mono` (UI monospace)

### Theme (light เป็นค่า default เสมอ)
**Light theme เป็นหลักเสมอ ไม่ตาม OS** — ไม่มี `@media (prefers-color-scheme: dark)` แล้ว (`color-scheme: light` ที่ `:root` ด้วย) ธีม token ทุกตัวอยู่ใน base `:root` (ค่า light) โดยตรง
- Dark จะทำงานเฉพาะเมื่อ host stamp `:root[data-theme="dark"]` เท่านั้น (มี `:root[data-theme="light"]` ไว้ override กลับเผื่อ host อื่นดันมาสลับ + set `color-scheme: dark` คู่กันเพื่อให้ browser UI controls ตามธีม)
- เพิ่ม token ที่เปลี่ยนตามธีมใหม่ ให้ใส่ค่า light ที่ base `:root` แล้วเพิ่ม override ที่ `:root[data-theme="dark"]` เท่านั้น — **ห้ามใส่กลับใน `@media (prefers-color-scheme: dark)`**
**Logo/swatch invert:** โลโก้เป็น PNG ขาว ใช้ `filter: invert(var(--logo-invert, 1))` — fallback `1` = light (invert เป็นดำ) เป็น default, `:root[data-theme="dark"]` เซ็ต `--logo-invert:0` กลับให้ทุกจุด (brand, hero, swatch, PDP gallery, cart line)

## Component conventions

- **`.hoverable`** — ปุ่ม/ลิงก์มาตรฐานทุกตัว (nav, bag, add) ใช้คลาสนี้ เอฟเฟกต์คือ invert rectangle wipe จากซ้าย (`::before` scaleX) ห้ามสร้างปุ่มสไตล์ใหม่ ให้ reuse `.hoverable`
- **Grid** — `.grid` เป็นการ์ดลอยคั่นด้วย `gap: clamp(12px,1.5vw,16px)` (ไม่มีเส้น hairline กรอบการ์ด/ไม่มี `.card-meta` border-top แล้ว) คอลัมน์ fix `repeat(4,1fr)` desktop → `@media(max-width:720px)` ลดเป็น `repeat(2,1fr)` มือถือ; ระยะขอบนอกทั้ง grid มาจาก `.catalog{ padding: var(--gutter) var(--gutter) 40px }` (align กับ gutter ของ navbar/hero)
- **Accessibility** — ปุ่ม icon-only ต้องมี `aria-label`; ลิงก์ nav ที่ active ใส่ `aria-current="page"`; ทุก interactive มี `:focus-visible`
- **Divider ownership** — เส้นคั่นระหว่าง element สองตัวที่มาต่อกันสนิท (gap = 0) ให้ **ฝั่งเดียวเท่านั้น** เป็นเจ้าของเส้น ห้ามใส่ `border-bottom` ของตัวบน + `border-top` ของตัวล่างพร้อมกันบนรอยต่อเดียวกัน เพราะพอไม่มี gap คั่น จะเห็นเป็นเส้นหนา/เส้นซ้อนแทนเส้นเดียว — กฎการเลือกเจ้าของ: **element ที่ปรากฏซ้ำ/คงที่ทุกหน้า (เช่น `.site-footer`) เป็นเจ้าของเส้นเสมอ** ส่วน element ที่เปลี่ยนไปตาม view (เช่น `.pdp`, `.cart-view`) ห้ามประกาศ border บนรอยต่อที่ชนกับ element คงที่นั้นซ้ำ ถ้ามี view ไหนต้องการเส้นคั่นเฉพาะตัว (ไม่ใช่รอยต่อกับ footer) ค่อยประกาศได้ตามปกติ

## เพิ่ม/แก้สินค้า

แก้ที่ array `products` ใน `<script>` เท่านั้น การ์ด render จาก `#cardTpl` อัตโนมัติ:
```js
{ id, name, price, category: "run"|"gym", section: "new"|"essentials", angle, imageCount, sizes: [{size,inStock}] }
```
- index stamp (`01`, `02`…) + count `(N)` ต่อ section คำนวณอัตโนมัติ ไม่ต้องแก้มือ
- โลโก้ watermark บน swatch/PDP gallery/cart **ห้ามเอียง** — ต้องตั้งตรงเหมือนโลโก้ใน navbar เสมอ field `angle` ของสินค้ามีไว้ให้ tilt engine อ่านผ่าน `data-angle` บน `.swatch` (mouse-hover tilt แบบ 3D) เท่านั้น ไม่ใช่ static rotation ของตัวโลโก้เอง ค่า default = `0` ทุกตัว — อย่าใส่ค่าอื่น
- สินค้าที่ทุก size `inStock:false` จะขึ้น badge SOLD OUT เอง

## Tilt engines (มี 2 ตัว แยกกัน)

1. **hero tilt** (`heroTilt`) — พอร์ตตรงจาก wingacy.com: `window mousemove` → rAF lerp → GPU transform เคอร์เซอร์ที่ไหนบนจอก็เอียงรูป hero ค่า: `MAX=5° EASE=0.1 PERSP=800`
2. **swatch tilt** (`setupTilt`) — เอียงเฉพาะตอน hover การ์ด + โลโก้ข้างในพารัลแลกซ์สวนทาง + ยกการ์ดขึ้นเล็กน้อย ค่า: `MAX=12° EASE=0.14 PERSP=550 PARA=10` — expose `window.rebindSwatchTilt()` ให้ `renderShop()` เรียกซ้ำหลัง re-render (idempotent ผ่าน `swatch._tiltState`)

ทั้งสองใช้แพทเทิร์นเดียวกัน: passive listener เก็บ target → rAF loop lerp เข้าหา target → เขียน `transform` GPU, และหยุด rAF เมื่อ `visibilitychange` (tab ซ่อน)

**สำคัญ:** tilt เป็นเอฟเฟกต์ที่ผู้ใช้สั่งมาเจตนา จึงรัน**ไม่สน** `prefers-reduced-motion` — reduced-motion มีผลแค่กับ `.hoverable` wipe (ดู media query ท้าย CSS) อย่าไปหุ้ม tilt ด้วย reduced-motion guard

## Copy (กฎห้าม AI slop)

- **ห้ามเขียนประโยคโฆษณาลอยๆ** แบบ "Gear built for the street and the split. Printed loud, cut to move, gone when it's gone." — ฟังดู AI-generated, ไม่มีข้อมูลจริง เป็น filler
- **ใช้ real UI text แทน** — ตัวเลข stock/category ที่คำนวณจริงจาก `products`, หรือ origin/location (เช่น "Prachin Buri, Thailand") เท่านั้น ทุกคำในหน้าต้องเป็นข้อมูลจริงที่ verify ได้ (นับได้จาก data จริง) หรือ functional label เท่านั้น — **ห้ามใช้สถานะ drop/season ที่สมมติขึ้น** (เช่น "Drop 003", "SS26") หรือ claim ที่ไม่มีข้อมูลรองรับ (เช่น "No Restocks", "Worldwide Shipping") เพราะแบรนด์นี้เจาะ niche market ไม่ใช่ hype drop culture
  - **Exception:** `#heroStock` ปัจจุบันคือ "COMING SOON.." แบบ hardcode (ไม่คำนวณจาก `products` แล้ว) เพราะร้านยังไม่เปิดขายจริง — สถานะนี้ verify ได้ตรงกับความจริง (ร้านยังไม่ live) จึงไม่ใช่ AI slop แม้จะไม่ใช่ data-driven ก็ตาม เมื่อร้านเปิดขายจริงค่อยเปลี่ยนกลับไปใช้ตัวนับจาก `products` (ดู git history ของบรรทัดนี้สำหรับโค้ดเดิม)
- ก่อนเพิ่ม copy ใหม่ ถามตัวเองว่า "ตัดออกแล้วเสียข้อมูลจริงไหม" — ถ้าไม่เสีย (เป็นแค่บรรยากาศ) ให้ตัดทิ้ง

## Verification (ก่อนบอกว่าเสร็จ)

ไม่มี test suite — verify ด้วยการเปิดจริง (`http://localhost:8000/`):
1. เปิดในเบราว์เซอร์ — เช็คด้วยตา
2. ตรวจ: การ์ดครบตาม `products` + index/ราคา/SOLD OUT ถูก, สลับ category tab แล้ว hover tilt ยังทำงาน (rebind), PDP เลือก size → **Add to Cart** → bag นับเพิ่ม, cart แก้ qty/remove ได้, สลับ light/dark โลโก้ invert ถูก
3. เช็ค responsive: มือถือ (~390px) hero stack + grid 2 คอลัมน์, desktop PDP split ซ้าย/ขวา

## ห้ามทำ

- อย่าเพิ่ม framework/bundler/dependency ภายนอก — คง vanilla HTML/CSS/JS ไม่มี build step
- อย่า hardcode สีที่ซ้ำกับ token
- อย่า Read ไฟล์ใน `assets/` และอย่าฝัง base64 กลับเข้ามาในโค้ด — รูปใหม่ให้เพิ่มเป็นไฟล์ใน `assets/` เสมอ
