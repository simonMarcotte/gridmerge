from pdf_merger import merge_pdfs_to_grid
from backup import merge_old
from time import perf_counter
import os



def main():
    input_pdfs = ["pdfs/Chapter1_Intro.pdf", "pdfs/Chapter2_Background.pdf", "pdfs/Chapter4_Software_Concepts.pdf", "pdfs/Chapter5_FreeRTOS.pdf"]

    OPTIONS = {
        "SLIDES_PER_ROW": 3,
        "SLIDES_PER_COLUMN": 3,
        "MARGIN": 20,
        "DPI_SCALE": 2.0
    }

    start = perf_counter()
    merge_pdfs_to_grid(input_pdfs, output_pdf="merged_slides.pdf", options=OPTIONS)
    end = perf_counter()

    print(f"Time taken: {end - start:.2f} seconds")

    start_old = perf_counter()
    merge_old(input_pdfs, output_pdf="merged_slides_old.pdf", options=OPTIONS)
    end_old = perf_counter()
    print(f"Time taken (old): {end_old - start_old:.2f} seconds")


if __name__ == "__main__":
    main()