
import { createCanvas, loadImage } from 'canvas';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buffers = [];
  req.on('data', (chunk) => buffers.push(chunk));
  req.on('end', async () => {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const buffer = Buffer.concat(buffers);
    const parts = buffer.toString().split('--' + boundary);
    const getImageData = (name) =>
      parts.find(p => p.includes(name))?.split('base64,')[1];

    const frontBase64 = getImageData('front');
    const backBase64 = getImageData('back');
    const frontBuffer = Buffer.from(frontBase64, 'base64');
    const backBuffer = Buffer.from(backBase64, 'base64');

    const frontImage = await loadImage(frontBuffer);
    const backImage = await loadImage(backBuffer);

    const { data: { text } } = await Tesseract.recognize(frontBuffer, 'spa');
    const dni = text.match(/\d{7,8}/)?.[0] || '00000000';
    const name = text.match(/Nombre\s*:\s*(.*)/i)?.[1]?.trim().replace(/\s+/g, '') || 'NombreApellido';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 1008]);

    const embed = async (img, y) => {
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageBytes = canvas.toBuffer('image/jpeg');
      const embedded = await pdfDoc.embedJpg(imageBytes);
      const dims = embedded.scale(0.8);
      page.drawImage(embedded, {
        x: (page.getWidth() - dims.width) / 2,
        y: y,
        width: dims.width,
        height: dims.height,
      });
    };

    await embed(frontImage, 550);
    await embed(backImage, 250);

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=DNI_${dni}_${name}.pdf`);
    res.send(Buffer.from(pdfBytes));
  });
}
