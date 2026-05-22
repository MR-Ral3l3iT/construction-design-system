import { QueryProvider } from '@/providers/query-provider'

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <style>{`
        body { background: #e2e8f0; margin: 0; }
        .print-page {
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          margin: 32px auto !important;
        }
        .copy-orig { page: orig; }
        .copy-sane { page: sane; }
        .page-break { height: 32px; }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none; margin: 0 auto !important; }
          .page-break { height: 0; }

          @page { size: A4 landscape; margin: 0; }
          .print-page { height: auto !important; overflow: visible !important; }
          .print-page-break { break-after: page; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          @page orig {
            margin-bottom: 12mm;
            @bottom-right {
              content: "ต้นฉบับ " counter(page);
              font-size: 9pt;
              font-family: Sarabun, 'Prompt', sans-serif;
              color: #aaa;
              padding-right: 14mm;
            }
          }
          @page orig:first { counter-reset: page 0; }

          @page sane {
            margin-bottom: 12mm;
            @bottom-right {
              content: "สำเนา " counter(page);
              font-size: 9pt;
              font-family: Sarabun, 'Prompt', sans-serif;
              color: #aaa;
              padding-right: 14mm;
            }
          }
          @page sane:first { counter-reset: page 0; }

          @page qt-orig {
            size: A4 portrait; margin: 0; margin-bottom: 12mm;
            @bottom-right {
              content: "ต้นฉบับ " counter(page);
              font-size: 9pt; font-family: Sarabun, 'Prompt', sans-serif; color: #aaa; padding-right: 14mm;
            }
          }
          @page qt-orig:first { counter-reset: page 0; }
          @page qt-sane {
            size: A4 portrait; margin: 0; margin-bottom: 12mm;
            @bottom-right {
              content: "สำเนา " counter(page);
              font-size: 9pt; font-family: Sarabun, 'Prompt', sans-serif; color: #aaa; padding-right: 14mm;
            }
          }
          @page qt-sane:first { counter-reset: page 0; }
          .copy-qt-orig { page: qt-orig; }
          .copy-qt-sane { page: qt-sane; }
        }
      `}</style>
      {children}
    </QueryProvider>
  )
}
