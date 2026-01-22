import { ServiceJob, JobStatus } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5272";

const headers = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

export async function fetchJobs(): Promise<ServiceJob[]> {
  const response = await fetch(`${API_BASE}/api/jobs`, { headers });
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}

export async function fetchJobsFromSalesforce(): Promise<ServiceJob[]> {
  const response = await fetch(`${API_BASE}/api/jobs/from-salesforce`, { headers });
  if (!response.ok) throw new Error("Failed to fetch jobs from Salesforce");
  return response.json();
}

export async function fetchJob(id: string): Promise<ServiceJob> {
  const response = await fetch(`${API_BASE}/api/jobs/${id}`, { headers });
  if (!response.ok) throw new Error("Failed to fetch job");
  return response.json();
}

export async function fetchJobFromSalesforce(id: string): Promise<ServiceJob> {
  const response = await fetch(`${API_BASE}/api/jobs/from-salesforce/${id}`, { headers });
  if (!response.ok) throw new Error("Failed to fetch job from Salesforce");
  return response.json();
}

export async function createJob(job: CreateJobInput): Promise<ServiceJob> {
  const response = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify(job),
  });
  if (!response.ok) throw new Error("Failed to create job");
  return response.json();
}

export async function updateJob(id: string, job: CreateJobInput): Promise<ServiceJob> {
  const response = await fetch(`${API_BASE}/api/jobs/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(job),
  });
  if (!response.ok) throw new Error("Failed to update job");
  return response.json();
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<ServiceJob> {
  const response = await fetch(`${API_BASE}/api/jobs/${id}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update job status");
  return response.json();
}

export async function updateSalesforceJobStatus(id: string, status: JobStatus): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/api/jobs/from-salesforce/${id}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update Salesforce job status");
  return response.json();
}

export async function deleteJob(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/jobs/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) throw new Error("Failed to delete job");
}

export interface CreateJobInput {
  customerName: string;
  siteAddress: string;
  equipmentType: string;
  equipmentModel: string;
  priority: string;
  scheduledDate: string;
  technicianName: string;
  jobType: string;
  notes?: string;
}