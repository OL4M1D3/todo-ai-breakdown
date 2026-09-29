const KEY = "taskbreak-v1";
let state = { tasks: [], notes: [] };
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.notes)) state = saved;
  } catch (e) { /* empty or blocked storage: start fresh */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
}
function el(tag, props = {}, ...kids) {
  const n = Object.assign(document.createElement(tag), props); // textContent only, never innerHTML
  kids.forEach((k) => n.append(k));
  return n;
}

let reviewing = null; // { taskId, items: [] } while the user reviews AI subtasks
let loadingId = null;
let errorMsg = "";

function renderTasks() {
  const list = $("task-list");
  list.replaceChildren();
  if (!state.tasks.length) list.append(el("li", { className: "empty", textContent: "No tasks yet. Add your first one above." }));
  state.tasks.forEach((t) => {
    const cb = el("input", { type: "checkbox", checked: t.done, ariaLabel: "Mark done" });
    cb.onchange = () => { t.done = cb.checked; save(); renderTasks(); };
    const breakBtn = el("button", { className: "ghost", textContent: loadingId === t.id ? "Thinking..." : "Break down with AI", disabled: loadingId !== null });
    breakBtn.onclick = () => breakDown(t);
    const del = el("button", { className: "danger", textContent: "Delete" });
    del.onclick = () => { state.tasks = state.tasks.filter((x) => x.id !== t.id); save(); renderTasks(); };
    const li = el("li", { className: "item" + (t.done ? " done" : "") },
      el("div", { className: "row" }, cb, el("span", { className: "text", textContent: t.text }), breakBtn, del));
    if (t.subtasks.length) {
      const subs = el("ul", { className: "subs" });
      t.subtasks.forEach((s) => {
        const scb = el("input", { type: "checkbox", checked: s.done, ariaLabel: "Mark subtask done" });
        scb.onchange = () => { s.done = scb.checked; save(); renderTasks(); };
        subs.append(el("li", { className: s.done ? "done" : "" }, scb, el("span", { className: "text", textContent: s.text })));
      });
      li.append(subs);
    }
    if (reviewing && reviewing.taskId === t.id) li.append(reviewPanel(t));
    list.append(li);
  });
  $("task-msg").textContent = errorMsg;
}

function reviewPanel(task) {
  const box = el("div", { className: "review" }, el("strong", { textContent: "Review suggested subtasks" }));
  reviewing.items.forEach((text, i) => {
    const input = el("input", { type: "text", className: "edit", value: text, ariaLabel: "Subtask" });
    input.oninput = () => { reviewing.items[i] = input.value; };
    const rm = el("button", { className: "danger", textContent: "Remove" });
    rm.onclick = () => { reviewing.items.splice(i, 1); renderTasks(); };
    box.append(el("div", { className: "row" }, input, rm));
  });
  const add = el("button", { textContent: "Add subtasks" });
  add.onclick = () => {
    const clean = reviewing.items.map((s) => s.trim()).filter(Boolean);
    clean.forEach((text) => task.subtasks.push({ id: uid(), text, done: false }));
    reviewing = null; save(); renderTasks();
  };
  const cancel = el("button", { className: "ghost", textContent: "Cancel" });
  cancel.onclick = () => { reviewing = null; renderTasks(); };
  box.append(el("div", { className: "actions" }, add, cancel));
  return box;
}

async function breakDown(task) {
  errorMsg = ""; reviewing = null; loadingId = task.id; renderTasks();
  try {
    const res = await fetch("/api/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: task.text }),
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.subtasks) || !data.subtasks.length) throw new Error(data.error || "No subtasks returned.");
    reviewing = { taskId: task.id, items: data.subtasks.slice(0, 10) };
  } catch (e) {
    errorMsg = e.message || "Could not reach the AI. Check your connection and try again.";
  }
  loadingId = null; renderTasks();
}

function renderNotes() {
  const list = $("note-list");
  list.replaceChildren();
  if (!state.notes.length) list.append(el("li", { className: "empty", textContent: "No notes yet." }));
  state.notes.forEach((n) => {
    const ta = el("textarea", { className: "edit", rows: 2, value: n.text, ariaLabel: "Edit note" });
    ta.onchange = () => { if (ta.value.trim()) { n.text = ta.value.trim(); save(); } else { ta.value = n.text; } };
    const del = el("button", { className: "danger", textContent: "Delete" });
    del.onclick = () => { state.notes = state.notes.filter((x) => x.id !== n.id); save(); renderNotes(); };
    list.append(el("li", { className: "item" }, el("div", { className: "row" }, ta, del)));
  });
}

$("task-form").onsubmit = (e) => {
  e.preventDefault();
  const text = $("task-input").value.trim();
  if (!text) { errorMsg = "Enter a task before adding it."; return renderTasks(); }
  errorMsg = "";
  state.tasks.unshift({ id: uid(), text, done: false, subtasks: [] });
  $("task-input").value = ""; save(); renderTasks();
};
$("note-form").onsubmit = (e) => {
  e.preventDefault();
  const text = $("note-input").value.trim();
  if (!text) return;
  state.notes.unshift({ id: uid(), text });
  $("note-input").value = ""; save(); renderNotes();
};

load(); renderTasks(); renderNotes();