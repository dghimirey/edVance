import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";

const Dashboard = () => {
  const { role, profile } = useAuth();

  if (role === "admin") return <AdminDashboard />;
  if (role === "teacher") return <TeacherDashboard />;
  if (role === "student") return <StudentDashboard />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Welcome, {profile?.full_name || "User"}</h1>
      <p className="text-muted-foreground">Your {role} dashboard will be available in a future update.</p>
    </div>
  );
};

export default Dashboard;
