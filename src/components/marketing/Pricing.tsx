import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';

type PricingProps = {
  title: string;
  tiers: Array<{ name: string; description: string; highlights: string[] }>;
  cta: { label: string; href: string };
};

export function Pricing({ title, tiers, cta }: PricingProps) {
  return (
    <section id="pricing" className="py-20 px-6 bg-card/30">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {tiers.map((tier, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href={cta.href}>
            <Button size="lg">
              {cta.label}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
