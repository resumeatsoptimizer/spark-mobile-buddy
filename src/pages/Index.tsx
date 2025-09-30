import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard (which will redirect to auth if not logged in)
    navigate("/");
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Iwelty Event Dashboard</h1>
        <p className="text-xl text-muted-foreground">กำลังโหลด...</p>
      </div>
    </div>
  );
};

export default Index;
