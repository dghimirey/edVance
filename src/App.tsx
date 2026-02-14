import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Pending from "./pages/Pending";
import Rejected from "./pages/Rejected";
import Dashboard from "./pages/Dashboard";
import Approvals from "./pages/Approvals";
import UserManagement from "./pages/UserManagement";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import Subjects from "./pages/Subjects";
import Attendance from "./pages/Attendance";
import AttendanceMark from "./pages/AttendanceMark";
import Timetable from "./pages/Timetable";
import Exams from "./pages/Exams";
import ExamDetail from "./pages/ExamDetail";
import MarksEntry from "./pages/MarksEntry";
import Grading from "./pages/Grading";
import ReportCards from "./pages/ReportCards";
import StudentReport from "./pages/StudentReport";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/rejected" element={<Rejected />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/approvals" element={<ProtectedRoute allowedRoles={["admin"]}><Approvals /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
                  <Route path="/classes" element={<ProtectedRoute allowedRoles={["admin"]}><Classes /></ProtectedRoute>} />
                  <Route path="/classes/:id" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><ClassDetail /></ProtectedRoute>} />
                  <Route path="/subjects" element={<ProtectedRoute allowedRoles={["admin"]}><Subjects /></ProtectedRoute>} />
                  <Route path="/attendance" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student"]}><Attendance /></ProtectedRoute>} />
                  <Route path="/attendance/mark/:classId" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><AttendanceMark /></ProtectedRoute>} />
                  <Route path="/timetable" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student"]}><Timetable /></ProtectedRoute>} />
                  <Route path="/exams" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student"]}><Exams /></ProtectedRoute>} />
                  <Route path="/exams/:id" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><ExamDetail /></ProtectedRoute>} />
                  <Route path="/exams/:examId/marks/:subjectId" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><MarksEntry /></ProtectedRoute>} />
                  <Route path="/grading" element={<ProtectedRoute allowedRoles={["admin"]}><Grading /></ProtectedRoute>} />
                  <Route path="/report-cards" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student"]}><ReportCards /></ProtectedRoute>} />
                  <Route path="/report-cards/:studentId" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student"]}><StudentReport /></ProtectedRoute>} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
