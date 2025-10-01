import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, TrendingUp, Users } from "lucide-react";

interface MemberActivityChartProps {
  data: {
    monthlyGrowth?: Array<{ month: string; newMembers: number; totalMembers: number }>;
    activityBreakdown?: Array<{ name: string; value: number }>;
    engagementTrend?: Array<{ month: string; avgEngagement: number }>;
  };
}

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#8b5cf6",
};

const ACTIVITY_COLORS = [COLORS.success, COLORS.primary, COLORS.warning, COLORS.danger];

export function MemberActivityChart({ data }: MemberActivityChartProps) {
  const { monthlyGrowth = [], activityBreakdown = [], engagementTrend = [] } = data;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Monthly Growth Chart */}
      {monthlyGrowth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              การเติบโตของสมาชิก
            </CardTitle>
            <CardDescription>สมาชิกใหม่แต่ละเดือน</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="newMembers" fill={COLORS.primary} name="สมาชิกใหม่" />
                <Bar dataKey="totalMembers" fill={COLORS.success} name="สมาชิกรวม" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Activity Breakdown Pie Chart */}
      {activityBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              ระดับกิจกรรม
            </CardTitle>
            <CardDescription>แบ่งตามความ active</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Engagement Trend Line Chart */}
      {engagementTrend.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              แนวโน้ม Engagement Score
            </CardTitle>
            <CardDescription>คะแนนความ engaged เฉลี่ยต่อเดือน</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgEngagement"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Engagement Score เฉลี่ย"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
