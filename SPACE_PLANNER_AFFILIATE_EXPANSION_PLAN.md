# 🚀 CreatorKit Space Planner — Real-World Gear Catalog, Affiliate Monetization & 3D Kit Sharing Plan

## 1. Overview & Business Model
Transform the CreatorKit Space Planner into an interactive **eCommerce & Affiliate Revenue Engine** (inspired by *PCPartPicker* for PC builders and *Kit.co* for creators).

Creators, streamers, and viewers will be able to:
1. Design and inspect their studio in full 3D with authentic real-world equipment (*Sony A7 IV, Shure SM7B, Aputure Amaran 200x, Elgato Key Light, IKEA Karlby, Secretlab Magnus Pro*).
2. Purchase individual items or complete studio kits with direct Amazon / B&H Photo affiliate tracking.
3. Export clickable Master PDF blueprints where every line item in the procurement schedule is a clickable buy link.
4. Share custom 3D Studio Kit URLs in YouTube/TikTok video descriptions to earn passive affiliate commissions.

---

## 2. Core Feature Pillars

### A. Real-World Brand Equipment Mapping
* Expand generic catalog IDs into verified hardware:
  * **Cameras**:
    * *Sony A7 IV* / *Sony FX3 Cinema Line*
    * *Canon EOS R6 Mark II*
    * *Blackmagic Pocket Cinema Camera 6K Pro*
    * *Logitech Brio 4K Ultra HD Webcam*
    * *iPhone 16 Pro Max 4K ProRes Studio Rig*
  * **Lenses**:
    * *Sigma 24-70mm f/2.8 DG DN Art*
    * *Sony FE 35mm f/1.4 GM*
    * *Canon RF 50mm f/1.8 STM*
  * **Lighting**:
    * *Aputure Amaran 100d / 200x Bowens Mount Point-Source*
    * *Elgato Key Light Air Desktop Panel*
    * *Godox SL60W Video Light*
    * *Nanlite PavoTube II 6C RGBWW Tube*
    * *Aputure Light Dome SE Softbox*
  * **Audio**:
    * *Shure SM7B Dynamic Broadcast Mic*
    * *RØDE PodMic Dynamic Podcasting Mic*
    * *RØDECaster Pro II Audio Production Studio*
    * *Elgato Wave:3 USB Condenser Microphone*
    * *Cloud Microphones Cloudlifter CL-1*
  * **Furniture, Mounts & Acoustic Treatment**:
    * *IKEA Karlby Walnut Worktop + Alex Drawers*
    * *Secretlab MAGNUS Pro Sit-to-Stand Metal Desk*
    * *Herman Miller Aeron Ergonomic Chair*
    * *GVM Heavy-Duty Stainless Steel C-Stand (3.3m)*
    * *Elgato Master Mount L Desk Clamp Rig*
    * *Auralex Acoustics Studiofoam Wedges (2" 24-Pack)*

### B. Affiliate Buy Actions in 3D Web App
1. **3D Inspector Panel (On Item Click)**:
   * Displays verified manufacturer badge (e.g. `[ SONY ]`, `[ SHURE ]`, `[ APUTURE ]`).
   * Primary action button: **`[ 🛒 Buy on Amazon (↗) ]`** styled with high-contrast brutalist aesthetics.
   * Secondary fallback button: **`[ View on B&H Photo ]`**.
2. **Budget Breakdown Panel**:
   * Quick `[ Buy ↗ ]` link on every deployed fixture line item.
   * Master action: **`[ 🛒 Buy Complete Studio Kit on Amazon ]`** (opens multi-item Amazon search / cart).

### C. Clickable Master PDF Procurement Schedule
* In **Page 5 (Itemized Bill of Materials & Diagnostics)** of the exported Master PDF:
  * Embed native PDF interactive hyperlinks on every gear row.
  * Contractors, production companies, and viewers clicking any row in the PDF open the direct purchase link with affiliate tagging.

### D. Viral "Share My 3D Studio Kit" URL Engine
* **1-Click Share Button** in the Space Planner top toolbar.
* Encodes the exact room width, depth, window positions, and 3D equipment coordinates into a compressed URL:
  * `https://creatorskit.app/space-planner?kit=gz79x...&tag=creator-tag-20`
* Creators paste this link into their YouTube video descriptions:
  > *"📐 Inspect my exact 3D camera, lighting, and acoustic setup here: creatorskit.app/space-planner?kit=my-studio"*
* Viewers explore the 3D room, click on items, and buy them through the embedded affiliate tags.

---

## 3. Implementation Roadmap

| Phase | Milestone | Deliverables |
|---|---|---|
| **Phase 1** | Catalog Enrichment | Add brand names, model numbers, and affiliate links to `gear-library.ts` & `types.ts`. |
| **Phase 2** | UI Buy Integration | Add `[ 🛒 Buy on Amazon ]` buttons to `InspectorPanel.tsx` & `BudgetPanel.tsx`. |
| **Phase 3** | PDF Hyperlinks | Embed interactive affiliate hyperlinks in `export.ts` Page 5 Bill of Materials. |
| **Phase 4** | Viral Kit Sharing | Add URL state compression & `[ 🔗 Share Kit ]` modal with 1-click clipboard copy. |
