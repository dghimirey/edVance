import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, GraduationCap, BookOpen, Clock, UserCheck, School, CalendarCheck, FileText } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

interface Attendance {
  id: string;
  status: string;
}

interface Profile {
  id: string;
  status: string;
}

interface User {
  id: string;
  full_name?: string;
  email?: string;
  status: string;
}

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  pendingApprovals: number;
  activeUsers: number;
  totalClasses: number;
  todayAttendanceRate: number | null;
  upcomingExams: number;
  roleDistribution: { name: string; value: number }[];
}

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(0, 84%, 60%)",
];

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [profilesRes, rolesRes, pendingRes, classesRes, attendanceTodayRes, examsRes] = await Promise.all([
        supabase.from("profiles").select("id, status"),
        supabase.from("user_roles").select("role"),
        supabase.from("approval_requests").select("id").eq("status", "pending"),
        supabase.from("classes").select("id"),
        supabase.from("attendance").select("id, status").eq("date", today),
        supabase.from("exams").select("id").gte("end_date", today),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const pending = pendingRes.data || [];
      const classes = classesRes.data || [];
      const attendanceToday = attendanceTodayRes.data || [];
      const upcomingExams = examsRes.data || [];

      const roleCounts: Record<string, number> = {};
      roles.forEach((r: { role: string }) => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });

      const roleDistribution = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));

      let todayAttendanceRate: number | null = null;
      if (attendanceToday.length > 0) {
        const present = attendanceToday.filter((a: Attendance) => a.status === "present" || a.status === "late").length;
        todayAttendanceRate = Math.round((present / attendanceToday.length) * 100);
      }

      setStats({
        totalUsers: profiles.length,
        totalStudents: roleCounts["student"] || 0,
        totalTeachers: roleCounts["teacher"] || 0,
        pendingApprovals: pending.length,
        activeUsers: profiles.filter((p: Profile) => p.status === "approved").length,
        totalClasses: classes.length,
        todayAttendanceRate,
        upcomingExams: upcomingExams.length,
        roleDistribution,
      });

      const { data: recent } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUsers(recent || []);
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { label: "Students", value: stats?.totalStudents ?? 0, icon: GraduationCap, color: "text-green-600 dark:text-green-400" },
    { label: "Teachers", value: stats?.totalTeachers ?? 0, icon: BookOpen, color: "text-amber-600 dark:text-amber-400" },
    { label: "Total Classes", value: stats?.totalClasses ?? 0, icon: School, color: "text-violet-600 dark:text-violet-400" },
    { label: "Today's Attendance", value: stats?.todayAttendanceRate !== null ? `${stats.todayAttendanceRate}%` : "N/A", icon: CalendarCheck, color: "text-teal-600 dark:text-teal-400" },
    { label: "Upcoming Exams", value: stats?.upcomingExams ?? 0, icon: FileText, color: "text-primary" },
    { label: "Pending Approvals", value: stats?.pendingApprovals ?? 0, icon: Clock, color: "text-destructive" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your school management system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by Role</CardTitle>
            <CardDescription>Distribution of users across roles</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.roleDistribution.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {stats.roleDistribution.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No role data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <CardDescription>{stats?.pendingApprovals ?? 0} users waiting</CardDescription>
            </div>
            <Link to="/approvals">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.pendingApprovals === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <UserCheck className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{stats?.pendingApprovals} user(s) require your attention.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Users</CardTitle>
            <CardDescription>Latest registrations</CardDescription>
          </div>
          <Link to="/users">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.map((user: User) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{user.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={user.status === "approved" ? "default" : user.status === "pending" ? "secondary" : "destructive"}>
                  {user.status}
                </Badge>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
