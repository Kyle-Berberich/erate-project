import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { reportsApi } from '../lib/api';
import { FileText, Download, Calendar, TrendingUp, Users, CheckSquare } from 'lucide-react';

export default function ReportsPage() {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const generateMutation = useMutation({
    mutationFn: ({ type, data }: { type: string; data: any }) =>
      reportsApi.generate(type, data),
    onSuccess: () => {
      alert('Report generated successfully! In a production environment, this would download a PDF.');
    },
  });

  const handleGenerate = async (type: string) => {
    await generateMutation.mutateAsync({
      type,
      data: {
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
      },
    });
  };

  const reportTypes = [
    {
      type: 'monthly-summary',
      title: 'Monthly Summary',
      description: 'Overview of submissions, funding, vendors, and compliance status for the month',
      icon: Calendar,
      color: 'blue',
    },
    {
      type: 'application-status',
      title: 'Application Status Report',
      description: 'Detailed list of all applications with status breakdown and financial summary',
      icon: FileText,
      color: 'green',
    },
    {
      type: 'vendor-performance',
      title: 'Vendor Performance',
      description: 'Vendor ratings, contract values, application counts, and financials',
      icon: Users,
      color: 'purple',
    },
    {
      type: 'compliance-checklist',
      title: 'Compliance Checklist',
      description: 'Document submission status, missing documents, deadlines, and overdue items',
      icon: CheckSquare,
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate PDF reports for E-Rate management</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                label="Period Start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Period End"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPeriodStart('');
                setPeriodEnd('');
              }}
            >
              Clear Dates
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Leave dates empty to include all data, or specify a period to filter reports
          </p>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const colorMap: any = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600',
            red: 'bg-red-100 text-red-600',
          };

          return (
            <Card key={report.type} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={'p-3 rounded-lg ' + colorMap[report.color]}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    <div className="mt-4">
                      <Button
                        onClick={() => handleGenerate(report.type)}
                        disabled={generateMutation.isPending}
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {generateMutation.isPending ? 'Generating...' : 'Generate PDF'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">About Reports</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <strong>PDF Generation:</strong> All reports are generated as professionally formatted PDFs with headers, footers, and organization branding.
                </p>
                <p>
                  <strong>Storage:</strong> Generated reports are automatically saved to your file storage under /Reports/FYXXXX/ for future reference.
                </p>
                <p>
                  <strong>End-of-FY Binder:</strong> Use the Dashboard to generate a complete fiscal year binder that includes all documents and reports in a single ZIP file.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
