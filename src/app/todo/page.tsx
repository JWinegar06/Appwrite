"use client";
import { useState, useEffect } from "react";
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  type Task,
} from "../functions";


export default function Home() {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [editingContent, setEditingContent] = useState<string>("");

  // Load tasks when the component mounts
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchTasks()
    .then(setTasks)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);

  // Add a task
const addTask = async () => {
  if (title.trim() === "" || content.trim() === "") return;

  try {
    setError(null);

    const newTask = await createTask(title.trim(), content.trim());

    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setContent("");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to create task. Please try again.",
    );
  }
};

// Toggle completion
const toggleTaskCompletion = async (task: Task) => {
  try {
    setError(null);

    const updated = await updateTask(task.$id!, {
      completed: !task.completed,
    });

    setTasks((prev) => prev.map((t) => (t.$id === updated.$id ? updated : t)));
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to update task.");
  }
};

// Delete a task
const removeTask = async (documentId: string) => {
  try {
    setError(null);

    await deleteTask(documentId);

    setTasks((prev) => prev.filter((t) => t.$id !== documentId));
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to delete task.");
  }
};

// Save edits
const saveTask = async (documentId: string) => {
  try {
    setError(null);

    const updated = await updateTask(documentId, {
      title: editingTitle.trim(),
      content: editingContent.trim(),
    });

    setTasks((prev) => prev.map((t) => (t.$id === updated.$id ? updated : t)));

    setEditingIndex(null);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to save task.");
  }
};

  const startEditing = (index: number): void => {
    setEditingIndex(index);
    setEditingTitle(tasks[index].title || "");
    setEditingContent(tasks[index].content || "");
  };

  const cancelEditing = (): void => {
    setEditingIndex(null);
  };

  return (
    <div className="root-container">
      <div className="task-container">
        <h1 className="header">My Tasks</h1>
        <div className="flex flex-col mb-6">
          <input
            type="text"
            className="input-field"
            placeholder="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input-field mt-2"
            placeholder="Task Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button onClick={addTask} className="edit-button mt-2">
            Add Task
          </button>
        </div>
        {loading && (<p className="text-center text-gray-500 py-4">Loading tasks...</p>)}
        {error && <p className="text-center text-red-600 py-4">{error}</p>}
        <ul className="space-y-3">
          {tasks.map((t, index) => (
            <li
              key={t.$id || index}
              className={`flex flex-col p-4 rounded-lg shadow-md ${
                t.completed ? "bg-green-100" : "bg-gray-100"
              } transition-all ease-in-out duration-200`}
            >
              <div className="flex items-center">
                {editingIndex !== index && (
                  <input
                    type="checkbox"
                    checked={!!t.completed}
                    onChange={() => toggleTaskCompletion(t)}
                    className="mr-2"
                  />
                )}
                {editingIndex === index ? (
                  <div className="flex flex-col">
                    <input
                      type="text"
                      className="input-field"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                    />
                    <textarea
                      rows={4}
                      className="input-field mt-2"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <h2
                      className={`text-lg font-semibold ${
                        t.completed
                          ? "line-through text-gray-500"
                          : "text-gray-900"
                      }`}
                    >
                      {t.title}
                    </h2>
                    <p
                      className={`${
                        t.completed
                          ? "line-through text-gray-500"
                          : "text-gray-700"
                      }`}
                    >
                      {t.content}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex mt-2">
                {editingIndex === index ? (
                  <>
                    <button
                      onClick={() => saveTask(t.$id!)}
                      className="save-button"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="cancel-button ml-2"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(index)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeTask(t.$id!)}
                      className="delete-button ml-2"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
