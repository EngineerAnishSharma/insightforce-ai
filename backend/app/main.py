import os
import time
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_classic.chains import RetrievalQAWithSourcesChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

from langchain_community.document_loaders import (
    UnstructuredURLLoader,
    PyPDFLoader,
    CSVLoader,
    TextLoader,
    UnstructuredFileLoader
)

# =========================
# Config
# =========================
load_dotenv()

FAISS_PATH = "faiss_store"
TEMP_DIR = "temp_files"

os.makedirs(TEMP_DIR, exist_ok=True)

app = FastAPI(
    title="InsightForce",
    description="AI-Powered Document & Web Research Assistant",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Pydantic Models
# =========================
class ProcessSourcesRequest(BaseModel):
    urls: List[str]

class QueryRequest(BaseModel):
    question: str

# =========================
# Helpers
# =========================
def save_uploaded_file(uploaded_file):
    file_path = os.path.join(TEMP_DIR, uploaded_file.filename)
    with open(file_path, "wb") as f:
        content = uploaded_file.file.read()
        f.write(content)
    return file_path


def load_documents(urls: List[str], uploaded_files: List[str]):
    documents = []

    # Load URLs
    valid_urls = [url for url in urls if url.strip()]
    if valid_urls:
        loader = UnstructuredURLLoader(urls=valid_urls)
        documents.extend(loader.load())

    # Load Files
    for file_path in uploaded_files or []:
        if not os.path.exists(file_path):
            continue

        if file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith(".csv"):
            loader = CSVLoader(file_path)
        elif file_path.endswith(".txt"):
            loader = TextLoader(file_path)
        else:
            loader = UnstructuredFileLoader(file_path)

        documents.extend(loader.load())

    return documents


def build_vectorstore(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", ","]
    )

    docs = text_splitter.split_documents(documents)

    embeddings = OpenAIEmbeddings()

    vectorstore = FAISS.from_documents(docs, embeddings)
    vectorstore.save_local(FAISS_PATH)


def load_vectorstore():
    return FAISS.load_local(FAISS_PATH, embeddings=OpenAIEmbeddings(), allow_dangerous_deserialization=True)


# =========================
# API Endpoints
# =========================
@app.get("/")
async def root():
    return {
        "name": "InsightForce",
        "description": "AI-Powered Document & Web Research Assistant",
        "version": "1.0.0"
    }

@app.post("/process-urls")
async def process_urls(request: ProcessSourcesRequest):
    """
    Process one or more URLs (JSON body) to build FAISS vectorstore.
    { "urls": ["https://example.com", "https://another.com"] }
    """
    try:
        url_list = [u.strip() for u in (request.urls or []) if u and u.strip()]
        if not url_list:
            raise HTTPException(status_code=400, detail="Please provide at least one URL")

        # Load documents from URLs only
        docs = load_documents(url_list, [])
        if not docs:
            raise HTTPException(status_code=400, detail="No documents loaded from provided URLs")

        # Build vectorstore
        build_vectorstore(docs)

        return {
            "status": "success",
            "message": "URLs processed successfully",
            "documents_loaded": len(docs),
            "urls_processed": len(url_list),
            "files_processed": 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-files")
async def process_files(files: List[UploadFile] = File(...)):
    """
    Process one or more uploaded documents (PDF, CSV, TXT, DOCX) to build FAISS vectorstore.
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="Please upload at least one file")

        uploaded_file_paths: List[str] = []
        for file in files:
            if not file or not file.filename:
                continue
            file_path = save_uploaded_file(file)
            uploaded_file_paths.append(file_path)

        if not uploaded_file_paths:
            raise HTTPException(status_code=400, detail="No valid files provided")

        # Load documents from files only
        docs = load_documents([], uploaded_file_paths)
        if not docs:
            raise HTTPException(status_code=400, detail="No documents loaded from provided files")

        # Build vectorstore
        build_vectorstore(docs)

        return {
            "status": "success",
            "message": "Files processed successfully",
            "documents_loaded": len(docs),
            "urls_processed": 0,
            "files_processed": len(uploaded_file_paths)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-sources")
async def process_sources(urls: Optional[str] = Form(None), files: Optional[List[UploadFile]] = File(default=None)):
    """
    Process URLs and uploaded files to build FAISS vectorstore
    urls: (Optional) URLs as JSON array string '["url1", "url2"]' or comma-separated 'url1, url2' or single 'url1'
    files: (Optional) Uploaded files (PDF, CSV, TXT, DOCX)
    """
    try:
        # Parse URLs flexibly
        url_list = []
        
        if urls:
            urls = urls.strip()
            
            # Try JSON array format first
            if urls.startswith('['):
                url_list = json.loads(urls)
            # Try comma-separated format
            elif ',' in urls:
                url_list = [u.strip() for u in urls.split(',') if u.strip()]
            # Single URL
            else:
                url_list = [urls] if urls else []
            
            # Ensure it's a list
            if not isinstance(url_list, list):
                url_list = [url_list]
        
        uploaded_file_paths = []
        
        # Save uploaded files
        if files:
            for file in files:
                if file and file.filename:
                    file_path = save_uploaded_file(file)
                    uploaded_file_paths.append(file_path)
        
        # Validate that at least one source is provided
        if not url_list and not uploaded_file_paths:
            raise HTTPException(status_code=400, detail="Please provide at least one URL or file")
        
        # Load documents from URLs and files
        docs = load_documents(url_list, uploaded_file_paths)
        
        if not docs:
            raise HTTPException(status_code=400, detail="No documents loaded from provided sources")
        
        # Build vectorstore
        build_vectorstore(docs)
        
        return {
            "status": "success",
            "message": "Sources processed successfully",
            "documents_loaded": len(docs),
            "urls_processed": len(url_list),
            "files_processed": len(uploaded_file_paths)
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="URLs must be valid JSON array format or comma-separated string")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query_documents(request: QueryRequest):
    """
    Query the vectorstore and get answers with sources
    """
    try:
        if not os.path.exists(FAISS_PATH):
            raise HTTPException(status_code=400, detail="Please process sources first")
        
        llm = ChatOpenAI(temperature=0.3, max_completion_tokens=500)
        vectorstore = load_vectorstore()

        chain = RetrievalQAWithSourcesChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever()
        )

        result = chain({"question": request.question}, return_only_outputs=True)

        sources = result.get("sources", "").split("\n") if result.get("sources") else []
        sources = [s.strip() for s in sources if s.strip()]

        return {
            "status": "success",
            "answer": result["answer"],
            "sources": sources
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# Cleanup
# =========================
@app.post("/reset")
async def reset():
    """
    Clear FAISS vectorstore and temporary files
    """
    try:
        if os.path.exists(FAISS_PATH):
            shutil.rmtree(FAISS_PATH)
        
        if os.path.exists(TEMP_DIR):
            shutil.rmtree(TEMP_DIR)
        
        os.makedirs(TEMP_DIR, exist_ok=True)
        
        return {"status": "success", "message": "Reset completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
