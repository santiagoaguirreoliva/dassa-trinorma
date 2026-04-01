const API_BASE = '/api';

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    const msg = error.detail ? `${error.error}: ${error.detail}` : (error.error || 'Error en la solicitud');
    throw new Error(msg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getMe: () => apiCall('/auth/me'),

  // Sistema de Gestión
  getSistemaGestion: () => apiCall('/sistema-gestion'),
  getSistemaGestionSection: (section: string) => apiCall(`/sistema-gestion/${section}`),
  updateSistemaGestionSection: (section: string, content: string) =>
    apiCall(`/sistema-gestion/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  // Documents
  getDocuments: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/documents${query ? '?' + query : ''}`);
  },
  getDocument: (id: string | number) => apiCall(`/documents/${id}`),
  createDocument: (data: any) =>
    apiCall('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDocument: (id: string | number, data: any) =>
    apiCall(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDocument: (id: string | number) =>
    apiCall(`/documents/${id}`, { method: 'DELETE' }),

  // Incidents
  getIncidents: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/incidents${query ? '?' + query : ''}`);
  },
  getIncident: (id: string | number) => apiCall(`/incidents/${id}`),
  createIncident: (data: any) =>
    apiCall('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIncident: (id: string | number, data: any) =>
    apiCall(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteIncident: (id: string | number) =>
    apiCall(`/incidents/${id}`, { method: 'DELETE' }),

  // Environmental
  getEnvironmentalAspects: () => apiCall('/environmental'),
  getEnvironmentalAspect: (id: string | number) => apiCall(`/environmental/${id}`),
  createEnvironmentalAspect: (data: any) =>
    apiCall('/environmental', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEnvironmentalAspect: (id: string | number, data: any) =>
    apiCall(`/environmental/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteEnvironmentalAspect: (id: string | number) =>
    apiCall(`/environmental/${id}`, { method: 'DELETE' }),

  // Satisfaction
  getSatisfaction: () => apiCall('/satisfaction'),
  getSatisfactionSurvey: (id: string | number) => apiCall(`/satisfaction/${id}`),
  createSatisfactionSurvey: (data: any) =>
    apiCall('/satisfaction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSatisfactionSurvey: (id: string | number, data: any) =>
    apiCall(`/satisfaction/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSatisfactionSurvey: (id: string | number) =>
    apiCall(`/satisfaction/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/employees${query ? '?' + query : ''}`);
  },
  getEmployee: (id: string | number) => apiCall(`/employees/${id}`),
  createEmployee: (data: any) =>
    apiCall('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEmployee: (id: string | number, data: any) =>
    apiCall(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteEmployee: (id: string | number) =>
    apiCall(`/employees/${id}`, { method: 'DELETE' }),

  // Trainings
  getTrainings: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/trainings${query ? '?' + query : ''}`);
  },
  getTraining: (id: string | number) => apiCall(`/trainings/${id}`),
  createTraining: (data: any) =>
    apiCall('/trainings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTraining: (id: string | number, data: any) =>
    apiCall(`/trainings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTraining: (id: string | number) =>
    apiCall(`/trainings/${id}`, { method: 'DELETE' }),
  addTrainingEmployee: (trainingId: string | number, data: any) =>
    apiCall(`/trainings/${trainingId}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTrainingEmployee: (trainingId: string | number, empId: string | number, data: any) =>
    apiCall(`/trainings/${trainingId}/employees/${empId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTrainingEmployee: (trainingId: string | number, empId: string | number) =>
    apiCall(`/trainings/${trainingId}/employees/${empId}`, { method: 'DELETE' }),

  // Purchases
  getPurchases: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/purchases${query ? '?' + query : ''}`);
  },
  getPurchase: (id: string | number) => apiCall(`/purchases/${id}`),
  createPurchase: (data: any) =>
    apiCall('/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePurchase: (id: string | number, data: any) =>
    apiCall(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePurchase: (id: string | number) =>
    apiCall(`/purchases/${id}`, { method: 'DELETE' }),
  updatePurchaseStatus: (id: string | number, data: any) =>
    apiCall(`/purchases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getPurchaseStats: () => apiCall('/purchases/stats'),
  getPurchaseReports: () => apiCall('/purchases/reports/monthly'),

  // Suppliers
  getSuppliers: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/suppliers${query ? '?' + query : ''}`);
  },
  getSupplier: (id: string | number) => apiCall(`/suppliers/${id}`),
  createSupplier: (data: any) =>
    apiCall('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: string | number, data: any) =>
    apiCall(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: string | number) =>
    apiCall(`/suppliers/${id}`, { method: 'DELETE' }),
};
