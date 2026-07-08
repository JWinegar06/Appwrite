import { ID, Permission, Query, Role, type Models } from "appwrite";
import { COLLECTION_ID, DATABASE_ID, databases } from "../lib/appwrite";

export interface Task extends Models.Document {
  title: string;
  content: string;
  completed: boolean;
}

const documentPermissions = [
  Permission.read(Role.any()),
  Permission.update(Role.any()),
  Permission.delete(Role.any()),
];

// List all tasks (replaces loadTasks)
export const fetchTasks = async (): Promise<Task[]> => {
  const response = await databases.listDocuments<Task>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries: [Query.orderDesc("$createdAt")],
  });
  return response.documents;
};

// Create a task (replaces add + saveTasks)
export const createTask = async (
  title: string,
  content: string,
): Promise<Task> => {
  return databases.createDocument<Task>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: ID.unique(),
    data: { title, content, completed: false },
    permissions: documentPermissions,
  });
};

// Update a task (replaces saveTasks for edits/toggles)
export const updateTask = async (
  documentId: string,
  data: Partial<Pick<Task, "title" | "content" | "completed">>,
): Promise<Task> => {
  return databases.updateDocument<Task>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId,
    data,
  });
};

// Delete a task
export const deleteTask = async (documentId: string): Promise<void> => {
  await databases.deleteDocument({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId,
  });
};
