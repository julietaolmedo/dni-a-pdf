
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buffers = [];
  req.on('data', (chunk) => buffers.push(chunk));
  req.on('end', async () => {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const buffer = Buffer.concat(buffers).toString();

    const getBase64Image = (label) => {
      const part = buffer.split(label)[1];
      const base64Start = part.indexOf('base64,') + 7;
      const base64End = part.indexOf('--') > 0 ? part.indexOf('--') : part.length;
      return part.substring(base64Start, base64End).trim();
    };

    const frontBase64 = getBase64Image('name="front"');
    const backBase64 = getBase64Image('name="back"');

    const frontBuffer = Buffer.from(frontBase64, 'base64');
    const backBuffer = Buffer.from(backBase64, 'base64');

    const { data: { text } } = await Tesseract.recognize(frontBuffer, 'spa');
    const dni = text.match(/\d{7,8}/)?.[0] || '00000000';
    const name = text.match(/Nombre\s*:\s*(.*)/i)?.[1]?.trim().replace(/\s+/g, '') || 'NombreApellido';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 1008]);

    const embedImage = async (b64, y) => {
      const image = await pdfDoc.embedJpg(Buffer.from(b64, 'base64'));
      const dims = image.scale(0.6);
      page.drawImage(image, {
        x: (page.getWidth() - dims.width) / 2,
        y: y,
        width: dims.width,
        height: dims.height,
      });
    };

    await embedImage(frontBase64, 550);
    await embedImage(backBase64, 250);

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=DNI_${dni}_${name}.pdf`);
    res.send(Buffer.from(pdfBytes));
  });
}
