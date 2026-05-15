# 🌿 Montessori AI — RAG Chatbot

Ứng dụng chatbot thông minh tích hợp RAG (Retrieval-Augmented Generation) dành cho mẹ và bé, kết hợp phương pháp giáo dục Montessori.

## 🏗️ Kiến trúc hệ thống

```
User Question
     │
     ▼
[Frontend React]  →  POST /api/chat
     │
     ▼
[Express Backend]
     ├── generateEmbedding (Gemini text-embedding-004)
     │       ↓ query vector (768 dims)
     ├── querySimilar (Pinecone Serverless)
     │       ↓ top-5 relevant chunks
     └── generateRAGResponse (Gemini 2.0 Flash)
             ↓ grounded answer
     ▼
[Frontend]  ← Display answer + sources
```

## 📁 Cấu trúc dự án

```
Montessori/
├── backend/
│   ├── src/
│   │   ├── server.js                 # Express server
│   │   ├── routes/
│   │   │   ├── chat.js               # POST /api/chat
│   │   │   └── ingest.js             # POST /api/ingest/text|file
│   │   ├── services/
│   │   │   ├── geminiClient.js       # Embedding + Chat generation
│   │   │   ├── pineconeClient.js     # Vector DB operations
│   │   │   └── ragService.js         # RAG pipeline orchestration
│   │   └── utils/
│   │       └── documentProcessor.js  # Text chunking
│   ├── .env                          # API keys (fill this!)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── ChatScreen.jsx        # Chatbot UI
    │   │   └── IngestScreen.jsx      # Document upload UI
    │   └── App.jsx
    └── package.json
```

## 🚀 Cài đặt và chạy

### 1. Lấy API Keys

| Service | Link |
|---------|------|
| Gemini API | https://aistudio.google.com/apikey |
| Pinecone | https://app.pinecone.io |

### 2. Điền API Keys vào `.env`

```bash
# backend/.env
GEMINI_API_KEY=AIza...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=montessori-knowledge
PORT=3001
```

### 3. Chạy Backend

```bash
cd backend
npm run dev
# → http://localhost:3001
```

### 4. Chạy Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

## 📚 Nhập tài liệu vào RAG

### Qua giao diện web

Vào tab **"Thêm tài liệu"** → Upload file PDF/TXT hoặc dán văn bản.

### Qua API (curl)

```bash
# Nhập văn bản
curl -X POST http://localhost:3001/api/ingest/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trong 3 tháng đầu thai kỳ, mẹ bầu cần...",
    "sourceName": "Hướng dẫn thai kỳ tam cá nguyệt 1"
  }'

# Hỏi chatbot
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tôi đang có bầu được 3 tháng, cần chú ý những gì?"}'
```

## 🔧 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/chat` | Gửi câu hỏi, nhận trả lời RAG |
| DELETE | `/api/chat/session/:id` | Xóa lịch sử session |
| POST | `/api/ingest/text` | Nhập văn bản vào Pinecone |
| POST | `/api/ingest/file` | Upload PDF/TXT vào Pinecone |
| GET | `/api/ingest/stats` | Xem thống kê Pinecone |
| GET | `/health` | Health check |
