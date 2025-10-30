import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { vendorsApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Plus, Search, Edit, Trash2, Star } from 'lucide-react';

export default function VendorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors', searchTerm],
    queryFn: async () => {
      const response = await vendorsApi.getAll({ search: searchTerm });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleEdit = (vendor: any) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={'w-4 h-4 ' + (i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Manage vendor relationships and performance</p>
        </div>
        <Button onClick={() => { setSelectedVendor(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Vendor
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search vendors..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading vendors...</p>
            </div>
          ) : vendors?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No vendors found</p>
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                Add your first vendor
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors?.map((vendor: any) => (
                <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          {vendor.rating ? renderStars(vendor.rating) : (
                            <span className="text-sm text-gray-500">No rating</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Contract Value</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(vendor.contractValue)}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-600">Applications</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {vendor.totalApplications || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Requested</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(vendor.totalRequested || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Committed</p>
                          <p className="text-sm font-semibold text-green-600">
                            {formatCurrency(vendor.totalCommitted || 0)}
                          </p>
                        </div>
                      </div>

                      {vendor.contact && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-600">Contact</p>
                          <p className="text-sm text-gray-900">{vendor.contact}</p>
                        </div>
                      )}

                      {vendor.notes && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-600">Notes</p>
                          <p className="text-sm text-gray-900 line-clamp-2">{vendor.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <VendorModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedVendor(null); }}
        vendor={selectedVendor}
      />
    </div>
  );
}

function VendorModal({ isOpen, onClose, vendor }: any) {
  const [formData, setFormData] = useState({
    name: '',
    rating: '',
    contractValue: '',
    contact: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => vendorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => vendorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      onClose();
    },
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        rating: vendor.rating?.toString() || '',
        contractValue: vendor.contractValue?.toString() || '',
        contact: vendor.contact || '',
        notes: vendor.notes || '',
      });
    } else {
      setFormData({
        name: '',
        rating: '',
        contractValue: '',
        contact: '',
        notes: '',
      });
    }
  }, [vendor, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      rating: formData.rating ? parseInt(formData.rating) : undefined,
      contractValue: parseFloat(formData.contractValue) || 0,
    };

    if (vendor) {
      await updateMutation.mutateAsync({ id: vendor.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vendor ? 'Edit Vendor' : 'New Vendor'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Vendor Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Performance Rating (1-5)
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            >
              <option value="">No rating</option>
              <option value="1">1 - Poor</option>
              <option value="2">2 - Fair</option>
              <option value="3">3 - Good</option>
              <option value="4">4 - Very Good</option>
              <option value="5">5 - Excellent</option>
            </select>
          </div>

          <Input
            label="Contract Value ($)"
            type="number"
            step="0.01"
            value={formData.contractValue}
            onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
          />
        </div>

        <Input
          label="Contact Information"
          value={formData.contact}
          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
          placeholder="Email, phone, or name"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about this vendor..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {vendor ? 'Update' : 'Create'} Vendor
          </Button>
        </div>
      </form>
    </Modal>
  );
}
