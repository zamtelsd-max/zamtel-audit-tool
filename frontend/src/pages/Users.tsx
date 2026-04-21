import { useState } from 'react';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useResetPasswordMutation } from '../store/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { UserPlus, Edit2, X, ShieldOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import type { User, UserRole } from '../types';

const ROLE_COLORS: Record<string, string> = {
  ADMIN:              'bg-purple-100 text-purple-800',
  MARKET_MANAGEMENT:  'bg-blue-100 text-blue-800',
  TRADE_AUDITOR:      'bg-orange-100 text-orange-800',
  ASE:                'bg-teal-100 text-teal-800',
  TSE:                'bg-cyan-100 text-cyan-800',
  BDC:                'bg-indigo-100 text-indigo-800',
  TDR:                'bg-green-100 text-green-800',
  TEAM_LEAD:          'bg-yellow-100 text-yellow-800',
  AGENT:              'bg-gray-100 text-gray-700',
  RETAILER:           'bg-pink-100 text-pink-800',
};

const ALL_ROLES: UserRole[] = [
  'ADMIN','MARKET_MANAGEMENT','TRADE_AUDITOR','ASE','TSE','BDC','TDR','TEAM_LEAD','AGENT','RETAILER'
];

const PROVINCES = ['Copperbelt','Lusaka','Southern','Northern','Eastern','Western','North-Western','Luapula','Muchinga','Central'];

export default function Users() {
  const { user: me } = useSelector((s: RootState) => s.auth);
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const { data: users, isLoading, refetch } = useGetUsersQuery({ role: roleFilter || undefined });
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const [form, setForm] = useState({
    staffId: '', name: '', role: 'AGENT' as UserRole,
    phone: '', email: '', province: '', zone: '', password: '',
  });

  const handleCreate = async () => {
    if (!form.staffId || !form.name || !form.password) {
      toast.error('Staff ID, name and password are required'); return;
    }
    try {
      await createUser(form).unwrap();
      toast.success(`User ${form.name} created`);
      setShowCreate(false);
      setForm({ staffId: '', name: '', role: 'AGENT', phone: '', email: '', province: '', zone: '', password: '' });
      refetch();
    } catch (e: unknown) {
      const err = e as { data?: { error?: string } };
      toast.error(err?.data?.error || 'Failed to create user');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await updateUser({ id: u.id, data: { active: !u.active } }).unwrap();
      toast.success(`${u.name} ${u.active ? 'deactivated' : 'activated'}`);
      refetch();
    } catch { toast.error('Failed to update user'); }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    try {
      await updateUser({ id: editUser.id, data: { role: editUser.role, province: editUser.province, zone: editUser.zone, phone: editUser.phone, email: editUser.email } }).unwrap();
      toast.success('User updated');
      setEditUser(null);
      refetch();
    } catch { toast.error('Failed to update user'); }
  };

  const handleResetPwd = async () => {
    if (!resetFor || !newPwd) { toast.error('Enter new password'); return; }
    try {
      await resetPassword({ id: resetFor.id, password: newPwd }).unwrap();
      toast.success('Password reset');
      setResetFor(null);
      setNewPwd('');
    } catch { toast.error('Failed to reset password'); }
  };

  const isAdmin = me?.role === 'ADMIN';

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Custodians</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users?.length ?? 0} users</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-800 transition">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Role filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setRoleFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${!roleFilter ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All Roles
        </button>
        {ALL_ROLES.map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${roleFilter === r ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading users...</div>
        ) : !users?.length ? (
          <div className="p-12 text-center text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name','Staff ID','Role','Province / Zone','Contact','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold text-sm flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{u.staffId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {u.province || '—'} {u.zone ? `· ${u.zone}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.phone && <div>{u.phone}</div>}
                      {u.email && <div className="text-gray-400 truncate max-w-[140px]">{u.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditUser({ ...u })} title="Edit"
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggleActive(u)} title={u.active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg transition ${u.active ? 'hover:bg-red-50 text-gray-400 hover:text-red-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-700'}`}>
                            {u.active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => { setResetFor(u); setNewPwd(''); }} title="Reset password"
                            className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-600 transition text-xs font-bold">
                            🔑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900">Create New User</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Staff ID *', key: 'staffId', type: 'text', placeholder: 'e.g. TDR001' },
                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'John Banda' },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '0970000000' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'j.banda@zamtel.zm' },
                { label: 'Password *', key: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Zone', key: 'zone', type: 'text', placeholder: 'e.g. Ndola Central' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className={key === 'name' || key === 'staffId' ? 'col-span-1' : 'col-span-1'}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Province</label>
                <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">— Select —</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Edit {editUser.name}</h2>
              <button onClick={() => setEditUser(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Role', key: 'role', type: 'select' },
                { label: 'Province', key: 'province', type: 'province' },
                { label: 'Zone', key: 'zone', type: 'text' },
                { label: 'Phone', key: 'phone', type: 'text' },
                { label: 'Email', key: 'email', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
                  {type === 'select' ? (
                    <select value={(editUser as unknown as Record<string, string>)[key] || ''} onChange={e => setEditUser(u => u ? { ...u, [key]: e.target.value } : u)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                      {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                    </select>
                  ) : type === 'province' ? (
                    <select value={(editUser as unknown as Record<string, string>)[key] || ''} onChange={e => setEditUser(u => u ? { ...u, [key]: e.target.value } : u)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                      <option value="">— None —</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={(editUser as unknown as Record<string, string>)[key] || ''}
                      onChange={e => setEditUser(u => u ? { ...u, [key]: e.target.value } : u)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditUser(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleEditSave} disabled={updating}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Reset Password</h2>
              <button onClick={() => setResetFor(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Setting new password for <strong>{resetFor.name}</strong></p>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="New password..." autoFocus
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <div className="flex gap-3">
                <button onClick={() => setResetFor(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleResetPwd} disabled={resetting}
                  className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
