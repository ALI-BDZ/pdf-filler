import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

export interface FieldInfo {
  name: string;
  type: string;
}

interface FillData {
  [key: string]: string | boolean;
}

@Injectable()
export class PdfService {
  async extractFields(buffer: Buffer): Promise<{ success: boolean; fields?: FieldInfo[]; error?: string }> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields().map((f: any) => ({
        name: f.getName(),
        type: f.constructor.name.replace('PDF', '').replace('Field', ''),
      }));

      return { success: true, fields };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async fillPdf(buffer: Buffer, data: FillData): Promise<{ buffer: Uint8Array; filename: string }> {
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const results = { filled: [] as string[], errors: [] as any[] };

    const findMatchingField = (jsonKey: string, pdfFields: any[]): any => {
      const normalizedKey = jsonKey.toLowerCase().replace(/_/g, ' ').trim();

      const exact = pdfFields.find((f) => f.getName() === jsonKey);
      if (exact) return exact;

      const ci = pdfFields.find((f) => f.getName().toLowerCase() === jsonKey.toLowerCase());
      if (ci) return ci;

      const partial = pdfFields.find((f) => {
        const pdfName = f.getName().toLowerCase();
        return pdfName.includes(normalizedKey) || normalizedKey.includes(pdfName);
      });
      if (partial) return partial;

      const mappings: { [key: string]: string[] } = {
        'surname': ['surname of birth', 'family name', 'last name', 'surname of holder'],
        'first name': ['first name', 'given name', 'firstname', 'given names', 'forename'],
        'first_name': ['first name', 'given name', 'firstname', 'given names', 'forename'],
        'last name': ['surname', 'surname of birth', 'family name'],
        'last_name': ['surname', 'surname of birth', 'family name'],
        'date of birth': ['date of birth', 'dob', 'birth date', 'date of birth:'],
        'date_of_birth': ['date of birth', 'dob', 'birth date', 'date of birth:'],
        'passport number': ['passport number', 'passport no', 'passport number:', 'passport no.'],
        'passport_number': ['passport number', 'passport no', 'passport number:', 'passport no.'],
        'nationality': ['nationality', 'citizenship', 'nationality:'],
        'sex': ['sex', 'gender', 'sex:'],
        'gender': ['sex', 'gender', 'gender:'],
        'place of birth': ['place of birth', 'birth place', 'place of birth:'],
        'place_of_birth': ['place of birth', 'birth place', 'place of birth:'],
        'address': ['address', 'address:', 'residential address'],
        'city': ['city', 'town', 'city:'],
        'country': ['country', 'country:', 'nationality'],
        'phone': ['phone', 'telephone', 'phone number', 'mobile'],
        'email': ['email', 'e-mail', 'email address', 'email:'],
        'occupation': ['occupation', 'profession', 'occupation:'],
      };

      if (mappings[normalizedKey]) {
        return pdfFields.find((f) =>
          mappings[normalizedKey].includes(f.getName().toLowerCase())
        );
      }

      return null;
    };

    for (const [fieldName, value] of Object.entries(data)) {
      try {
        const field = findMatchingField(fieldName, form.getFields());

        if (!field) {
          results.errors.push({ field: fieldName, error: 'No matching field found in PDF' });
          continue;
        }

        if (field.constructor.name === 'PDFCheckBox') {
          if (value) field.check();
        } else if (field.getText) {
          field.setText(String(value));
        }

        field.disableEditing();
        results.filled.push(fieldName);
      } catch (e) {
        results.errors.push({ field: fieldName, error: e.message });
      }
    }

    form.flatten();
    const filledPdf = await pdfDoc.save();

    return { buffer: filledPdf, filename: 'visa.pdf' };
  }
}