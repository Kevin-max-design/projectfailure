from PIL import Image, ImageDraw
import os

def generate_test_image():
    # Create a simple white canvas
    img = Image.new('RGB', (800, 600), color='white')
    d = ImageDraw.Draw(img)
    
    text = (
        "MEDMEMORY LOCAL OCR TEST\n\n"
        "Patient: LOCAL TEST PATIENT\n"
        "Date: 2026-07-18\n"
        "Hospital: LOCAL STAGING HOSPITAL\n"
        "Doctor: Dr. Local Tester\n"
        "Diagnosis: LOCAL TEST CONDITION ALPHA\n"
        "Medication: LOCALMED-X 250 mg once daily\n"
        "Reference: MM-LOCAL-OCR-71826"
    )
    
    # Draw simple text block
    d.text((50, 50), text, fill='black')
    
    # Ensure target directory exists
    os.makedirs('tests/fixtures', exist_ok=True)
    
    # Save original synthetic document
    img.save('tests/fixtures/synthetic_test_doc.png')
    print("Generated original test image: tests/fixtures/synthetic_test_doc.png")
    
    # Rotate 90 degrees clockwise and save
    rotated = img.rotate(90, expand=True)
    rotated.save('tests/fixtures/synthetic_test_doc_rotated.png')
    print("Generated 90-deg rotated test image: tests/fixtures/synthetic_test_doc_rotated.png")

if __name__ == '__main__':
    generate_test_image()
