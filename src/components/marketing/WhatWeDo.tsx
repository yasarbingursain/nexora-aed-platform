import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

type WhatWeDoProps = {
  title: string;
  items: Array<{ title: string; body: string }>;
};

export function WhatWeDo({ title, items }: WhatWeDoProps) {
  return (
    <section id="product" className="py-20 px-6">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
