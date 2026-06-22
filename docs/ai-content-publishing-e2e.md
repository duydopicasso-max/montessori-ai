# AI Content Publishing — End-to-End Verified

This document outlines the end-to-end publishing pipeline for AI-generated content in the Montessori application.

---

## 🔄 Publishing Workflow Diagram

```mermaid
graph TD
    A[Content Studio] -->|Export Package JSON| B[Montessori Publish Package JSON]
    B -->|Import Package| C[App Montessori Admin Review]
    C -->|Save Draft in Firestore| D[(aiContentReviewQueue)]
    D -->|Admin Review / Verify HTTPS Link| E[Publish Approved Content]
    E -->|Write message document| F[(chatRooms/{roomId}/messages)]
    F -->|Render in UI with 16:9 ratio & AI Badge| G[Community Feed]
```

---

## 📋 Core Flow & Rules

1. **Decoupled Content Studio**: `Content Studio` is a local-only project designed for content generation and has no direct database connection to Firebase.
2. **Standardized Package Export**: Content Studio exports a structured `Montessori Publish Package JSON` containing the generated text, metadata, and optional image information.
3. **ImageUrl Support**: The exported package structure supports containing an `imageUrl` pointing to an HTTPS link, or a blank string `""`.
4. **Admin Queue Import**: The main Montessori application imports the exported package directly into the Firestore collection `aiContentReviewQueue` under a `pending_review` status.
5. **HTTPS Link Editing**: Inside the Admin Review Queue, admins can manually paste, edit, and save the HTTPS image link.
6. **Strict URL Enforcement**: Only valid HTTPS URLs (or empty strings to discard images) are allowed for publishing to block potential malicious schemes (e.g. `javascript:`, `http://`).
7. **Community Message Format**: On publication, the `imageUrl` from the queue is stored inside the `images` field as a single-element string array (`images: [imageUrl]`) inside the document path `chatRooms/{roomId}/messages/{messageId}`.
8. **UI Presentation**: Published AI posts are rendered in the community section with a designated AI badge ("AI đã duyệt") and a responsive 16:9 image card.
9. **Functions Decoupling**: The publish operation is client-driven via Admin Firestore rules; no Firebase Cloud Functions are required or deployed.
10. **Storage Decoupling**: No Firebase Storage integration is used for storing AI-generated assets, avoiding storage cost and upload overhead.
11. **Sustainable Image Hosting**: Images should always be hosted on long-term, stable CDNs (e.g., Cloudinary) rather than relying on ephemeral URLs from AI engines (like Midjourney or DALL-E) that expire.
