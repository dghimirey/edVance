import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";

interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  profile?: { full_name: string; email: string };
}

const Approvals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profiles for each request
      const userIds = data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const enriched = data.map((r: any) => ({
        ...r,
        profile: profileMap.get(r.user_id),
      }));
      setRequests(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, userId: string, action: "approved" | "rejected", requestedRole: string) => {
    setActionLoading(requestId);
    try {
      // Update approval request
      await supabase
        .from("approval_requests")
        .update({
          status: action,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (action === "approved") {
        // Update profile status
        await supabase
          .from("profiles")
          .update({ status: "approved" })
          .eq("user_id", userId);

        // Assign role
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: requestedRole as any });
      } else {
        await supabase
          .from("profiles")
          .update({ status: "rejected" })
          .eq("user_id", userId);
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        performed_by: user?.id,
        action: `${action}_user`,
        target_user_id: userId,
        details: { requested_role: requestedRole, approval_request_id: requestId },
      });

      toast({ title: `User ${action}`, description: `The user has been ${action}.` });
      fetchRequests();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground text-sm">{requests.length} pending request(s)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Check className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No pending approvals</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.profile?.full_name || "—"}</TableCell>
                    <TableCell>{req.profile?.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{req.requested_role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(req.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, req.user_id, "approved", req.requested_role)}
                        disabled={actionLoading === req.id}
                        className="gap-1"
                      >
                        {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(req.id, req.user_id, "rejected", req.requested_role)}
                        disabled={actionLoading === req.id}
                        className="gap-1"
                      >
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Approvals;
