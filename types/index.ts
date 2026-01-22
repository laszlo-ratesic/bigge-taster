export interface ServiceJob {
  id: string;
  workOrderNumber: string;
  customerName: string;
  siteAddress: string;
  equipmentType: string;
  equipmentModel: string;
  status: "Dispatched" | "En Route" | "In Progress" | "Complete";
  priority: "Low" | "Medium" | "High" | "Urgent";
  scheduledDate: string;
  technicianName: string;
  jobType: "Dispatch" | "Service" | "Inspection" | "Rigging";
  notes: string;
}

export type JobStatus = ServiceJob["status"];
export type JobPriority = ServiceJob["priority"];
export type JobType = ServiceJob["jobType"];