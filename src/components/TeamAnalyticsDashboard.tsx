import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, MessageSquare, Clock, Award, Target } from "lucide-react";
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TeamAnalytics } from "@/hooks/useTeamAnalytics";

interface TeamAnalyticsDashboardProps {
  analytics: TeamAnalytics;
  loading: boolean;
}

export const TeamAnalyticsDashboard = ({ analytics, loading }: TeamAnalyticsDashboardProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Caricamento analytics...</div>
      </div>
    );
  }

  const { members, memberPerformance, teamVelocity } = analytics;

  // Calculate team totals
  const totalCompletedTasks = memberPerformance.reduce((sum, m) => sum + m.completedTasks, 0);
  const totalComments = memberPerformance.reduce((sum, m) => sum + m.commentsCount, 0);
  const avgTeamCompletionTime = memberPerformance.length > 0
    ? memberPerformance.reduce((sum, m) => sum + m.avgCompletionTime, 0) / memberPerformance.length
    : 0;

  // Top performer
  const topPerformer = memberPerformance.length > 0
    ? memberPerformance.reduce((top, current) => 
        current.completedTasks > top.completedTasks ? current : top
      )
    : null;

  // Prepare radar chart data for member comparison
  const radarData = memberPerformance.map(member => ({
    name: member.name.split(' ')[0] || member.name.substring(0, 10),
    'Task Completati': member.completedTasks,
    'Commenti': member.commentsCount,
    'Velocità': member.avgCompletionTime > 0 ? Math.round(10 / member.avgCompletionTime) : 0
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Membri Team</p>
              <h3 className="text-3xl font-bold text-foreground">{members.length}</h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Task Completati</p>
              <h3 className="text-3xl font-bold text-foreground">{totalCompletedTasks}</h3>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <Target className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tempo Medio</p>
              <h3 className="text-3xl font-bold text-foreground">
                {avgTeamCompletionTime.toFixed(1)}<span className="text-lg">gg</span>
              </h3>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Commenti</p>
              <h3 className="text-3xl font-bold text-foreground">{totalComments}</h3>
            </div>
            <div className="p-3 bg-info/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-info" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performer */}
      {topPerformer && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-full">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Top Performer</p>
              <h3 className="text-2xl font-bold text-foreground">{topPerformer.name}</h3>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">{topPerformer.completedTasks} task completati</Badge>
                <Badge variant="outline">{topPerformer.avgCompletionTime.toFixed(1)} gg media</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Velocity Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Velocità Team</h3>
          </div>
          {teamVelocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={teamVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="week" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Task Completati"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </Card>

        {/* Member Performance Comparison */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Performance Membri</h3>
          </div>
          {memberPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="completedTasks" 
                  fill="hsl(var(--primary))" 
                  name="Task Completati"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </Card>
      </div>

      {/* Radar Chart - Member Skills Comparison */}
      {radarData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Confronto Competenze Team</h3>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Radar 
                name="Task Completati" 
                dataKey="Task Completati" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.3}
              />
              <Radar 
                name="Commenti" 
                dataKey="Commenti" 
                stroke="hsl(var(--accent))" 
                fill="hsl(var(--accent))" 
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Member Details Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dettagli Membri</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Membro</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Task Completati</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tempo Medio</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Commenti</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {memberPerformance.map((member) => (
                <tr key={member.userId} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{member.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{member.completedTasks}</Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {member.avgCompletionTime > 0 ? `${member.avgCompletionTime} giorni` : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{member.commentsCount}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    {member.completedTasks > 0 ? (
                      <Badge className="bg-success/10 text-success border-success/20">Attivo</Badge>
                    ) : (
                      <Badge variant="secondary">In attesa</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
