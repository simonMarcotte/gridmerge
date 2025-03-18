from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from typing import List
from io import BytesIO
import json
import PyPDF2

# Import your updated PDF merging logic
from pdf_merger import merge_pdfs_to_grid

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-PDF-Name", "X-PDF-Size", "X-PDF-Pages"]
)


@app.post("/merge-pdfs/")
async def merge_pdfs(
    files: List[UploadFile] = File(...),
    options: str = Form(None)
):
    try:
        # Parse the options JSON if provided
        options_dict = json.loads(options) if options else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in options field")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save uploaded files
        input_paths = []
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(status_code=400, detail="Only PDF files are allowed")
            
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
            input_paths.append(file_path)
        
        # Output path in the temporary directory
        # filename = os.path.basename(file[0].filename).replace(".pdf", "_merged.pdf")
        filename = os.path.basename(files[0].filename).replace(".pdf", "_merged.pdf")
        output_path = os.path.join(temp_dir, filename)
        
        # Call merge_pdfs_to_grid with the provided options
        merge_pdfs_to_grid(input_paths, output_pdf=output_path, options=options_dict)
        
        # Count pages and get file size
        with open(output_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            page_count = len(pdf_reader.pages)
            file_size = os.path.getsize(output_path)
        
        # Read the generated PDF into memory
        with open(output_path, "rb") as pdf_file:
            pdf_bytes = pdf_file.read()

        
        # Return PDF with custom headers for metadata
        return StreamingResponse(
            BytesIO(pdf_bytes), 
            media_type="application/pdf", 
            headers={
                "Content-Disposition": "attachment; filename=merged_slides.pdf",
                "X-PDF-Name": "merged_slides.pdf",
                "X-PDF-Size": str(file_size),
                "X-PDF-Pages": str(page_count),
                "X-PDF-Name": str(filename)
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)