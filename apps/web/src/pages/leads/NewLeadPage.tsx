import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftIcon, UserIcon, MapPinIcon, BuildingOfficeIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { api } from '../../api/client';

export function NewLeadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'LA',
    zip: '',
    source: 'web',
    propertyType: 'single-family',
    yearBuilt: '',
    estimatedWindowCount: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast.error('First name, last name, and phone are required');
      return;
    }
    
    setLoading(true);
    try {
      const result = await api.leads.create({
        ...formData,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        estimatedWindowCount: formData.estimatedWindowCount ? parseInt(formData.estimatedWindowCount) : null,
      });
      const newLead = result.data || result;
      toast.success('Lead created successfully');
      navigate(`/leads/${newLead.id}`);
    } catch (error: any) {
      console.error('Create lead error:', error);
      toast.error(error.response?.data?.error || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto page-transition">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-lg font-bold text-white">Create New Lead</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-800">
              <UserIcon className="h-5 w-5 text-brand-400" />
              <h2 className="text-base font-semibold text-white">Contact Info</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">First Name *</label>
                <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="input w-full" placeholder="John" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Last Name *</label>
                <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="input w-full" placeholder="Doe" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Phone *</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input w-full" placeholder="(504) 555-0123" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input w-full" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Lead Source</label>
              <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="input w-full">
                <option value="web">Website Form</option>
                <option value="call-in">Call-In</option>
                <option value="referral">Referral</option>
                <option value="door-knock">Door Knocking</option>
                <option value="storm-list">Storm List</option>
              </select>
            </div>
          </div>

          {/* Property Info */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-800">
              <MapPinIcon className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Property Address</h2>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Street Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input w-full" placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">City</label>
                <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="input w-full" placeholder="New Orleans" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">State</label>
                <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="input w-full" placeholder="LA" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">ZIP Code</label>
              <input type="text" value={formData.zip} onChange={e => setFormData({ ...formData, zip: e.target.value })} className="input w-full" placeholder="70112" />
            </div>
          </div>
          
          {/* House Details */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-800">
              <BuildingOfficeIcon className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-semibold text-white">House Details (Optional)</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Property Type</label>
                <select value={formData.propertyType} onChange={e => setFormData({ ...formData, propertyType: e.target.value })} className="input w-full">
                  <option value="single-family">Single Family</option>
                  <option value="multi-family">Multi-Family</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Year Built</label>
                <input type="number" value={formData.yearBuilt} onChange={e => setFormData({ ...formData, yearBuilt: e.target.value })} className="input w-full" placeholder="e.g. 1995" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estimated Windows</label>
              <input type="number" value={formData.estimatedWindowCount} onChange={e => setFormData({ ...formData, estimatedWindowCount: e.target.value })} className="input w-full" placeholder="e.g. 12" />
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-800">
              <DocumentTextIcon className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Initial Notes</h2>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notes for Rep</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="textarea w-full h-32" placeholder="Customer is interested in replacing all front-facing windows. Needs financing." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Create Lead & Open
          </button>
        </div>
      </form>
    </div>
  );
}
