import { useState, useEffect } from "react";

export interface WidgetConfig {
  id: string;
  visible: boolean;
  size: "small" | "medium" | "large";
  order: number;
}

const defaultWidgets: WidgetConfig[] = [
  { id: "total-events", visible: true, size: "small", order: 0 },
  { id: "total-registrations", visible: true, size: "small", order: 1 },
  { id: "total-revenue", visible: true, size: "small", order: 2 },
  { id: "success-rate", visible: true, size: "small", order: 3 },
  { id: "monthly-revenue", visible: true, size: "large", order: 4 },
  { id: "registration-trends", visible: true, size: "large", order: 5 },
  { id: "event-popularity", visible: true, size: "medium", order: 6 },
  { id: "payment-distribution", visible: true, size: "medium", order: 7 },
];

export function useWidgetCustomization() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem("dashboard-widgets");
    return saved ? JSON.parse(saved) : defaultWidgets;
  });

  const [timeRange, setTimeRange] = useState<string>(() => {
    return localStorage.getItem("dashboard-timerange") || "30";
  });

  useEffect(() => {
    localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem("dashboard-timerange", timeRange);
  }, [timeRange]);

  const toggleWidget = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const updateWidgetSize = (id: string, size: "small" | "medium" | "large") => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)));
  };

  const resetWidgets = () => {
    setWidgets(defaultWidgets);
    setTimeRange("30");
  };

  return {
    widgets,
    timeRange,
    setTimeRange,
    toggleWidget,
    updateWidgetSize,
    resetWidgets,
  };
}
