import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { complianceApi, applicationsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Plus, Search, Edit, Trash2, Upload, FileText, AlertCircle, Calendar } from 'lucide-react';

export default function CompliancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['compliance', searchTerm, statusFilter, docTypeFilter],
    queryFn: async () => {
      const response = await complianceApi.getAll({
        status: statusFilter,
        docType: docTypeFilter
      });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => complianceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });

  const handleEdit = (doc: any) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteMutation.mutateAsync(id);
    }
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

  const isOverdue = (dateRequired: string | null, status: string) => {
    if (!dateRequired || status === 'APPROVED' || status === 'RECEIVED') return false;
    return new Date(dateRequired) < new Date();
  };

  const upcomingDeadlines = documents?.filter((doc: any) => {
    if (!doc.dateRequired || doc.status === 'APPROVED') return false;
    const daysUntil = Math.ceil((new Date(doc.dateRequired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30;
  }).length || 0;

  const overdueCount = documents?.filter((doc: any) =>
    isOverdue(doc.dateRequired, doc.status)
  ).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance</h1>
          <p className="text-gray-600 mt-1">Track E-Rate compliance documents and deadlines</p>
        </div>
        <Button onClick={() => { setSelectedDoc(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{documents?.length || 0}</p>
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
                <p className="text-sm font-medium text-gray-600">Upcoming (30 days)</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{upcomingDeadlines}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{overdueCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by FRN or document type..."
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
              <option value="PENDING">Pending</option>
              <option value="RECEIVED">Received</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="FORM_470">Form 470</option>
              <option value="FORM_471">Form 471</option>
              <option value="CONTRACT">Contract</option>
              <option value="INVOICE">Invoice</option>
              <option value="BEAR_FORM">BEAR Form</option>
              <option value="PIA_REPORT">PIA Report</option>
              <option value="SITE_VISIT">Site Visit</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : documents?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No compliance documents found</p>
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                Add your first document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Document Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Application</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date Required</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date Received</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Disposal Date</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents?.map((doc: any) => (
                    <tr
                      key={doc.id}
                      className={'border-b border-gray-100 hover:bg-gray-50 ' + (isOverdue(doc.dateRequired, doc.status) ? 'bg-red-50' : '')}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {doc.docType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doc.application?.frn} - {doc.application?.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doc.dateRequired ? (
                          <span className={isOverdue(doc.dateRequired, doc.status) ? 'text-red-600 font-semibold' : ''}>
                            {formatDate(doc.dateRequired)}
                            {isOverdue(doc.dateRequired, doc.status) && (
                              <AlertCircle className="w-4 h-4 inline ml-1" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doc.dateReceived ? formatDate(doc.dateReceived) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusVariant(doc.status)}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doc.disposalDate ? formatDate(doc.disposalDate) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(doc)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
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

      <ComplianceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedDoc(null); }}
        document={selectedDoc}
      />
    </div>
  );
}

function ComplianceModal({ isOpen, onClose, document }: any) {
  const [formData, setFormData] = useState({
    applicationId: '',
    docType: 'FORM_470',
    dateRequired: '',
    dateReceived: '',
    status: 'PENDING',
    retentionYears: '5',
    reviewer: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await applicationsApi.getAll();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => complianceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => complianceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      onClose();
    },
  });

  useEffect(() => {
    if (document) {
      setFormData({
        applicationId: document.applicationId || '',
        docType: document.docType || 'FORM_470',
        dateRequired: document.dateRequired?.split('T')[0] || '',
        dateReceived: document.dateReceived?.split('T')[0] || '',
        status: document.status || 'PENDING',
        retentionYears: document.retentionYears?.toString() || '5',
        reviewer: document.reviewer || '',
        notes: document.notes || '',
      });
    } else {
      setFormData({
        applicationId: '',
        docType: 'FORM_470',
        dateRequired: '',
        dateReceived: '',
        status: 'PENDING',
        retentionYears: '5',
        reviewer: '',
        notes: '',
      });
    }
  }, [document, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      retentionYears: parseInt(formData.retentionYears),
    };

    if (document) {
      await updateMutation.mutateAsync({ id: document.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document ? 'Edit Document' : 'New Compliance Document'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application (FRN)
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.applicationId}
              onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
              required
            >
              <option value="">Select application</option>
              {applications?.map((app: any) => (
                <option key={app.id} value={app.id}>
                  {app.frn} - {app.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.docType}
              onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
            >
              <option value="FORM_470">Form 470</option>
              <option value="FORM_471">Form 471</option>
              <option value="CONTRACT">Contract</option>
              <option value="INVOICE">Invoice</option>
              <option value="BEAR_FORM">BEAR Form</option>
              <option value="PIA_REPORT">PIA Report</option>
              <option value="SITE_VISIT">Site Visit</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Date Required"
            type="date"
            value={formData.dateRequired}
            onChange={(e) => setFormData({ ...formData, dateRequired: e.target.value })}
          />

          <Input
            label="Date Received"
            type="date"
            value={formData.dateReceived}
            onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="PENDING">Pending</option>
              <option value="RECEIVED">Received</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Retention Period (years)"
            type="number"
            min="1"
            max="99"
            value={formData.retentionYears}
            onChange={(e) => setFormData({ ...formData, retentionYears: e.target.value })}
          />

          <Input
            label="Reviewer"
            value={formData.reviewer}
            onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
            placeholder="Who reviewed this document?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about this document..."
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Disposal date will be automatically calculated based on the received date and retention period.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {document ? 'Update' : 'Create'} Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}
