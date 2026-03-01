# 🎭 Sales Co-Pilot Demo Call Script

**Call Setup**: Sarah Chen · TechFlow Inc · VP of Engineering  
**Duration**: ~5 minutes  
**Goal**: Test all AI features — transcription, classifier triggers, suggestion agent, and product data lookups

---

## Phase 1: Opening & Rapport (30 seconds)
> Tests: Basic transcription, speaker attribution

**SALESPERSON**: Hi Sarah, this is Harshil calling from ADP. How are you doing today?

**CLIENT**: Hey Harshil! I'm doing well, thanks. How about you?

**SALESPERSON**: Great, thank you for asking! I wanted to follow up on our previous conversation about your team's expansion and how you're currently handling payroll.

---

## Phase 2: Competitor Mention — Chorus (60 seconds)
> Tests: Classifier trigger for `Competitor: Chorus`, product context lookup for `competitor-chorus`, web search

**CLIENT**: Yeah, so we actually just finished onboarding Chorus for our sales team. It's been decent for call transcription, but honestly we're still looking for something better on the HR and payroll side.

**SALESPERSON**: Oh interesting, so you're using Chorus? Tell me more about that.

**CLIENT**: Yeah, the main issue is the cost. Chorus is charging us about fourteen hundred dollars per user, and with our team growing to about 50 people next month, the pricing is getting really steep.

*⏳ Wait for AI suggestion to appear — should reference Chorus pricing and ADP's competitive advantage*

---

## Phase 3: Pricing Deep-Dive (60 seconds)
> Tests: Classifier trigger for `Price: 50 seats`, product context lookup for `adp-workforce-now`, TCO comparison

**SALESPERSON**: I totally understand. So ADP actually offers volume pricing that could save you significantly. Can you tell me more about what features you're looking for beyond just payroll?

**CLIENT**: We need payroll for sure, but also benefits administration, time tracking, and some kind of talent management. Basically everything in one platform instead of cobbling together multiple tools.

**SALESPERSON**: Perfect — that sounds like ADP Workforce Now would be ideal for you. It's our all-in-one HCM platform that includes payroll, benefits, time, and talent management in a single system.

*⏳ Wait for AI suggestion — should show Workforce Now features and pricing*

---

## Phase 4: Technical Integration Question (60 seconds)
> Tests: Classifier trigger for `Tech: SAP Integration`, product context lookup, technical specs

**CLIENT**: That sounds promising. One important thing though — we use SAP SuccessFactors for our employee data. Can ADP integrate with that?

**SALESPERSON**: Absolutely! ADP Workforce Now actually has a native SAP SuccessFactors integration. Let me pull up the details on that...

*⏳ Wait for AI suggestion — should reference the SAP SuccessFactors native integration and auto-sync*

---

## Phase 5: Competitor Comparison — Gusto (60 seconds)
> Tests: NEW classifier trigger for `Competitor: Gusto`, product context lookup for `competitor-gusto`, differentiation

**CLIENT**: We also looked at Gusto briefly. Some of my colleagues recommended it since it seems simpler and more transparent with pricing.

**SALESPERSON**: That's a fair point. Gusto is great for very small teams, but there are some important differences I should point out...

*⏳ Wait for AI suggestion — should highlight Gusto's limitations at scale (max ~100 employees) vs ADP's mid-market strength*

---

## Phase 6: Objection — Implementation Concerns (60 seconds)
> Tests: Classifier trigger for `Objection: Implementation`, reasoning and rebuttal

**CLIENT**: My biggest concern is implementation. We've heard horror stories about payroll migrations taking months and causing issues during the transition. How long does ADP take to set up?

**SALESPERSON**: That's a really common concern and I'm glad you brought it up. ADP has streamlined the implementation process significantly...

*⏳ Wait for AI suggestion — should provide implementation timeline and support details*

---

## Phase 7: Closing & Next Steps (30 seconds)
> Tests: Continued transcription, clean call ending

**SALESPERSON**: So based on everything we discussed, I think ADP Workforce Now with the SAP integration would be the perfect fit. Would you be interested in seeing a live demo next week?

**CLIENT**: Yeah, I'd love that. Can you send over a proposal with the pricing breakdown for 50 users?

**SALESPERSON**: Absolutely, I'll have that over to you by end of day. Thanks so much for your time, Sarah!

**CLIENT**: Thank you, Harshil. Talk soon!

---

## ✅ What to Verify After the Call

| Feature | Expected Behavior |
|---|---|
| **Transcription** | All messages appear in real-time, no duplicates, partials resolve into finals |
| **Speaker labels** | Salesperson and Client are correctly attributed |
| **Auto-scroll** | Transcript panel always shows the latest message |
| **Classifier triggers** | At least 3-4 triggers: Competitor mentions, pricing, tech question, objection |
| **Suggestion content** | Each suggestion has real product data (pricing numbers, feature names) |
| **Suggestion stacking** | Latest suggestion highlighted with "LATEST" tag, past ones dimmed |
| **No duplicates** | Same topic (e.g., "Competitor: Chorus") only triggers once |
| **Timing** | Suggestions appear within 5-15 seconds of the trigger |
| **Product data** | Suggestions reference real ADP products from the database |
