import os
from pathlib import Path
from math import ceil
from io import BytesIO
from concurrent.futures import ProcessPoolExecutor, as_completed

import fitz
from PIL import Image, ImageDraw, ImageFont

DEFAULT_OPTIONS = {
    "PAGE_WIDTH": 2480,
    "PAGE_HEIGHT": 3508,
    "MARGIN": 10,
    "TITLE_HEIGHT": 200,
    "SLIDES_PER_COLUMN": 3,
    "SLIDES_PER_ROW": 2,
    "DPI_SCALE": 4,
}

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"

FONT_CANDIDATES = [
    FONTS_DIR / "times_new_roman.ttf",  # bundled
    "DejaVuSans-Bold.ttf",              # installed via apt in Docker
    "arial.ttf",                         # system fallback
]


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(str(candidate), size=size)
        except OSError:
            continue
    raise OSError("No valid TTF font found")


def _get_grid_dimensions(has_title: bool, opts: dict):
    if has_title:
        grid_top = opts["MARGIN"] + opts["TITLE_HEIGHT"]
        available_height = opts["PAGE_HEIGHT"] - grid_top - opts["MARGIN"]
    else:
        grid_top = opts["MARGIN"]
        available_height = opts["PAGE_HEIGHT"] - 2 * opts["MARGIN"]
    cell_width = (
        opts["PAGE_WIDTH"] - (opts["SLIDES_PER_ROW"] + 1) * opts["MARGIN"]
    ) // opts["SLIDES_PER_ROW"]
    cell_height = (
        available_height - (opts["SLIDES_PER_COLUMN"] - 1) * opts["MARGIN"]
    ) // opts["SLIDES_PER_COLUMN"]
    return grid_top, cell_width, cell_height


def _draw_title(page_img: Image.Image, title_text: str, opts: dict) -> None:
    draw = ImageDraw.Draw(page_img)
    font = _load_font(100)
    bbox = draw.textbbox((0, 0), title_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (opts["PAGE_WIDTH"] - text_w) // 2
    y = (opts["TITLE_HEIGHT"] - text_h) // 2 + opts["MARGIN"]
    draw.text((x, y), title_text, fill="black", font=font)


def _draw_column_separators(
    draw: ImageDraw.ImageDraw, grid_top: int, grid_bottom: int,
    cell_width: int, opts: dict,
) -> None:
    dot_length, gap = 5, 5
    for col in range(1, opts["SLIDES_PER_ROW"]):
        x = opts["MARGIN"] + col * (cell_width + opts["MARGIN"]) - opts["MARGIN"] // 2
        y = grid_top
        while y < grid_bottom:
            y_end = min(y + dot_length, grid_bottom)
            draw.line((x, y, x, y_end), fill="blue", width=2)
            y += dot_length + gap


def _rasterize_page(pdf_path: str, page_idx: int, dpi_scale: int) -> bytes:
    """Rasterize a single PDF page to PNG bytes. Runs in a separate process."""
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    mat = fitz.Matrix(dpi_scale, dpi_scale)
    pix = page.get_pixmap(matrix=mat)
    png_bytes = pix.tobytes("png")
    doc.close()
    return png_bytes


def _build_grid_page(
    slide_pngs: list[tuple[int, bytes]],
    has_title: bool,
    pdf_title: str,
    opts: dict,
) -> Image.Image:
    """Compose a single grid page from pre-rasterized slide PNGs."""
    page_img = Image.new("RGB", (opts["PAGE_WIDTH"], opts["PAGE_HEIGHT"]), "white")

    if has_title:
        _draw_title(page_img, pdf_title, opts)

    grid_top, cell_width, cell_height = _get_grid_dimensions(has_title, opts)

    for i, (_, png_bytes) in enumerate(slide_pngs):
        slide_img = Image.open(BytesIO(png_bytes))
        slide_img = slide_img.resize((cell_width, cell_height))

        row = i % opts["SLIDES_PER_COLUMN"]
        col = i // opts["SLIDES_PER_COLUMN"]
        x = opts["MARGIN"] + col * (cell_width + opts["MARGIN"])
        y = grid_top + row * (cell_height + opts["MARGIN"])
        page_img.paste(slide_img, (x, y))
        del slide_img

    grid_bottom = (
        grid_top
        + opts["SLIDES_PER_COLUMN"] * cell_height
        + (opts["SLIDES_PER_COLUMN"] - 1) * opts["MARGIN"]
    )
    _draw_column_separators(
        ImageDraw.Draw(page_img), grid_top, grid_bottom, cell_width, opts
    )

    return page_img


# Number of parallel rasterization workers
_MAX_WORKERS = max(1, os.cpu_count() or 1)


def process_single_pdf(
    pdf_path: str,
    opts: dict,
    work_dir: Path,
) -> list[Path]:
    """Process one PDF into grid page images saved to disk.

    Uses multiprocessing to rasterize pages in parallel for speed.
    Returns list of PNG paths.
    """
    pdf_title = os.path.splitext(os.path.basename(pdf_path))[0]
    doc = fitz.open(pdf_path)
    total_slides = len(doc)
    doc.close()

    slides_per_page = opts["SLIDES_PER_COLUMN"] * opts["SLIDES_PER_ROW"]
    num_pages = ceil(total_slides / slides_per_page)
    dpi_scale = opts["DPI_SCALE"]

    page_paths: list[Path] = []

    # Process each grid page
    for page_num in range(num_pages):
        has_title = page_num == 0 and opts["TITLE_HEIGHT"] > 0
        start = page_num * slides_per_page
        end = min(start + slides_per_page, total_slides)
        slide_indices = list(range(start, end))

        # Rasterize all slides for this grid page in parallel
        slide_pngs: dict[int, bytes] = {}

        with ProcessPoolExecutor(max_workers=_MAX_WORKERS) as executor:
            futures = {
                executor.submit(_rasterize_page, pdf_path, idx, dpi_scale): idx
                for idx in slide_indices
            }
            for future in as_completed(futures):
                idx = futures[future]
                slide_pngs[idx] = future.result()

        # Build the grid page (sorted by original index)
        ordered = sorted(slide_pngs.items(), key=lambda x: x[0])
        page_img = _build_grid_page(ordered, has_title, pdf_title, opts)

        # Save to disk, free memory
        out_path = work_dir / f"{pdf_title}_page_{page_num:04d}.png"
        page_img.save(out_path, format="PNG")
        page_paths.append(out_path)
        del page_img, slide_pngs

    return page_paths


def assemble_output_pdf(page_image_paths: list[Path], output_path: str) -> int:
    """Combine grid page images into a single PDF, one page at a time.

    Returns the total page count.
    """
    doc = fitz.open()
    for img_path in page_image_paths:
        img = fitz.open(str(img_path))
        # Convert image to a one-page PDF, then insert
        pdf_bytes = img.convert_to_pdf()
        img.close()
        img_pdf = fitz.open("pdf", pdf_bytes)
        doc.insert_pdf(img_pdf)
        img_pdf.close()

    doc.save(output_path)
    page_count = len(doc)
    doc.close()
    return page_count
