export interface FileReference {
  id: string;
  path: string;
  name: string;
  content: string;
  type: 'file'; // Assuming only file type for now, adjust if needed
}

export interface FileTag {
  id: string;
  name: string;
  path: string;
}