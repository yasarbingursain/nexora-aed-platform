type ProblemProps = {
  title: string;
  body: string;
  bullets: string[];
};

export function Problem({ title, body, bullets }: ProblemProps) {
  return (
    <section className="py-20 px-6 bg-card/30">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold text-foreground mb-6 text-center">
          {title}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 text-center leading-relaxed">
          {body}
        </p>

        <ul className="space-y-4 max-w-3xl mx-auto">
          {bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
