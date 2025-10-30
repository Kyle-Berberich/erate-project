import { useQuery } from '@tanstack/react-query';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title } from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { dashboardApi } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { TrendingUp, DollarSign, FileText, Users, AlertCircle } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title);

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data;
    },
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['funding-timeline'],
    queryFn: async () => {
      const response = await dashboardApi.getFundingTimeline();
      return response.data;
    },
  });

  if (summaryLoading || timelineLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const statusBreakdownData = {
    labels: summary?.statusBreakdown?.map((item: any) => item.status) || [],
    datasets: [
      {
        data: summary?.statusBreakdown?.map((item: any) => item._count) || [],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#EC4899',
        ],
      },
    ],
  };

  const timelineData = {
    labels: timeline?.map((item: any) => item.month) || [],
    datasets: [
      {
        label: 'Requested',
        data: timeline?.map((item: any) => parseFloat(item.requested)) || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Committed',
        data: timeline?.map((item: any) => parseFloat(item.committed)) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const vendorsData = {
    labels: summary?.topVendors?.map((v: any) => v.name) || [],
    datasets: [
      {
        label: 'Contract Value',
        data: summary?.topVendors?.map((v: any) => parseFloat(v.contractValue)) || [],
        backgroundColor: '#3B82F6',
      },
    ],
  };

  const getStatusVariant = (status: string) => {
    const statusMap: any = {
      PENDING: 'warning',
      RECEIVED: 'info',
      APPROVED: 'success',
      REJECTED: 'danger',
      OVERDUE: 'danger',
    };
    return statusMap[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your E-Rate management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.kpis?.totalApplications || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requested</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(summary?.kpis?.totalRequested || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Committed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(summary?.kpis?.totalCommitted || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.kpis?.activeVendors || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {summary?.statusBreakdown?.length > 0 ? (
                <Pie data={statusBreakdownData} options={{ maintainAspectRatio: false }} />
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Vendors by Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {summary?.topVendors?.length > 0 ? (
                <Bar 
                  data={vendorsData} 
                  options={{ 
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                  }} 
                />
              ) : (
                <p className="text-gray-500">No vendors yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funding Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {timeline?.length > 0 ? (
              <Line 
                data={timelineData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value as number),
                      },
                    },
                  },
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No timeline data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Compliance Deadlines</CardTitle>
          <Badge variant="warning">
            <AlertCircle className="w-3 h-3 mr-1" />
            {summary?.upcomingDeadlines?.length || 0} upcoming
          </Badge>
        </CardHeader>
        <CardContent>
          {summary?.upcomingDeadlines?.length > 0 ? (
            <div className="space-y-4">
              {summary.upcomingDeadlines.map((deadline: any) => (
                <div key={deadline.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-medium text-gray-900">{deadline.docType.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">
                      {deadline.application.frn} - {deadline.application.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatDate(deadline.dateRequired)}</p>
                    <Badge variant={getStatusVariant(deadline.status)}>{deadline.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming deadlines</p>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 text-right">
        Last updated: {summary?.lastUpdated ? formatDate(summary.lastUpdated) : 'Never'}
      </div>
    </div>
  );
}
