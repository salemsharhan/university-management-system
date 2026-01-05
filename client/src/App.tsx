import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AcademicYears from "./pages/academic/AcademicYears";
import Semesters from "./pages/academic/Semesters";
import Faculties from "./pages/academic/Faculties";
import Departments from "./pages/academic/Departments";
import Majors from "./pages/academic/Majors";
import Subjects from "./pages/academic/Subjects";
import Classes from "./pages/academic/Classes";
import Students from "./pages/Students";
import Instructors from "./pages/Instructors";
import Enrollments from "./pages/Enrollments";
import Attendance from "./pages/Attendance";
import Examinations from "./pages/Examinations";
import Grading from "./pages/Grading";
import Admissions from "./pages/Admissions";
import Finance from "./pages/Finance";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      
      {/* Academic Routes */}
      <Route path={"/academic/years"} component={AcademicYears} />
      <Route path={"/academic/semesters"} component={Semesters} />
      <Route path={"/academic/faculties"} component={Faculties} />
      <Route path={"/academic/departments"} component={Departments} />
      <Route path={"/academic/majors"} component={Majors} />
      <Route path={"/academic/subjects"} component={Subjects} />
      <Route path={"/academic/classes"} component={Classes} />
      
      {/* People Management Routes */}
      <Route path={"/students"} component={Students} />
      <Route path={"/instructors"} component={Instructors} />
      <Route path={"/enrollments"} component={Enrollments} />
      
      {/* Operations Routes */}
      <Route path={"/attendance"} component={Attendance} />
      <Route path={"/examinations"} component={Examinations} />
      <Route path={"/grading"} component={Grading} />
      
      {/* Administrative Routes */}
      <Route path={"/admissions"} component={Admissions} />
      <Route path={"/finance"} component={Finance} />
      <Route path={"/users"} component={Users} />
      <Route path={"/settings"} component={Settings} />
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
