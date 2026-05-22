export default function EstimatesPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
      {children}
    </>
  )
}
