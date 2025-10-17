export interface IamCheckResult {
  isAdmin: boolean;
  role: string;
  permissions: string[];
}

const DEFAULT_NAMESPACE = 'Fintech';

export async function verifyAdmin(userId?: string, namespace?: string): Promise<IamCheckResult> {
  if (!userId) {
    return { isAdmin: false, role: 'user', permissions: [] };
  }
  const ns = (namespace || process.env.NEXT_PUBLIC_IAM_NAMESPACE || DEFAULT_NAMESPACE).trim();
  try {
    const res = await fetch(`https://brmh.in/namespace-roles/${encodeURIComponent(userId)}/${encodeURIComponent(ns)}`);
    if (!res.ok) {
      return { isAdmin: false, role: 'user', permissions: [] };
    }
    const data = await res.json();
    const role: string = data.role || 'user';
    const permissions: string[] = Array.isArray(data.permissions) ? data.permissions : [];
    const isAdmin = role === 'admin' || role === 'superadmin' || permissions.includes('crud:all');
    return { isAdmin, role: isAdmin ? 'admin' : role, permissions };
  } catch {
    return { isAdmin: false, role: 'user', permissions: [] };
  }
}

export async function verifyHeaderEdit(userId?: string, namespace?: string): Promise<IamCheckResult> {
  if (!userId) {
    return { isAdmin: false, role: 'user', permissions: [] };
  }
  const ns = (namespace || process.env.NEXT_PUBLIC_IAM_NAMESPACE || DEFAULT_NAMESPACE).trim();
  try {
    const res = await fetch(`https://brmh.in/namespace-roles/${encodeURIComponent(userId)}/${encodeURIComponent(ns)}`);
    if (!res.ok) {
      return { isAdmin: false, role: 'user', permissions: [] };
    }
    const data = await res.json();
    const role: string = data.role || 'user';
    const permissions: string[] = Array.isArray(data.permissions) ? data.permissions : [];
    const isAdmin = role === 'admin' || role === 'superadmin' || permissions.includes('crud:all');
    const canEditHeaders = isAdmin || permissions.includes('edit:headers');
    return { 
      isAdmin: canEditHeaders, 
      role: canEditHeaders ? (isAdmin ? 'admin' : role) : role, 
      permissions 
    };
  } catch {
    return { isAdmin: false, role: 'user', permissions: [] };
  }
}


