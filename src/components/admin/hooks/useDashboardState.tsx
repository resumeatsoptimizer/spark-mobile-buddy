import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useDashboardState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const setActiveTab = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  return {
    activeTab,
    setActiveTab,
  };
}
