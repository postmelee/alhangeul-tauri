export interface PdfAnalysisOptions {
  pdfPath: string;
  outputDir: string;
  label: string;
  expectedPageCount: number;
  expectedTitle: string;
  minTextCounts: number[];
}

export interface PdfAnalysisResult {
  summary: Record<string, unknown>;
  summaryPath: string;
  renderPaths: string[];
}

export function analyzePdf(options: PdfAnalysisOptions): Promise<PdfAnalysisResult>;
