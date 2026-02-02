Half-time demo Feb 5, 2026 script. OIDFed Registry UI  
---

### **Introduction: The OIDFed Registry GUI (0:00 – 0:45)**

Hello everyone. I’m Alex, and I’ve been prototyping the GUI for the **OIDFed Registry**.

Our goal was to build a platform for NREN interconnection and trusted identity that doesn't just technically adhere to the OIDConnect protocol, but makes it usable for Federation Operators. My focus has been mapping the complex workflows of OIDFed operators—specifically FedOps and LeafOps—into an understandable and navigable User Interface.

What you are about to see is a white-label, web-based interface that acts as an orchestration layer on top of the Federation Admin API. We treated the API as an external system with a fixed OpenAPI contract, while the UI layer handles the 'human' element: workflows, drafts, and approval states.

### **1\. Architecture & Authentication Gateway (0:45 – 1:30)**

"Before we dive into the dashboard, let's look at how we handle entry.

To avoid pushing authentication complexity into the Admin API, we introduced a **FastAPI Auth Gateway** between the Web UI and the backend.

This Gateway handles two critical functions:

1. **Identity Mapping:** It supports both local accounts (for immediate bootstrapping) and Federated Authentication via basic OIDC. It maps AAI user identities to local registry users, keeping the Admin API agnostic to the auth method.  
2. **Session Management:** The Gateway issues its own JWTs signed with a private key, which the UI uses for subsequent requests.

This allows us to support the 'Solo Federation Operator' scenario now, while preparing for multi-tenant usage later."

We have adopted a **decoupled architecture**. By mocking the Auth Gateway and the Admin API, we've been able to iterate on the **User Experience and Workflow Logic** without being blocked by the low-level cryptographic implementation. This ensures the UI is driven by operator needs, not just API limitations  
**The "Mock" Login:** "Currently, we are using a persistent mock session. In the production roadmap, this is where the FastAPI Gateway handles the OIDC handshakes and maps your NREN credentials to the Registry's local RBAC."  
**The "Mock" API:** "The data you see here—like the Entity Configuration—is being served from a mock-server that adheres strictly to our OpenAPI contract. This allows us to test edge cases, like malformed metadata, before the backend logic is even finalized."

### **2\. The New Sitemap & Hierarchy Management (1:30 – 2:30)**

"Moving to the UI layout. Based on our analysis of the OIDFed topology, we refactored the sitemap to reflect the three management levels distinctively.

* **Level 1: Federation Trust Anchor (TA):** This is the 'My Level' view—the instance we are currently operating.  
* **Level 2: Superior TAs:** Configured via `authority_hints` (e.g., pointing to the eduGAIN Interfederation TA).  
* **Level 3: Subordinates:** This includes both Intermediate Authorities (IAs) and Leaf Entities.

The navigation separates **'Trust Anchors & Intermediates'** from **'Leaf Entities'** to streamline the mental model for operators managing large trees."

### 

### **3\. The Registration Workflow & Orchestration (2:30 – 3:45)**

"This is the core of the work: **Entity Registration.**

In OIDFed, we know information is obtained dynamically, statically, or via a Resolver. For this UI, we enforce a strict workflow for enrolling Subordinates (IAs and Leaf Entities).

Here is the process we implemented:

1. **Draft State:** When a user initiates registration, the UI creates a local 'Draft.' We do not hit the Admin API yet.  
2. **Dynamic Fetch:** The user provides the `entity_id`. The backend immediately fetches the **Entity Configuration (EC)** from the `.well-known/openid-federation` endpoint.  
3. **Normalization:** The system normalizes and merges this dynamic metadata with any static overrides the operator inputs.  
4. **Submission:** Only once the data is validated does the UI push to the Admin API.

We essentially built a state machine in the frontend:

* **POST /admin/subordinates** to create the entity.  
* **POST /admin/subordinates/{id}/jwks** to attach signing keys.  
* **PUT /admin/subordinates/{id}/metadata** to finalize the profile.

This decoupling allows us to support approval workflows—where an entity is 'Approved' locally before the status is toggled to 'Active' on the Federation API."

### 

### **4\. Trust Marks & Future Scope (3:45 – 4:30)**

"Regarding Trust Marks: For this MVP, we are visualizing them, not issuing them.

We assume that TMs, Trust Mark Issuers (TMIs), and Trust Mark Owners (TMOs) are registered at the TA level. The UI currently allows you to:

1. View registered Trust Mark types.  
2. View TMs applied to an entity configuration.

We have parked complex lifecycle management—such as Trust Mark delegation flows and fine-grained subject management—for the next phase."

### 

### **5\. Conclusion & Next Steps (4:30 – 5:00)**

"To wrap up: We have a containerized, Dockerized Web App that provides a usable GUI for the OIDFed Admin API.

**For this cycle, we plan to achieve:**

* Full TA and Subordinate CRUD.  
* The Auth Gateway implementation.  
* A workflow-based registration system (Draft to Production).

**Our immediate next steps are:**

* Refining the specific wording in the UI to match strict OIDFed terminology.  
* Moving toward fine-grained RBAC for multi-tenant scenarios.

I’m happy to walk you through the live environment now."
