type OperatingModelProps = {
  title: string;
  pillars: Array<{ title: string; body: string }>;
};

export function OperatingModel({ title, pillars }: OperatingModelProps) {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => (
            <div key={index} className="p-6 border border-border rounded-lg hover:border-blue-600/50 transition-colors">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {pillar.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
