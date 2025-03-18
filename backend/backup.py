import os
import fitz 
from PIL import Image, ImageDraw, ImageFont
from math import ceil
from io import BytesIO
import argparse

# Default configuration options
DEFAULT_OPTIONS = {
    "PAGE_WIDTH": 2480,         # in pixels
    "PAGE_HEIGHT": 3508,        # in pixels
    "MARGIN": 10,               # small margin between slides
    "TITLE_HEIGHT": 200,        # extra space at the top for the title
    "SLIDES_PER_COLUMN": 3,
    "SLIDES_PER_ROW": 2,
    "DPI_SCALE": 4,             # DPI scale factor when extracting slides from PDFs
}

def parse_args():
    """
    Parse command-line arguments.
    """
    parser = argparse.ArgumentParser(description="Merge multiple PDFs into a single PDF with slides arranged in a grid.")
    parser.add_argument("pdf_files", nargs="*", default=[], help="PDF files to merge into a grid")
    parser.add_argument("-o", "--output", default="merged_slides.pdf", help="Output PDF file")
    return parser.parse_args()

def extract_slides(pdf_path, dpi_scale=DEFAULT_OPTIONS["DPI_SCALE"]):
    """
    Extracts each page (slide) from the PDF as a PIL Image at high resolution.
    Returns a list of PIL Images.
    """
    doc = fitz.open(pdf_path)
    slides = []
    # Use a matrix scaling to boost the resolution
    mat = fitz.Matrix(dpi_scale, dpi_scale)
    for page in doc:
        pix = page.get_pixmap(matrix=mat)
        img = Image.open(BytesIO(pix.tobytes("png")))
        slides.append(img)
    return slides

def get_grid_dimensions(has_title, opts):
    """
    Compute the starting y-offset and grid cell dimensions using options.
    """
    if has_title:
        grid_top = opts["MARGIN"] + opts["TITLE_HEIGHT"]
        available_height = opts["PAGE_HEIGHT"] - grid_top - opts["MARGIN"]
    else:
        grid_top = opts["MARGIN"]
        available_height = opts["PAGE_HEIGHT"] - 2 * opts["MARGIN"]
    cell_width = (opts["PAGE_WIDTH"] - (opts["SLIDES_PER_ROW"] + 1) * opts["MARGIN"]) // opts["SLIDES_PER_ROW"]
    cell_height = (available_height - (opts["SLIDES_PER_COLUMN"] - 1) * opts["MARGIN"]) // opts["SLIDES_PER_COLUMN"]
    return grid_top, cell_width, cell_height

def draw_title(page_img, title_text, opts):
    """
    Draws a centered, bold title at the top of the given page image.
    """
    draw = ImageDraw.Draw(page_img)
    font_size = 100  # Change this to adjust the font size

    # Try to load fonts in order of preference
    try:
        font = ImageFont.truetype("times_new_roman.ttf", size=font_size)
    except OSError:
        try:
            font = ImageFont.truetype("arial.ttf", size=font_size)
        except OSError:
            try:
                font = ImageFont.truetype("DejaVuSans-Bold.ttf", size=font_size)
            except OSError as e:
                raise OSError("No valid font file found. Please ensure you have a valid TTF font available. " + 
                              "Error details: " + str(e))
    
    # Compute text dimensions using textbbox (Pillow v10+)
    text_bbox = draw.textbbox((0, 0), title_text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    # Center the text horizontally and position it within TITLE_HEIGHT
    x = (opts["PAGE_WIDTH"] - text_width) // 2
    y = (opts["TITLE_HEIGHT"] - text_height) // 2 + opts["MARGIN"]
    draw.text((x, y), title_text, fill="black", font=font)

def create_pages_from_slides(slides, pdf_title, opts):
    """
    Given a list of slide images and the PDF title, create pages arranged in a grid.
    The first page gets a title at the top.
    Returns a list of page images (PIL Images).
    """
    pages = []
    total_slides = len(slides)
    SLIDES_PER_PAGE = opts["SLIDES_PER_COLUMN"] * opts["SLIDES_PER_ROW"]
    num_pages = ceil(total_slides / SLIDES_PER_PAGE)
    
    for page_num in range(num_pages):
        has_title = (page_num == 0)
        page_img = Image.new("RGB", (opts["PAGE_WIDTH"], opts["PAGE_HEIGHT"]), "white")
        
        if has_title:
            draw_title(page_img, pdf_title, opts)
        
        grid_top, cell_width, cell_height = get_grid_dimensions(has_title, opts)
        
        for i in range(SLIDES_PER_PAGE):
            slide_index = page_num * SLIDES_PER_PAGE + i
            if slide_index >= total_slides:
                break
            
            slide = slides[slide_index].resize((cell_width, cell_height))
            
            # Fill down the column first
            row = i % opts["SLIDES_PER_COLUMN"]
            col = i // opts["SLIDES_PER_COLUMN"]
            
            x = opts["MARGIN"] + col * (cell_width + opts["MARGIN"])
            y = grid_top + row * (cell_height + opts["MARGIN"])
            
            page_img.paste(slide, (x, y))
        
        # Draw dotted lines to separate columns
        draw = ImageDraw.Draw(page_img)
        dot_length = 5
        gap = 5
        grid_bottom = grid_top + opts["SLIDES_PER_COLUMN"] * cell_height + (opts["SLIDES_PER_COLUMN"] - 1) * opts["MARGIN"]
        
        for col in range(1, opts["SLIDES_PER_ROW"]):
            x = opts["MARGIN"] + col * (cell_width + opts["MARGIN"]) - opts["MARGIN"] // 2
            y = grid_top
            while y < grid_bottom:
                y_end = min(y + dot_length, grid_bottom)
                draw.line((x, y, x, y_end), fill="blue", width=2)
                y += dot_length + gap
        
        pages.append(page_img)
    
    return pages

def merge_old(pdf_paths, output_pdf="merged_slides.pdf", options=None):
    """
    Merges PDF slides into a grid PDF.
    If an options dictionary is provided, it will override the defaults.
    """
    # Merge provided options with defaults.
    opts = {**DEFAULT_OPTIONS, **(options or {})}
    all_pages = []
    for pdf_path in pdf_paths:
        pdf_title = os.path.splitext(os.path.basename(pdf_path))[0]
        print(f"Processing {pdf_title} ...")
        slides = extract_slides(pdf_path, dpi_scale=opts["DPI_SCALE"])
        pages = create_pages_from_slides(slides, pdf_title, opts)
        all_pages.extend(pages)
    
    if not all_pages:
        print("No pages created.")
        return
    
    first_page = all_pages[0]
    first_page.save(output_pdf, save_all=True, append_images=all_pages[1:])
    print(f"PDF created: {output_pdf}")

if __name__ == "__main__":
    args = parse_args()
    input_pdfs = args.pdf_files if args.pdf_files is not None else []
    output_pdf = args.output
    merge_pdfs_to_grid(input_pdfs, output_pdf=output_pdf)
