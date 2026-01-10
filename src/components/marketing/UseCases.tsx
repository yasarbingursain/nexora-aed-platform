type UseCasesProps = {
  title: string;
  cases: string[];
};

export function UseCases({ title, cases }: UseCasesProps) {
  return (
    <section id="use-cases" className="py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {cases.map((useCase, index) => (
            <div key={index} className="p-4 border border-border rounded-lg hover:border-blue-600/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-muted-foreground">{useCase}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
