type TrustStripProps = {
  items: string[];
};

export function TrustStrip({ items }: TrustStripProps) {
  return (
    <section className="py-6 px-6 border-y border-border bg-card/30">
      <div className="container mx-auto">
        <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-border">•</span>}
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
