Half-time demo Feb 5, 2026 script. OIDFed Registry UI  
---

### **Introduction: The OIDFed Registry GUI (0:00 – 0:45)**

Hello everyone. I'm Alex, and I've been prototyping the GUI for the **OIDFed Registry**.

Our goal was to build a platform for NREN interconnection and trusted identity that doesn't just technically adhere to the OpenID Connect Federation protocol, but makes it usable for Federation Operators. My focus has been mapping the complex workflows of OIDFed operators—specifically FedOps and LeafOps—into an understandable and navigable User Interface.

What you are about to see is a white-label, web-based interface that acts as an orchestration layer on top of the Federation Admin API. We treated the API as an external system with a fixed OpenAPI contract, while the UI layer handles the 'human' element: workflows, drafts, and approval states.

### **1. Architecture & Authentication Strategy (0:45 – 1:30)**

"Before we dive into the dashboard, let's look at our authentication strategy.

To avoid pushing authentication complexity into the Admin API, our architecture **plans for** a **FastAPI Auth Gateway** between the Web UI and the backend.

This Gateway will handle two critical functions:

1. **Identity Mapping:** It will support both local accounts (for immediate bootstrapping) and Federated Authentication via basic OIDC. It maps AAI user identities to local registry users, keeping the Admin API agnostic to the auth method.
2. **Session Management:** The Gateway will issue its own JWTs signed with a private key, which the UI uses for subsequent requests.

This allows us to support the 'Solo Federation Operator' scenario now, while preparing for multi-tenant usage later."

We have adopted a **decoupled architecture**. By mocking both the planned Auth Gateway and the Admin API, we've been able to iterate on the **User Experience and Workflow Logic** without being blocked by the low-level cryptographic implementation. This ensures the UI is driven by operator needs, not just API limitations.

**The "Mock" Login:** "Currently, we are using localStorage-based authentication with mock users. In production, this is where the FastAPI Gateway will handle OIDC handshakes and map your NREN credentials to the Registry's local RBAC."

**The "Mock" API:** "The data you see here—like the Entity Configuration—is being served from Mock Service Worker (MSW) handlers that adhere strictly to our OpenAPI contract. This allows us to test edge cases, like malformed metadata, before the backend logic is even finalized."

### **2. The New Sitemap & Hierarchy Management (1:30 – 2:30)**

"Moving to the UI layout. Based on our analysis of the OIDFed topology, we refactored the sitemap to reflect the three management levels distinctly.

* **Level 1: Federation Trust Anchor (TA):** This is the 'My Level' view—the instance we are currently operating.
* **Level 2: Superior TAs:** Configured via `authority_hints` in the Trust Anchor settings (e.g., pointing to the eduGAIN Interfederation TA).
* **Level 3: Subordinates:** This includes both Intermediate Authorities (IAs) and Leaf Entities.

The navigation separates **'TAs and IAs'** from **'Leaf Entities'** to streamline the mental model for operators managing large trees. This is visible in our sidebar navigation, where Trust Anchors are managed separately from the entity registry."

### **3. The Registration Workflow & Orchestration (2:30 – 3:45)**

"This is the core of the work: **Entity Registration.**

In OIDFed, we know information is obtained dynamically, statically, or via a Resolver. For this UI, we designed a guided workflow for enrolling Subordinates (IAs and Leaf Entities).

Here is the process we implemented:

1. **Multi-Step Wizard:** When a user initiates registration, they go through a 4-step client-side wizard that guides them through the process.
2. **Dynamic Fetch:** The user provides the `entity_id`. The system shows how it will fetch the **Entity Configuration (EC)** from the `.well-known/openid-federation` endpoint.
3. **Configuration Review:** The fetched metadata is displayed for operator review, showing detected entity types, organization name, and JWKS.
4. **Enrichment:** Operators can add additional information like display names, descriptions, and contact details that may not be in the entity statement.
5. **Submission:** The complete entity data is submitted to the Admin API.

