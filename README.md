# 🌿 TCM Oracle

> **Personalized Traditional Chinese Medicine Dietary System** — AI-powered, privacy-first, locally run.

TCM Oracle is a health platform that combines local LLMs with RAG (Retrieval-Augmented Generation) to deliver personalized TCM dietary recommendations. It identifies your body constitution and curates tailored nutrition plans — with 100% data privacy, no cloud required.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔒 **Local Inference** | Powered by Qwen 2.5 (7B) — all data stays on your machine |
| 📚 **RAG Architecture** | Grounded in verified TCM datasets for clinical accuracy |
| 📋 **Smart Reports** | Automated generation of dietary plans and health summaries |
| ⚡ **Vibe Coded** | Rapidly architected and logic-optimized with Claude |

---

## 🧠 Core Architecture

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│             Nginx Reverse Proxy         │
│         (routes /v1/ → port 8080)       │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│           llama-server (llama.cpp)      │
│         Qwen 2.5 7B · GPU Accelerated   │
│           + Embedding for RAG           │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│          TCM Knowledge Base (RAG)       │
│   Food properties · Body constitutions │
└─────────────────────────────────────────┘
```

- **Local LLM** — Qwen 2.5 (7B) for intelligent, private consultation
- **RAG System** — `--embedding` flag enables TCM food & constitution retrieval
- **Agent Tools** — Claude for logic optimization and report generation
- **Reverse Proxy** — Nginx for secure frontend-backend communication

---

## 🛠️ Setup & Deployment

### Step 1 — Build llama.cpp

We use llama.cpp as our high-performance inference engine, similar to bundling a web app — compiling C++ files into a single executable.

```bash
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
cmake -B build
cmake --build build --config Release
cd ..
```

### Step 2 — Download the Model

We use **Qwen 2.5 7B Instruct** for its superior balance of medical knowledge and reasoning.

```bash
# Download Qwen 2.5 7B Instruct (GGUF format, ~4GB)
wget https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q3_k_m.gguf
```

### Step 3 — Start the Inference Server

Run the llama-server on port `8080` with GPU acceleration and vector embeddings enabled.

```bash
./llama.cpp/build/bin/llama-server \
  -m ./qwen2.5-7b-instruct-q3_k_m.gguf \
  -ngl 99 \
  --port 8080 \
  --host 0.0.0.0 \
  --embedding
```

| Flag | Purpose |
|---|---|
| `-ngl 99` | Offload all layers to GPU |
| `--embedding` | Enable vector embeddings for RAG |
| `--host 0.0.0.0` | Accept connections from all interfaces |

---

## 🌐 Web Deployment (Nginx)

### Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### Configure Reverse Proxy

Edit `/etc/nginx/sites-available/default` to proxy `/v1/` requests to the local llama-server:

```nginx
location /v1/ {
    proxy_pass http://localhost:8080/v1/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Apply & Restart

```bash
sudo cp nginx.conf /etc/nginx/sites-available/default
sudo service nginx restart
```

---

## 📸 Screenshots

<!-- Replace with your actual image paths or hosted URLs -->
![Dashboard Overview](https://github.com/user-attachments/assets/6252bb37-dbbc-45d0-aab8-cd6480b323d7)

![Body Constitution Analysis](https://github.com/user-attachments/assets/7a9058f0-b139-4e90-b9ab-5dabb642fd9e)

![Dietary Recommendations](https://github.com/user-attachments/assets/64938fba-8833-4ca1-a28c-3d979791bb6e)

---

## 📄 License

This project is open source. See [LICENSE](./LICENSE) for details.
