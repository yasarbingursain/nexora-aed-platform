import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type FinalCTAProps = {
  title: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export function FinalCTA({ title, body, primaryCta, secondaryCta }: FinalCTAProps) {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl font-bold text-foreground mb-6">
          {title}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          {body}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
      </div>
    </section>
  );
}
