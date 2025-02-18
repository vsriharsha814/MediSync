import os
import faiss
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS  # ✅ Import CORS for frontend compatibility
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from werkzeug.utils import secure_filename
import openai
import PyPDF2
from docx import Document
import shutil
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # ✅ Allow Next.js requests

app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# Load OpenAI API Key
openai_api_key = os.getenv("NEXT_PUBLIC_OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("❌ NEXT_PUBLIC_OPENAI_API_KEY is missing! Set it in your .env file.")
openai.api_key = openai_api_key

# FAISS vector store
vector_dim = 1536  # OpenAI embedding size
index = faiss.IndexFlatL2(vector_dim)
stored_chunks = []
doc_metadata = {}  # Store doc name → chunk index mapping

# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"❌ Error extracting text from PDF: {e}")
        return ""
    return text.strip()

# Function to extract text from DOCX
def extract_text_from_docx(docx_path):
    try:
        doc = Document(docx_path)
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        print(f"❌ Error extracting text from DOCX: {e}")
        return ""

# Function to split text into chunks
def chunk_text(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=550, chunk_overlap=100)
    return splitter.split_text(text)

# Function to get AI embeddings
def get_embedding(text):
    try:
        embedding_model = OpenAIEmbeddings(openai_api_key=openai_api_key)
        return embedding_model.embed_query(text)
    except Exception as e:
        print(f"❌ Error generating embedding: {e}")
        return None

# API Route: Upload Document & Store Embeddings
@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1].lower()

        if file_ext not in [".pdf", ".docx"]:
            return jsonify({"error": "Unsupported file type"}), 400

        # ✅ Remove previous uploads and reset FAISS
        if os.path.exists(app.config["UPLOAD_FOLDER"]):
            shutil.rmtree(app.config["UPLOAD_FOLDER"])
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

        # Save file
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        # ✅ Reset FAISS index
        global index, stored_chunks, doc_metadata
        index = faiss.IndexFlatL2(vector_dim)
        stored_chunks = []
        doc_metadata = {}

        # Extract text
        text = extract_text_from_pdf(file_path) if file_ext == ".pdf" else extract_text_from_docx(file_path)
        if not text:
            return jsonify({"error": "Failed to extract text from document"}), 500

        # Chunk & store embeddings
        chunks = chunk_text(text)
        embeddings = [get_embedding(chunk) for chunk in chunks]
        
        if None in embeddings:
            return jsonify({"error": "Failed to generate embeddings"}), 500

        # Store embeddings in FAISS
        for i, embedding in enumerate(embeddings):
            index.add(np.array([embedding], dtype=np.float32))
            stored_chunks.append(chunks[i])

        doc_metadata[filename] = list(range(len(stored_chunks) - len(chunks), len(stored_chunks)))

        return jsonify({"message": f"Stored {len(chunks)} chunks from {filename}"}), 200

    except Exception as e:
        print(f"❌ Internal Server Error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# API Route: Search Documents
@app.route("/search", methods=["POST"])
def search_text():
    try:
        data = request.json
        query = data.get("query", "")

        if not query:
            return jsonify({"error": "No query provided"}), 400

        query_embedding = get_embedding(query)
        if query_embedding is None:
            return jsonify({"error": "Failed to generate query embedding"}), 500

        _, closest_match = index.search(np.array([query_embedding], dtype=np.float32), k=3)

        results = [stored_chunks[i] for i in closest_match[0] if i < len(stored_chunks)]
        
        return jsonify({"query": query, "results": results})

    except Exception as e:
        print(f"❌ Internal Server Error: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)