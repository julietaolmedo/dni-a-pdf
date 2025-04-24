// Ruta de API: /api/generate-pdf
// Requiere: 'tesseract.js' para OCR y 'pdf-lib' para armar el PDF

import { NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import Tesseract from 'tesseract.js';

export async function POST(req) {
  const formData = await req.formData();
  const frontFile = formData.get('front');
  const backFile = formData.get('back');

  const frontArrayBuffer = await frontFile.arrayBuffer();
  const backArrayBuffer = await backFile.arrayBuffer();

  const frontImage = await loadImage(Buffer.from(frontArrayBuffer));
  const backImage = await loadImage(Buffer.from(backArrayBuffer));

  const extractText = async (imageBuffer) => {
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'spa');
    return text;
  };

  const frontText = await extractText(Buffer.from(frontArrayBuffer));

  const dniMatch = frontText.match(/\d{7,8}/);
  const nameMatch = frontText.match(/Nombre\s*:\s*(.*)/i);

  const dni = dniMatch ? dniMatch[0] : '00000000';
  const fullName = nameMatch ? nameMatch[1].trim().replace(/\s+/g, '') : 'NombreApellido';

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 1008]);

  const embedImage = async (img, yOffset) => {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgBytes = canvas.toBuffer('image/jpeg');
    const embeddedImage = await pdfDoc.embedJpg(imgBytes);
    const imgDims = embeddedImage.scale(0.8);
    page.drawImage(embeddedImage, {
      x: (page.getWidth() - imgDims.width) / 2,
      y: yOffset,
      width: imgDims.width,
      height: imgDims.height,
    });
  };

  await embedImage(frontImage, 550);
  await embedImage(backImage, 250);

  const pdfBytes = await pdfDoc.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="DNI_${dni}_${fullName}.pdf"`
    }
  });
}
