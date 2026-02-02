# 🎤 Demo Day Cheat Sheet - Feb 5, 2026

## 🔐 Demo Login
```
Email: admin@oidfed.org
Password: admin123
```

## 🎯 Test Entity IDs (Copy-Paste Ready)
```
https://idp.example.edu
https://sp.research.org  
https://auth.university.ac.uk
https://oidc.nren.example
```

## ⏱️ Timing Breakdown (7 min total)

| Section | Time | Key Point |
|---------|------|-----------|
| Login | 30s | Mention FastAPI gateway plan |
| Dashboard | 45s | Show stats, hierarchy nav |
| Trust Anchors | 1m | TA/IA separation concept |
| **Entity Registration** | 2.5m | ⭐ Main feature - 4-step wizard |
| Entity List | 1m | Show draft status |
| Trust Marks | 45s | Visualization vs. issuance |
| Wrap-up | 30s | Docker + Q&A |

## 🎬 Registration Demo Script

**Step 1: Entity ID**
> "I'll enter the entity identifier. Notice it shows the exact well-known endpoint we'll fetch from."

**Step 2: Configuration**
> "The system fetches and parses the entity configuration. We see detected entity types, organization, and JWKS."

**Step 3: Enrichment**
> "Now we add operational details not in the entity statement - display name, contacts, description."

**Step 4: Review & Submit**
> "Before submission, review everything. Notice it's being created in draft status for approval workflow."

**Result:**
> "And there it is - new entity with draft status, ready for the approval workflow."

## 🛡️ Tough Questions - Quick Responses

### "Is the backend implemented?"
> "We're prototyping the UX with MSW mocks against our OpenAPI contract. Backend integration is next sprint."

### "Where's the auth gateway?"
> "The architecture is designed for it - you can see the note on login. Implementation follows UX validation."

### "Can you show authority hints?"
> "The API supports them - we have the hooks and handlers ready. Admin UI for that is in the backlog."

### "Does it work with real entities?"
> "Currently using mock fetch. When we connect the resolver, it'll pull live entity configurations."

### "What about trust mark issuance?"
> "This version focuses on visualization and association. Cryptographic issuance is next phase."

## ✅ Pre-Demo Checklist

- [ ] Fresh `npm run dev`
- [ ] Clear browser localStorage
- [ ] Close unnecessary browser tabs
- [ ] Open demo-script-revised.md on second screen
- [ ] Test full registration flow once
- [ ] Check Mock API Mode badge is showing
- [ ] Zoom/Teams screen share ready
- [ ] Water/coffee nearby

## 🎨 Visual Highlights to Point Out

- ✨ Mock API Mode badge (yellow, sidebar)
- ✨ Well-known URL display (registration step 1)
- ✨ Draft status badge (orange, on entities)
- ✨ TAs and IAs vs. Leaf Entities (navigation)
- ✨ Trust mark counts (Trust Marks page)
- ✨ Status-based filtering (Entities page)

## 🔥 Fallback Plan (If Something Breaks)

### If registration fails:
→ Navigate to existing entities, show detail view instead

### If login fails:
→ Reload page, clear localStorage, try again

### If mock data doesn't load:
→ Check browser console, restart dev server

### If you forget the flow:
→ Trust Anchors → Entities → Register New → Show the wizard

## 💪 Confidence Boosters

✓ You built this in weeks, not months
✓ The workflow is better than anything else in OIDFed
✓ Mock-driven dev is a smart strategy
✓ The OpenAPI contract ensures future compatibility
✓ You have 3 reference docs to support you
✓ All code changes are tested and working

---

## 🎯 Final Key Message

> "This is a **workflow prototype** that puts **operator experience first**. By developing against mocks and the OpenAPI contract, we validated the UX without waiting for backend implementation. The result is a GUI that makes OpenID Federation management **accessible and understandable**."

---

**Remember:** You're demoing *workflows and UX innovation*, not finished software. Be proud of that. 🚀
