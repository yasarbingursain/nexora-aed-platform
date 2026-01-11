import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

type IntegrationStatus = "Available" | "Early Access" | "Roadmap";

type IntegrationsProps = {
  title: string;
  items: Array<{ name: string; status: IntegrationStatus; note?: string }>;
  disclaimer?: string;
};

export function Integrations({ title, items, disclaimer }: IntegrationsProps) {
  const getStatusVariant = (status: IntegrationStatus) => {
    switch (status) {
      case "Available":
        return "default";
      case "Early Access":
        return "secondary";
      case "Roadmap":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <section id="integrations" className="py-20 px-6 bg-card/30">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
          {title}
        </h2>
        
        {disclaimer && (
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            {disclaimer}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {items.map((integration, index) => (
            <Card key={index} className="p-4 text-center hover:shadow-lg transition-shadow">
              <h4 className="font-semibold text-foreground mb-3">{integration.name}</h4>
              <Badge variant={getStatusVariant(integration.status)} className="text-xs">
                {integration.status}
              </Badge>
              {integration.note && (
                <p className="text-xs text-muted-foreground mt-2">{integration.note}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
