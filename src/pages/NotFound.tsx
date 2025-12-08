import { Button } from "../components/ui/button";
import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Page Not Found</h1>
      <p className="text-lg text-muted-foreground max-w-[500px]">
        The page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}