The workflow is designed to support approval states and status transitions:

* Entities can be created in **draft** status for review
* They transition to **pending** for approval by administrators
* Finally, they become **active** in the federation

The system is built to support the full API lifecycle with endpoints for:
* **POST /admin/subordinates** to create the entity
* **POST /admin/subordinates/{id}/jwks** to manage signing keys
* **PUT /admin/subordinates/{id}/metadata** to update the profile
* **PUT /admin/subordinates/{id}/status** to manage lifecycle states

This modular approach allows us to support approval workflows where an entity is vetted locally before becoming active in the federation."

### **4. Trust Marks & Current Scope (3:45 – 4:30)**

"Regarding Trust Marks: For this MVP, we are visualizing them as part of the entity information architecture.

We display registered Trust Mark types that are configured at the TA level. The UI currently allows you to:

1. View all registered Trust Mark types with their issuers and descriptions
2. See which entities have specific trust marks applied
3. Understand the count of entities associated with each trust mark

We show examples like REFEDS MFA Profile, eduGAIN Member, SIRTFI Certified, and Research & Scholarship entity categories.

We have intentionally kept complex lifecycle management—such as Trust Mark delegation flows, fine-grained subject management, and trust mark issuance workflows—for the next development phase. The current focus is on visualization and association, not the full cryptographic issuance process."

### **5. Conclusion & Next Steps (4:30 – 5:00)**

"To wrap up: We have a containerized, Dockerized Web App that provides a prototype GUI for the OIDFed Admin API workflow.

**What we've achieved in this cycle:**

* Multi-step entity registration workflow with dynamic configuration fetching
* Status-based lifecycle management (draft → pending → active)
* Hierarchical navigation separating TAs/IAs from Leaf Entities
* Trust Mark visualization
* Mock-driven development allowing rapid UI iteration
* Docker deployment setup

**Our immediate next steps are:**

* Implementing the FastAPI Auth Gateway for production authentication
* Connecting to the live Admin API backend once available
* Refining the specific wording in the UI to match strict OIDFed terminology
* Building out the Authority Hints management UI
* Implementing fine-grained RBAC for multi-tenant scenarios

I'm happy to walk you through the live environment now."

---

## **Demo Flow Suggestions**

### **Live Demo Path (5-7 minutes):**

1. **Login Screen** (30 sec)
   - Show mock login → mention FastAPI gateway plan

2. **Dashboard Overview** (45 sec)
   - Quick overview of stats
   - Point out the hierarchical navigation

3. **Trust Anchors Page** (1 min)
   - Show your TA configuration
   - Mention authority hints concept
   - Show subordinate IAs if any

4. **Entity Registration** (2.5 min) ⭐ **CENTERPIECE**
   - Step 1: Enter entity_id, select TA
   - Step 2: Show "fetched" configuration
   - Step 3: Add enrichment details
   - Step 4: Review and submit
   - Show resulting entity in list

5. **Entity Detail View** (1 min)
   - Show metadata, JWKS
   - Point out Trust Marks section
   - Show status management

6. **Trust Marks Page** (45 sec)
   - Show the trust mark types
   - Explain visualization vs. issuance

7. **Wrap-up** (30 sec)
   - Quick mention of Docker deployment
   - Q&A

### **Potential Questions to Prep For:**

- **Q: "Is the auth gateway implemented?"**
  - A: "Not yet—we're using mocks to iterate on the UX. The gateway is planned for next sprint."

- **Q: "Does it connect to a real backend?"**
  - A: "Currently using MSW to mock the OpenAPI contract. This lets us develop the workflows independently."

- **Q: "Can you issue trust marks?"**
  - A: "This version visualizes trust marks. The issuance workflow with cryptographic signing is coming next."

- **Q: "What about authority hints?"**
  - A: "The API supports them and we have the hooks ready. The admin UI for managing them is in the backlog."
