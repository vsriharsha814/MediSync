import os
import faiss
import numpy as np
from flask import Flask, request, jsonify
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from werkzeug.utils import secure_filename
import openai
import PyPDF2
from docx import Document
import shutil

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

openai.api_key = os.getenv("OPENAI_API_KEY")  # Store API key in environment variables

# FAISS vector store
vector_dim = 1536  # OpenAI embedding size
index = faiss.IndexFlatL2(vector_dim)
stored_chunks = []
doc_metadata = {}  # Store doc name → chunk index mapping

# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text.strip()

# Function to extract text from DOCX
def extract_text_from_docx(docx_path):
    doc = Document(docx_path)
    return "\n".join([para.text for para in doc.paragraphs])

# Function to split text into chunks
def chunk_text(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=550, chunk_overlap=100)
    return splitter.split_text(text)

# Function to get AI embeddings
def get_embedding(text):
    embedding_model = OpenAIEmbeddings()
    return embedding_model.embed_query(text)

# API Route: Upload Document & Store Embeddings
@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext not in [".pdf", ".docx"]:
        return jsonify({"error": "Unsupported file type"}), 400

    if os.path.exists(app.config["UPLOAD_FOLDER"]):
        shutil.rmtree(app.config["UPLOAD_FOLDER"])
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Save file
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    global index, stored_chunks, doc_metadata
    index = faiss.IndexFlatL2(1536)
    stored_chunks = []
    doc_metadata = {}

    # Extract text
    if file_ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_docx(file_path)

    # Chunk & store embeddings
    chunks = chunk_text(text)
    embeddings = [get_embedding(chunk) for chunk in chunks]

    # Store embeddings in FAISS
    for i, embedding in enumerate(embeddings):
        index.add(np.array([embedding], dtype=np.float32))
        stored_chunks.append(chunks[i])

    doc_metadata[filename] = list(range(len(stored_chunks) - len(chunks), len(stored_chunks)))

    return jsonify({"message": f"Stored {len(chunks)} chunks from {filename}"}), 200

# API Route: Search Documents
@app.route("/search", methods=["POST"])
def search_text():
    data = request.json
    query = data.get("query", "")

    if not query:
        return jsonify({"error": "No query provided"}), 400

    query_embedding = get_embedding(query)
    _, closest_match = index.search(np.array([query_embedding], dtype=np.float32), k=3)

    results = [stored_chunks[i] for i in closest_match[0] if i < len(stored_chunks)]
    
    return jsonify({"query": query, "results": results})

if __name__ == "__main__":
    app.run(port=5001, debug=True)