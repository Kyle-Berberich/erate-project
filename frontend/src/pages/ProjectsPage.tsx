import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { projectsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Plus, FolderKanban, CheckSquare, Calendar, Edit, Trash2, Check, Clock } from 'lucide-react';

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<'projects' | 'milestones' | 'checklists'>('projects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.getAll();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getStatusVariant = (status: string) => {
    const statusMap: any = {
      PLANNING: 'default',
      IN_PROGRESS: 'info',
      ON_HOLD: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return statusMap[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects & Timelines</h1>
          <p className="text-gray-600 mt-1">Manage projects, milestones, and checklists</p>
        </div>
        <Button onClick={() => { setSelectedProject(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('projects')}
            className={'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'projects' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
          >
            <FolderKanban className="w-5 h-5 inline mr-2" />
            Projects
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'milestones' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Milestones
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === 'checklists' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
          >
            <CheckSquare className="w-5 h-5 inline mr-2" />
            Checklists
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : projects?.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-500">No projects found</p>
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                Create your first project
              </Button>
            </div>
          ) : (
            projects?.map((project: any) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{project.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Badge variant={getStatusVariant(project.status)}>
                        {project.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {project.owner && (
                      <div>
                        <p className="text-xs text-gray-600">Owner</p>
                        <p className="text-sm text-gray-900">{project.owner.email}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Start Date</p>
                        <p className="text-sm text-gray-900">
                          {project.startDate ? formatDate(project.startDate) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">End Date</p>
                        <p className="text-sm text-gray-900">
                          {project.endDate ? formatDate(project.endDate) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {project.milestones?.length || 0} milestones
                        </span>
                        <span className="text-gray-600">
                          {project.checklistItems?.length || 0} tasks
                        </span>
                      </div>
                    </div>

                    {project.notes && (
                      <div className="pt-2">
                        <p className="text-xs text-gray-600">Notes</p>
                        <p className="text-sm text-gray-900 line-clamp-2">{project.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <MilestonesView projects={projects || []} />
      )}

      {activeTab === 'checklists' && (
        <ChecklistsView projects={projects || []} />
      )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedProject(null); }}
        project={selectedProject}
      />
    </div>
  );
}

function MilestonesView({ projects }: { projects: any[] }) {
  const allMilestones = projects.flatMap(project =>
    (project.milestones || []).map((milestone: any) => ({
      ...milestone,
      projectName: project.name,
      projectId: project.id,
    }))
  );

  const sortedMilestones = allMilestones.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getStatusVariant = (status: string) => {
    const statusMap: any = {
      NOT_STARTED: 'default',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      OVERDUE: 'danger',
    };
    return statusMap[status] || 'default';
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {sortedMilestones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No milestones found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMilestones.map((milestone: any) => (
              <div key={milestone.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">Project: {milestone.projectName}</p>
                    {milestone.assignee && (
                      <p className="text-sm text-gray-600">Assigned to: {milestone.assignee.email}</p>
                    )}
                    {milestone.notes && (
                      <p className="text-sm text-gray-700 mt-2">{milestone.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getStatusVariant(milestone.status)}>
                      {milestone.status.replace(/_/g, ' ')}
                    </Badge>
                    {milestone.dueDate && (
                      <span className="text-sm text-gray-600">
                        {formatDate(milestone.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistsView({ projects }: { projects: any[] }) {
  const allChecklists = projects.flatMap(project =>
    (project.checklistItems || []).map((item: any) => ({
      ...item,
      projectName: project.name,
      projectId: project.id,
    }))
  );

  const sortedChecklists = allChecklists.sort((a, b) => {
    if (a.status === 'DONE' && b.status !== 'DONE') return 1;
    if (a.status !== 'DONE' && b.status === 'DONE') return -1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getStatusIcon = (status: string) => {
    if (status === 'DONE') return <Check className="w-5 h-5 text-green-600" />;
    if (status === 'IN_PROGRESS') return <Clock className="w-5 h-5 text-blue-600" />;
    return <div className="w-5 h-5 border-2 border-gray-300 rounded" />;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {sortedChecklists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No checklist items found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedChecklists.map((item: any) => (
              <div
                key={item.id}
                className={'flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 ' + (item.status === 'DONE' ? 'opacity-60' : '')}
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={'text-sm font-medium text-gray-900 ' + (item.status === 'DONE' ? 'line-through' : '')}>
                    {item.description}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600">
                      Project: {item.projectName}
                    </span>
                    {item.assignee && (
                      <span className="text-xs text-gray-600">
                        Assignee: {item.assignee.email}
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="text-xs text-gray-600">
                        Due: {formatDate(item.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={item.status === 'DONE' ? 'success' : item.status === 'IN_PROGRESS' ? 'info' : 'default'}>
                  {item.status === 'IN_PROGRESS' ? 'In Progress' : item.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectModal({ isOpen, onClose, project }: any) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    ownerId: '',
    startDate: '',
    endDate: '',
    status: 'PLANNING',
    notes: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        type: project.type || '',
        ownerId: project.ownerId || '',
        startDate: project.startDate?.split('T')[0] || '',
        endDate: project.endDate?.split('T')[0] || '',
        status: project.status || 'PLANNING',
        notes: project.notes || '',
      });
    } else {
      setFormData({
        name: '',
        type: '',
        ownerId: '',
        startDate: '',
        endDate: '',
        status: 'PLANNING',
        notes: '',
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (project) {
      await updateMutation.mutateAsync({ id: project.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Edit Project' : 'New Project'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Project Type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          placeholder="e.g., Infrastructure, Technology Upgrade"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />

          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="PLANNING">Planning</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Project description and notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {project ? 'Update' : 'Create'} Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
