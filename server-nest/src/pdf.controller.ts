import { Controller, Post, Res, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@Controller('api')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('fields')
  @UseInterceptors(FileInterceptor('template'))
  async extractFields(@UploadedFile() file: Express.Multer.File) {
    console.log('Received file:', file);
    if (!file) {
      return { success: false, error: 'No PDF uploaded' };
    }
    return this.pdfService.extractFields(file.buffer);
  }

  @Post('render')
  @UseInterceptors(FileInterceptor('template'))
  async renderPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') dataJson: string,
    @Res() res: Response,
  ) {
    console.log('Received file for render:', file);
    if (!file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    const data = JSON.parse(dataJson || '{}');
    const { buffer, filename } = await this.pdfService.fillPdf(file.buffer, data);

    res.setHeader('Content-Disposition', `attachment; filename=filled_${filename}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(buffer));
  }
}