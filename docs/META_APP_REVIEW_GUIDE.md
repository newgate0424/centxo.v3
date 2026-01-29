# คู่มือยื่น Meta App Review สำหรับ Centxo

## ลำดับการยื่น (ต้องทำตามลำดับ)

Meta กำหนดให้ยื่นตามลำดับ dependency ดังนี้:

```
1. pages_show_list        ← ยื่นก่อน (ฐาน)
2. pages_read_engagement  ← ต้องยื่น pages_show_list ก่อน
3. ads_management         ← ต้องยื่น pages_read_engagement ก่อน
```

---

## ขั้นตอนสำหรับแต่ละ Permission

### สำหรับแต่ละ permission (pages_show_list, pages_read_engagement, ads_management) ต้องทำครบ 4 ข้อ:

| # | งาน | สถานะ |
|---|-----|-------|
| 1 | **ตรวจสอบนโยบาย** – อ่านนโยบายของ permission นั้น และบอกวัตถุประสงค์ในการใช้งาน | ⬜ |
| 2 | **อธิบายการใช้งาน** – อธิบายวิธีที่แอพจะใช้สิทธิ์นี้ | ⬜ |
| 3 | **อัพโหลด Screenshots** – แสดงประสบการณ์ผู้ใช้ตั้งแต่ต้นจนจบ (user flow) | ⬜ |
| 4 | **ตกลงปฏิบัติตาม** – ยืนยันว่าจะปฏิบัติตามการใช้งานที่ได้รับอนุญาต | ⬜ |

---

## 1. pages_show_list

**ใช้ทำอะไรใน Centxo:** แสดงรายการ Facebook Pages ที่ผู้ใช้เป็นเจ้าของหรือมีสิทธิ์ เพื่อให้เลือก Page สำหรับโฆษณา

### คำอธิบายที่แนะนำ (Describe how your app uses this permission)

```
Centxo เป็นแพลตฟอร์มจัดการโฆษณา Facebook/Meta Ads 
เราใช้ pages_show_list เพื่อ:
- แสดงรายการ Facebook Pages ที่ผู้ใช้เชื่อมต่อหรือมีสิทธิ์
- ให้ผู้ใช้เลือก Page สำหรับสร้างโฆษณา Message Ads
- แสดงในหน้า Settings → Connections และ Ads Manager → Accounts
```

### Screenshots ที่ควรอัพโหลด

1. หน้าเชื่อมต่อ Facebook (OAuth flow)
2. หน้าแสดงรายการ Pages หลังเชื่อมต่อ (เช่น /ads-manager/accounts-vcid?tab=pages-by-business)
3. หน้าสร้างแคมเปญที่ให้เลือก Page

---

## 2. pages_read_engagement

**ใช้ทำอะไรใน Centxo:** อ่านข้อมูล engagement ของ Page (เช่น insights, posts) เพื่อวิเคราะห์และสร้างโฆษณา

### คำอธิบายที่แนะนำ

```
Centxo ใช้ pages_read_engagement เพื่อ:
- ดึงข้อมูล posts และ insights ของ Facebook Page
- แสดงใน Library (ขั้นสื่อ) สำหรับเลือกวิดีโอ/โพสต์ไปใช้ในโฆษณา
- วิเคราะห์ประสิทธิภาพของ content ก่อนสร้างแคมเปญ
```

### Screenshots ที่ควรอัพโหลด

1. หน้า Library ที่แสดง posts จาก Page
2. หน้าที่แสดง insights หรือ engagement ของโพสต์
3. Flow การเลือกโพสต์ไปใช้ในแคมเปญ

---

## 3. ads_management

**ใช้ทำอะไรใน Centxo:** สร้างและจัดการโฆษณา Facebook Ads

### คำอธิบายที่แนะนำ

```
Centxo ใช้ ads_management เพื่อ:
- สร้างแคมเปญโฆษณา Message Ads บน Facebook/Meta
- จัดการ Ad Accounts, Campaigns, Ad Sets, Ads
- Pause/Resume แคมเปญตามกฎอัตโนมัติ
- ดึง insights และรายงานผลโฆษณา
```

### Screenshots ที่ควรอัพโหลด

1. หน้ารายการแคมเปญ (Campaigns list)
2. หน้าสร้างแคมเปญ (Create campaign flow)
3. หน้าเลือก Ad Account และ Page
4. หน้าการตั้งค่าแคมเปญ (budget, targeting, creative)
5. หน้าผลลัพธ์/insights หลังสร้างแคมเปญ

---

## Checklist ก่อนยื่น

- [ ] ทำครบทั้ง 4 ขั้นตอนสำหรับ **pages_show_list**
- [ ] ทำครบทั้ง 4 ขั้นตอนสำหรับ **pages_read_engagement**
- [ ] ทำครบทั้ง 4 ขั้นตอนสำหรับ **ads_management**
- [ ] App อยู่ในโหมด Development และทดสอบ flow ครบแล้ว
- [ ] Privacy Policy URL ครบถ้วน
- [ ] Terms of Service (ถ้ามี) ครบถ้วน
- [ ] App Domains และ OAuth Redirect URIs ตั้งค่าถูกต้อง

---

## วิธีเข้าหน้าจอ App Review

1. ไปที่ [Facebook Developers](https://developers.facebook.com/)
2. เลือกแอป Centxo
3. เมนูซ้าย: **App Review** → **Permissions and Features**
4. ในส่วน **การใช้งานที่อนุญาต** (Authorized Usage) กด **เริ่มต้นใช้งาน** ที่แต่ละ permission
5. กรอกข้อมูลและอัพโหลด screenshots ตามขั้นตอน
6. เมื่อครบทุก permission แล้ว จึงกด **Submit for Review**

---

## หมายเหตุ

- **Development mode:** สามารถใช้ได้กับ Developer/Tester เท่านั้น (ไม่ต้องผ่าน App Review)
- **Live mode:** ต้องผ่าน App Review ก่อน จึงจะให้ผู้ใช้ทั่วไปใช้งานได้
- Meta อาจใช้เวลา 1–2 สัปดาห์ในการตรวจสอบ
- ถ้าถูกปฏิเสธ Meta จะส่งเหตุผลมา ให้แก้ไขตาม feedback แล้วยื่นใหม่

---

## ลิงก์อ้างอิง

- [Meta App Review](https://developers.facebook.com/docs/app-review/)
- [Marketing API Permissions](https://developers.facebook.com/docs/marketing-api/reference/ads-management/)
- [Pages API](https://developers.facebook.com/docs/pages-api/)
