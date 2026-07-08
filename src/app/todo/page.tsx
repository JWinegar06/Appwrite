"use client";

import { useEffect, useState } from "react";
import type { Models } from "appwrite";
import { account } from "../../lib/appwrite";
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  type Task,
} from "../functions";

export default function Home() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        await loadTasks();
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchTasks();
      setTasks(data);
    } catch {
      setError("Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      setError(null);

      await account.createEmailPasswordSession({
        email,
        password,
      });

      const currentUser = await account.get();
      setUser(currentUser);

      setEmail("");
      setPassword("");

      await loadTasks();
    } catch {
      setError("Login failed. Please check your email and password.");
    }
  };

  const createAccount = async () => {
    try {
      setError(null);

      await account.create({
        userId: "unique()",
        email,
        password,
        name,
      });

      await account.createEmailPasswordSession({
        email,
        password,
      });

      const currentUser = await account.get();

      setUser(currentUser);

      setName("");
      setEmail("");
      setPassword("");

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
    }
  };

  const logout = async () => {
    try {
      setError(null);

      await account.deleteSession({
        sessionId: "current",
      });

      setUser(null);
      setTasks([]);
    } catch {
      setError("Logout failed. Please try again.");
    }
  };

  const addTask = async () => {
    if (title.trim() === "" || content.trim() === "") return;

    try {
      setError(null);

      const newTask = await createTask(title.trim(), content.trim());

      setTasks((prev) => [newTask, ...prev]);
      setTitle("");
      setContent("");
    } catch {
      setError("Unable to create task. Please try again.");
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      setError(null);

      const updated = await updateTask(task.$id!, {
        completed: !task.completed,
      });

      setTasks((prev) =>
        prev.map((t) => (t.$id === updated.$id ? updated : t)),
      );
    } catch {
      setError("Unable to update task.");
    }
  };

  const removeTask = async (documentId: string) => {
    try {
      setError(null);

      await deleteTask(documentId);

      setTasks((prev) => prev.filter((t) => t.$id !== documentId));
    } catch {
      setError("Unable to delete task.");
    }
  };

  const saveTask = async (documentId: string) => {
    try {
      setError(null);

      const updated = await updateTask(documentId, {
        title: editingTitle.trim(),
        content: editingContent.trim(),
      });

      setTasks((prev) =>
        prev.map((t) => (t.$id === updated.$id ? updated : t)),
      );

      setEditingIndex(null);
    } catch {
      setError("Unable to save task.");
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingTitle(tasks[index].title || "");
    setEditingContent(tasks[index].content || "");
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  if (authLoading) {
    return <p>Checking login...</p>;
  }

  return (
    <div className="root-container">
      <div className="task-container">
        <h1 className="header">My Tasks</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {!user ? (
          <div className="flex flex-col mb-6">
            <input
              type="text"
              className="input-field"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              className="input-field mt-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              className="input-field mt-2"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login} className="edit-button mt-3">
              Login
            </button>

            <button onClick={createAccount} className="save-button mt-2">
              Create Account
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-700">Logged in as {user.email}</p>
              <button onClick={logout} className="delete-button mt-2">
                Logout
              </button>
            </div>

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

            {loading && <p>Loading tasks...</p>}

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
                          className={
                            t.completed
                              ? "line-through text-gray-500"
                              : "text-gray-700"
                          }
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
          </>
        )}
      </div>
    </div>
  );
}
