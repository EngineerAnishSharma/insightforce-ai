import os
import time
import streamlit as st
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

st.set_page_config(page_title="InsightForce", layout="wide")

# =========================
# UI
# =========================
st.title("InsightForce 🚀")
st.caption("AI-Powered Document & Web Research Assistant")

st.sidebar.header("Inputs")

urls = [st.sidebar.text_input(f"URL {i+1}") for i in range(3)]

uploaded_files = st.sidebar.file_uploader(
    "Upload PDF, CSV, TXT, DOCX",
    type=["pdf", "csv", "txt", "docx"],
    accept_multiple_files=True
)

process_clicked = st.sidebar.button("Process Sources")

main_placeholder = st.empty()

# =========================
# Helpers
# =========================
def save_uploaded_file(uploaded_file):
    file_path = os.path.join(TEMP_DIR, uploaded_file.name)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    return file_path


def load_documents(urls, uploaded_files):
    documents = []

    # Load URLs
    valid_urls = [url for url in urls if url.strip()]
    if valid_urls:
        loader = UnstructuredURLLoader(urls=valid_urls)
        main_placeholder.text("Loading URL data... ✅")
        documents.extend(loader.load())

    # Load Files
    for uploaded_file in uploaded_files or []:
        file_path = save_uploaded_file(uploaded_file)

        if uploaded_file.name.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif uploaded_file.name.endswith(".csv"):
            loader = CSVLoader(file_path)
        elif uploaded_file.name.endswith(".txt"):
            loader = TextLoader(file_path)
        else:
            loader = UnstructuredFileLoader(file_path)

        main_placeholder.text(f"Loading {uploaded_file.name}... ✅")
        documents.extend(loader.load())

    return documents


def build_vectorstore(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", ","]
    )

    main_placeholder.text("Splitting documents... ✅")
    docs = text_splitter.split_documents(documents)

    embeddings = OpenAIEmbeddings()
    main_placeholder.text("Building embeddings & FAISS index... ✅")

    vectorstore = FAISS.from_documents(docs, embeddings)
    vectorstore.save_local(FAISS_PATH)


def load_vectorstore():
    return FAISS.load_local(FAISS_PATH, embeddings=OpenAIEmbeddings(), allow_dangerous_deserialization=True)


# =========================
# Processing
# =========================
if process_clicked:
    if not any(urls) and not uploaded_files:
        st.warning("Please provide at least one URL or file.")
    else:
        with st.spinner("Processing sources..."):
            docs = load_documents(urls, uploaded_files)
            build_vectorstore(docs)
            time.sleep(1)
        st.success("Sources processed successfully 🎉")

# =========================
# Q&A
# =========================
query = st.text_input("Ask a question")

if query:
    if not os.path.exists(FAISS_PATH):
        st.warning("Please process sources first.")
    else:
        llm = ChatOpenAI(temperature=0.3, max_completion_tokens=500)
        vectorstore = load_vectorstore()

        chain = RetrievalQAWithSourcesChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever()
        )

        result = chain({"question": query}, return_only_outputs=True)

        st.subheader("Answer")
        st.write(result["answer"])

        if result.get("sources"):
            st.subheader("Sources")
            for source in result["sources"].split("\n"):
                st.write(source)
