import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, XCircle, LogOut } from "lucide-react";

const Rejected = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <GraduationCap className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">edVance</h1>
        </div>
        <Card>
          <CardHeader>
            <div className="mx-auto bg-destructive/10 rounded-full p-3 mb-2">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Account Rejected</CardTitle>
            <CardDescription>
              Your account request has been rejected. Please contact school administration for more information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Signed in as <strong>{profile?.email}</strong>
            </p>
            <Button variant="outline" onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rejected;
