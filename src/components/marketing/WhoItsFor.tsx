import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

type WhoItsForProps = {
  title: string;
  audiences: Array<{ title: string; body: string }>;
};

export function WhoItsFor({ title, audiences }: WhoItsForProps) {
  return (
    <section className="py-20 px-6 bg-card/30">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((audience, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{audience.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {audience.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
