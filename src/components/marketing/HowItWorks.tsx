type HowItWorksProps = {
  title: string;
  steps: Array<{ title: string; body: string }>;
  note?: string;
};

export function HowItWorks({ title, steps, note }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="py-20 px-6 bg-card/30">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {note && (
          <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> {note}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
