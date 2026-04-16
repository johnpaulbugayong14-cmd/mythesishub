import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { signOutUser } from "./auth.js";

window.signOutUser = signOutUser;

let members = [
  { uid: "everyone", name: "Everyone" },
  { uid: "kingfordnabor@gmail.com", name: "Kingford Nabor" },
  { uid: "allancorral@gmail.com", name: "Allan Corral" },
  { uid: "phricksborebor@gmail.com", name: "Phricks Borebor" },
  { uid: "moezarperez@gmail.com", name: "Moezar Perez" },
  { uid: "rogelioledda@gmail.com", name: "Rogelio Ledda" }
];

let chart;

function loadMembers() {
  const select = document.getElementById("assignedTo");
  select.innerHTML = "";

  members.forEach(m => {
    select.innerHTML += `<option value="${m.uid}">${m.name}</option>`;
  });
}

loadMembers();

/* CREATE TASK */
window.createTask = async function () {
  const title = document.getElementById("title").value.trim();
  const deadline = document.getElementById("deadline").value;
  const description = document.getElementById("description").value.trim();
  const assignedTo = document.getElementById("assignedTo").value;
  const link = document.getElementById("linkInput").value.trim();

  if (!title || !deadline || !assignedTo) {
    alert("Please fill all required fields.");
    return;
  }

  try {
    const member = members.find(m => m.uid === assignedTo) || members[0];

    const taskData = {
      title,
      description: description || "",
      deadline,
      assignedTo,
      assignedToName: member.name,
      linkURL: link || null,
      status: "pending",
      createdAt: Date.now()
    };

    await addDoc(collection(db, "tasks"), taskData);

    document.getElementById("title").value = "";
    document.getElementById("deadline").value = "";
    document.getElementById("description").value = "";
    document.getElementById("assignedTo").value = "";
    document.getElementById("linkInput").value = "";

    alert("Task created successfully!");
  } catch (error) {
    console.error("Error creating task:", error);
    alert(`Failed to create task: ${error.message}`);
  }
};

/* DELETE TASK */
window.deleteTask = async function (id) {
  if (confirm("Are you sure you want to delete this task?")) {
    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  }
};

/* MARK DONE */
window.markDone = async function (id) {
  try {
    await updateDoc(doc(db, "tasks", id), {
      status: "done"
    });
  } catch (error) {
    console.error("Error marking done:", error);
    alert("Failed to mark task done. Please try again.");
  }
};

/* NEED ACTION */
window.needAction = async function (id) {
  if (confirm("Are you sure you want to mark this task as needing action? This will notify the assigned member(s).")) {
    try {
      await updateDoc(doc(db, "tasks", id), {
        status: "needs action"
      });
      alert("Task has been marked as needing action. The member(s) will see the notification in their task list.");
    } catch (error) {
      console.error("Error marking task as needing action:", error);
      alert("Failed to mark task as needing action. Please try again.");
    }
  }
};

/* REALTIME + GRAPH */
onSnapshot(collection(db, "tasks"), (snap) => {
  let done = 0, pending = 0, overdue = 0, needsAction = 0;

  const now = Date.now();
  const container = document.getElementById("tasks");
  container.innerHTML = "";

  snap.forEach(docSnap => {
    const t = docSnap.data();

    if (new Date(t.deadline).getTime() < now && (t.status === "pending" || t.status === "pending validation")) {
      t.status = "overdue";
    }

    if (t.status === "done") done++;
    else if (t.status === "overdue") overdue++;
    else if (t.status === "needs action") needsAction++;
    else pending++;

    container.innerHTML += `
      <div class="card">
        <h3>${t.title}</h3>
        <p>Assigned To: ${t.assignedToName}</p>
        <p>Deadline: ${t.deadline}</p>
        ${t.description ? `<p><strong>Description:</strong> ${t.description}</p>` : ""}
        ${t.linkURL ? `<a href="${t.linkURL}" target="_blank">🔗 Open Link</a>` : ""}
        <p>Status: ${t.status}</p>
        <button onclick="markDone('${docSnap.id}')">Mark Done</button>
        ${(t.status === "pending" || t.status === "overdue") ? `<button onclick="needAction('${docSnap.id}')" class="btn-warning" style="margin-top: 0.5rem;">Need an Action</button>` : ""}
        <button onclick="deleteTask('${docSnap.id}')" class="btn-danger" style="margin-top: 0.5rem;">Delete</button>
      </div>
    `;
  });

  updateChart(done, pending, overdue, needsAction);
});

/* GRAPH */
function updateChart(done, pending, overdue, needsAction) {
  const ctx = document.getElementById("taskChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Done", "Pending", "Overdue", "Needs Action"],
      datasets: [{
        data: [done, pending, overdue, needsAction]
      }]
    }
  });
}

/* CREATE POLL */
window.createPoll = async function () {
  const question = document.getElementById("pollQuestion").value.trim();
  const optionInputs = document.querySelectorAll(".poll-option-input");
  const options = Array.from(optionInputs).map(input => input.value.trim()).filter(option => option !== "");

  if (!question || options.length < 2) {
    alert("Please enter a question and at least 2 options.");
    return;
  }

  try {
    const pollData = {
      question,
      options,
      votes: {},
      createdAt: new Date()
    };

    await addDoc(collection(db, "polls"), pollData);

    document.getElementById("pollQuestion").value = "";
    optionInputs.forEach(input => input.value = "");
    
    // Reset to 2 options
    const pollOptionsDiv = document.getElementById("pollOptions");
    pollOptionsDiv.innerHTML = `
      <div class="form-group">
        <label>Option 1</label>
        <input type="text" class="poll-option-input" placeholder="Enter option" required>
      </div>
      <div class="form-group">
        <label>Option 2</label>
        <input type="text" class="poll-option-input" placeholder="Enter option" required>
      </div>
    `;

    alert("Poll created successfully!");
  } catch (error) {
    console.error("Error creating poll:", error);
    alert(`Failed to create poll: ${error.message}`);
  }
};

/* ADD POLL OPTION */
window.addPollOption = function () {
  const pollOptionsDiv = document.getElementById("pollOptions");
  const optionCount = pollOptionsDiv.querySelectorAll(".poll-option-input").length + 1;
  
  const newOptionDiv = document.createElement("div");
  newOptionDiv.className = "form-group";
  newOptionDiv.innerHTML = `
    <label>Option ${optionCount}</label>
    <input type="text" class="poll-option-input" placeholder="Enter option" required>
  `;
  
  pollOptionsDiv.appendChild(newOptionDiv);
};

/* CREATE ANNOUNCEMENT */
window.createAnnouncement = async function () {
  const title = document.getElementById("announcementTitle").value.trim();
  const content = document.getElementById("announcementContent").value.trim();

  if (!title || !content) {
    alert("Please fill all fields.");
    return;
  }

  try {
    const announcementData = {
      title,
      content,
      createdAt: new Date()
    };

    await addDoc(collection(db, "announcements"), announcementData);

    document.getElementById("announcementTitle").value = "";
    document.getElementById("announcementContent").value = "";

    alert("Announcement created successfully!");
  } catch (error) {
    console.error("Error creating announcement:", error);
    alert(`Failed to create announcement: ${error.message}`);
  }
};
