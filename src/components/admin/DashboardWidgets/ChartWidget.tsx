import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartWidgetProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ChartWidget({ title, description, children }: ChartWidgetProps) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
