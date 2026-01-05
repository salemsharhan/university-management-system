import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Building2, TrendingUp, DollarSign } from "lucide-react";
import UniversityLayout from "@/components/UniversityLayout";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { t, isRTL } = useLanguage();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: financialSummary, isLoading: financeLoading } = trpc.dashboard.financialSummary.useQuery();

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const statCards = [
    {
      title: t("active_students"),
      value: stats?.activeStudents || 0,
      icon: GraduationCap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: t("active_instructors"),
      value: stats?.activeInstructors || 0,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("active_courses"),
      value: stats?.activeCourses || 0,
      icon: BookOpen,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: t("total_faculties"),
      value: stats?.totalFaculties || 0,
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: t("total_enrollments"),
      value: stats?.totalEnrollments || 0,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: t("average_gpa"),
      value: stats?.averageGpa ? stats.averageGpa.toFixed(2) : "0.00",
      icon: TrendingUp,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
  ];

  const financialCards = [
    {
      title: t("total_revenue"),
      value: `$${financialSummary?.totalRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("tuition_revenue"),
      value: `$${financialSummary?.paidAmount?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: t("outstanding_fees"),
      value: `$${financialSummary?.pendingAmount?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: t("collection_rate"),
      value: `${financialSummary?.collectionRate?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  // Sample data for charts (in real app, this would come from API)
  const studentDistributionData = [
    { name: isRTL ? "الهندسة" : "Engineering", value: 450 },
    { name: isRTL ? "العلوم" : "Sciences", value: 380 },
    { name: isRTL ? "الأعمال" : "Business", value: 320 },
    { name: isRTL ? "الطب" : "Medicine", value: 280 },
    { name: isRTL ? "الآداب" : "Arts", value: 220 },
  ];

  const enrollmentTrendData = [
    { month: isRTL ? "يناير" : "Jan", enrollments: 120 },
    { month: isRTL ? "فبراير" : "Feb", enrollments: 150 },
    { month: isRTL ? "مارس" : "Mar", enrollments: 180 },
    { month: isRTL ? "أبريل" : "Apr", enrollments: 160 },
    { month: isRTL ? "مايو" : "May", enrollments: 200 },
    { month: isRTL ? "يونيو" : "Jun", enrollments: 220 },
  ];

  if (statsLoading || financeLoading) {
    return (
      <UniversityLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </UniversityLayout>
    );
  }

  return (
    <UniversityLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("dashboard")}</h1>
          <p className="text-muted-foreground mt-1">{t("academic_performance")}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <h3 className="text-3xl font-bold mt-2">{card.value}</h3>
                    </div>
                    <div className={`${card.bgColor} p-4 rounded-full`}>
                      <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Financial Overview */}
        <div>
          <h2 className="text-2xl font-bold mb-4">{t("financial_overview")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {financialCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <h3 className="text-2xl font-bold mt-2">{card.value}</h3>
                      </div>
                      <div className={`${card.bgColor} p-3 rounded-full`}>
                        <Icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>{t("student_distribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={studentDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {studentDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enrollment Trend */}
          <Card>
            <CardHeader>
              <CardTitle>{t("new_enrollments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enrollmentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enrollments" fill="#3b82f6" name={t("new_enrollments")} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recent_activities")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{isRTL ? "نشاط جديد" : "New Activity"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "منذ ساعتين" : "2 hours ago"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversityLayout>
  );
}
