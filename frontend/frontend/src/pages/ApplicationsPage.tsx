import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { applicationsApi, vendorsApi } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';

export default function ApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', searchTerm, statusFilter],
    queryFn: async () => {
      const response = await applicationsApi.getAll({ search: searchTerm, status: statusFilter });
      return response.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorsApi.getAll();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const handleEdit = (app: any) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this application?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getStatusVariant = (status: string) => {
    const statusMap: any = {
      DRAFT: 'default',
      SUBMITTED: 'info',
      UNDER_REVIEW: 'warning',
      APPROVED: 'success',
      COMMITTED: 'success',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      DENIED: 'danger',
      CANCELLED: 'danger',
    };
    return statusMap[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">Manage E-Rate funding applications (FRNs)</p>
        </div>
        <Button onClick={() => { setSelectedApp(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by FRN or name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="COMMITTED">Committed</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading applications...</p>
            </div>
          ) : applications?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No applications found</p>
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                Create your first application
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">FRN</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Requested</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Committed</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Discount</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications?.map((app: any) => (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-blue-600">{app.frn}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{app.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{app.vendor?.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {app.category === 'CATEGORY_ONE' ? 'Category 1' : 'Category 2'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusVariant(app.status)}>
                          {app.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">
                        {formatCurrency(app.amountRequested)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">
                        {formatCurrency(app.amountCommitted)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-center">
                        {app.discountRate}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(app)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedApp(null); }}
        application={selectedApp}
        vendors={vendors || []}
      />
    </div>
  );
}

function ApplicationModal({ isOpen, onClose, application, vendors }: any) {
  const [formData, setFormData] = useState({
    frn: '',
    name: '',
    vendorId: '',
    category: 'CATEGORY_ONE',
    serviceType: '',
    status: 'DRAFT',
    amountRequested: '',
    amountCommitted: '',
    amountDisbursed: '',
    discountRate: '',
    serviceStart: '',
    serviceEnd: '',
    applicationDate: '',
    approvalDate: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => applicationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => applicationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      onClose();
    },
  });

  useEffect(() => {
    if (application) {
      setFormData({
        frn: application.frn || '',
        name: application.name || '',
        vendorId: application.vendorId || '',
        category: application.category || 'CATEGORY_ONE',
        serviceType: application.serviceType || '',
        status: application.status || 'DRAFT',
        amountRequested: application.amountRequested?.toString() || '',
        amountCommitted: application.amountCommitted?.toString() || '',
        amountDisbursed: application.amountDisbursed?.toString() || '',
        discountRate: application.discountRate?.toString() || '',
        serviceStart: application.serviceStart?.split('T')[0] || '',
        serviceEnd: application.serviceEnd?.split('T')[0] || '',
        applicationDate: application.applicationDate?.split('T')[0] || '',
        approvalDate: application.approvalDate?.split('T')[0] || '',
        notes: application.notes || '',
      });
    } else {
      setFormData({
        frn: '',
        name: '',
        vendorId: '',
        category: 'CATEGORY_ONE',
        serviceType: '',
        status: 'DRAFT',
        amountRequested: '',
        amountCommitted: '',
        amountDisbursed: '',
        discountRate: '',
        serviceStart: '',
        serviceEnd: '',
        applicationDate: '',
        approvalDate: '',
        notes: '',
      });
    }
  }, [application, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      amountRequested: parseFloat(formData.amountRequested) || 0,
      amountCommitted: parseFloat(formData.amountCommitted) || 0,
      amountDisbursed: parseFloat(formData.amountDisbursed) || 0,
      discountRate: parseFloat(formData.discountRate) || 0,
    };

    if (application) {
      await updateMutation.mutateAsync({ id: application.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={application ? 'Edit Application' : 'New Application'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="FRN (Funding Request Number)"
            value={formData.frn}
            onChange={(e) => setFormData({ ...formData, frn: e.target.value })}
            required
          />
          <Input
            label="Application Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              required
            >
              <option value="">Select vendor</option>
              {vendors.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="CATEGORY_ONE">Category 1</option>
              <option value="CATEGORY_TWO">Category 2</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Service Type"
            value={formData.serviceType}
            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="COMMITTED">Committed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DENIED">Denied</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Amount Requested ($)"
            type="number"
            step="0.01"
            value={formData.amountRequested}
            onChange={(e) => setFormData({ ...formData, amountRequested: e.target.value })}
          />
          <Input
            label="Amount Committed ($)"
            type="number"
            step="0.01"
            value={formData.amountCommitted}
            onChange={(e) => setFormData({ ...formData, amountCommitted: e.target.value })}
          />
          <Input
            label="Discount Rate (%)"
            type="number"
            step="0.01"
            value={formData.discountRate}
            onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Service Start Date"
            type="date"
            value={formData.serviceStart}
            onChange={(e) => setFormData({ ...formData, serviceStart: e.target.value })}
          />
          <Input
            label="Service End Date"
            type="date"
            value={formData.serviceEnd}
            onChange={(e) => setFormData({ ...formData, serviceEnd: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {application ? 'Update' : 'Create'} Application
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect } from 'react';
