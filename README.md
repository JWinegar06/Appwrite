# Appwrite Demo

A [Next.js](https://nextjs.org) todo app that starts with **localStorage** for persistence. Your goal is to replace that with [Appwrite Databases](https://appwrite.io/docs/references/cloud/client-web/databases) so tasks are stored in the cloud.

The todo UI lives at `/todo`. All data logic is in `src/app/functions.ts`.

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/todo](http://localhost:3000/todo). Tasks are saved in your browser's localStorage for now.

---

## Walkthrough: Connect the App to Appwrite

This guide walks you through replacing localStorage with Appwrite, step by step. Follow each step in order.

**Reference docs:** [Appwrite Databases (Web SDK)](https://appwrite.io/docs/references/cloud/client-web/databases)

---

### Step 1: Create an Appwrite project

1. Go to the [Appwrite Console](https://cloud.appwrite.io).
2. Sign in or create an account.
3. Click **Create project** and give it a name (for example, `todo-demo`).
4. On the project overview page, copy your **Project ID** — you will need it later.

---

### Step 2: Create a database and collection

1. In the left sidebar, open **Databases**.
2. Click **Create database** and name it (for example, `Tasks Database`).
3. Copy the **Database ID**.
4. Inside the database, click **Create collection** and name it (for example, `tasks`).
5. Copy the **Collection ID**.

---

### Step 3: Add collection attributes

Your app stores three fields per task. In the collection, go to **Attributes** and create:

| Key         | Type    | Required | Default |
| ----------- | ------- | -------- | ------- |
| `title`     | String  | Yes      | —       |
| `content`   | String  | Yes      | —       |
| `completed` | Boolean | Yes      | `false` |

Wait until all attributes show a status of **Available** before moving on.

---

### Step 4: Set collection permissions

For this learning exercise, allow any user to read and write tasks.

1. Open your collection and go to **Settings** → **Permissions**.
2. Add these roles with **Create**, **Read**, **Update**, and **Delete** access:
   - **Any** (for unauthenticated demo use)

> **Note:** In a real production app you would restrict permissions to authenticated users. For now, `Any` keeps the setup simple while you learn the SDK.

---

### Step 5: Install the Appwrite SDK

In your project folder, run:

```bash
npm install appwrite
```

The current Web SDK uses an **object-parameter** style for all methods (shown in the examples below). Avoid older tutorials that pass arguments positionally.

---

### Step 6: Add environment variables

Create a file called `.env.local` in the project root (this file is gitignored):

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=your-collection-id
```

Replace the placeholder values with the IDs you copied in Steps 1 and 2.

Restart the dev server after saving `.env.local` so Next.js picks up the new variables.

---

### Step 7: Create an Appwrite client file

Create `src/lib/appwrite.ts`:

```typescript
import { Client, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export const databases = new Databases(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!;
```

This file creates a single Appwrite client and exports the `Databases` service your app will use.

---

### Step 8: Replace localStorage functions with Appwrite calls

Open `src/app/functions.ts`. You will replace the localStorage helpers with async functions that call Appwrite.

**Before (localStorage):**

```typescript
export const loadTasks = (): Task[] => { ... }
export const saveTasks = (tasks: Task[]): void => { ... }
export const generateTaskId = (): string => { ... }
```

**After (Appwrite):** replace the entire file with something like this:

```typescript
import {
  ID,
  Permission,
  Query,
  Role,
  type Models,
} from "appwrite";
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
  content: string
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
  data: Partial<Pick<Task, "title" | "content" | "completed">>
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
```

Key things to notice:

- `ID.unique()` replaces `generateTaskId()` for document IDs.
- Each Appwrite method takes a **single object** with named properties (`databaseId`, `collectionId`, etc.).
- `listDocuments`, `createDocument`, `updateDocument`, and `deleteDocument` map directly to CRUD operations.

---

### Step 9: Update the todo page to use async Appwrite calls

Open `src/app/todo/page.tsx`. The UI can stay mostly the same, but the data layer changes because Appwrite calls are **async** (they return Promises).

Here is what you need to change:

#### 9a. Update imports

```typescript
import { createTask, deleteTask, fetchTasks, updateTask, type Task } from "../functions";
```

Remove imports for `loadTasks`, `saveTasks`, and `generateTaskId`.

#### 9b. Load tasks on mount

Replace the synchronous `loadTasks()` call with an async fetch:

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchTasks()
    .then(setTasks)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);
```

Remove the second `useEffect` that called `saveTasks(tasks)` — Appwrite saves happen inside each action now, not on every state change.

#### 9c. Make action handlers async

**Add a task:**

```typescript
const addTask = async () => {
  if (title.trim() === "" || content.trim() === "") return;
  const newTask = await createTask(title.trim(), content.trim());
  setTasks((prev) => [newTask, ...prev]);
  setTitle("");
  setContent("");
};
```

**Toggle completion:**

```typescript
const toggleTaskCompletion = async (task: Task) => {
  const updated = await updateTask(task.$id, { completed: !task.completed });
  setTasks((prev) => prev.map((t) => (t.$id === updated.$id ? updated : t)));
};
```

**Delete a task:**

```typescript
const removeTask = async (documentId: string) => {
  await deleteTask(documentId);
  setTasks((prev) => prev.filter((t) => t.$id !== documentId));
};
```

**Save edits:**

```typescript
const saveTask = async (documentId: string) => {
  const updated = await updateTask(documentId, {
    title: editingTitle.trim(),
    content: editingContent.trim(),
  });
  setTasks((prev) => prev.map((t) => (t.$id === updated.$id ? updated : t)));
  setEditingIndex(null);
};
```

#### 9d. Use document IDs instead of array indexes

When working with Appwrite, identify tasks by `$id` (the document ID) rather than their position in the array. Update your edit/delete/toggle handlers to pass `task.$id` instead of an index.

#### 9e. Show loading and error states

Add UI feedback while data is loading or if a request fails:

```tsx
{loading && <p>Loading tasks...</p>}
{error && <p className="text-red-600">{error}</p>}
```

Wrap async handlers in `try/catch` blocks to display friendly error messages.

---

### Step 10: Test your integration

1. Restart the dev server if it is still running.
2. Open [http://localhost:3000/todo](http://localhost:3000/todo).
3. Add a task — it should appear in the Appwrite Console under your collection's **Documents** tab.
4. Toggle, edit, and delete tasks — confirm each change shows up in the console.
5. Refresh the page — tasks should load from Appwrite, not localStorage.

---

### Troubleshooting

| Problem | Likely cause |
| ------- | ------------ |
| `Missing Appwrite configuration` or endpoint error | `.env.local` is missing or the dev server was not restarted |
| `401 Unauthorized` | Wrong Project ID, or collection permissions not set |
| `404 Not Found` | Wrong Database ID or Collection ID |
| `Document structure invalid` | Collection attributes do not match (`title`, `content`, `completed`) |
| Tasks disappear on refresh | `fetchTasks` is not wired up, or the list call is failing silently |

Check the browser **Network** tab and the Appwrite Console **Logs** for more detail on any error.

---

## Appwrite API quick reference

All methods use the object-parameter style from the [current Web SDK docs](https://appwrite.io/docs/references/cloud/client-web/databases):

```typescript
// Read
await databases.listDocuments({ databaseId, collectionId, queries: [] });
await databases.getDocument({ databaseId, collectionId, documentId });

// Create
await databases.createDocument({ databaseId, collectionId, documentId: ID.unique(), data, permissions });

// Update
await databases.updateDocument({ databaseId, collectionId, documentId, data });

// Delete
await databases.deleteDocument({ databaseId, collectionId, documentId });
```

---

## Learn More

- [Appwrite Databases docs](https://appwrite.io/docs/products/databases)
- [Appwrite Web SDK reference](https://appwrite.io/docs/references/cloud/client-web/databases)
- [Next.js Documentation](https://nextjs.org/docs)
