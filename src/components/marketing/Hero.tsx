import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type HeroProps = {
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  note?: string;
};

export function Hero({ headline, subheadline, primaryCta, secondaryCta, note }: HeroProps) {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5" />
      </div>
      
      <div className="container mx-auto relative z-10 max-w-4xl text-center">
        <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          {headline}
        </h1>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          {subheadline}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link href={primaryCta.href}>
            <Button size="lg" className="text-lg px-8">
              {primaryCta.label}
            </Button>
          </Link>
          <Link href={secondaryCta.href}>
            <Button variant="outline" size="lg" className="text-lg px-8">
              {secondaryCta.label}
            </Button>
          </Link>
        </div>

        {note && (
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
