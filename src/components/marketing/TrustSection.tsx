import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type TrustSectionProps = {
  title: string;
  bullets: string[];
  link: { label: string; href: string };
};

export function TrustSection({ title, bullets, link }: TrustSectionProps) {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          {title}
        </h2>

        <ul className="space-y-4 mb-8">
          {bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="text-center">
          <Link href={link.href}>
            <Button variant="outline" size="lg">
              {link.label}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
