import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { Calendar } from 'https://cdn.skypack.dev/@fullcalendar/core';
import dayGridPlugin from 'https://cdn.skypack.dev/@fullcalendar/daygrid';

// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyCVVZ_NNzbjpDCFiKIvF4zIiu6c-0t7OBU",
    authDomain: "to-do-credentials.firebaseapp.com",
    databaseURL: "https://to-do-credentials-default-rtdb.firebaseio.com",
    projectId: "to-do-credentials",
    storageBucket: "to-do-credentials.appspot.com",
    messagingSenderId: "845811111535",
    appId: "1:845811111535:web:9b6ac503b51a456339df9a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// DOM elements 
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const navbar = document.getElementById('navbar');
const calendarEl = document.getElementById('calendar');

// Function to populate navbar based on user authentication status
function populateNavbar(user) {
    navbar.innerHTML = '';
    if (user) {
        const todoListLink = document.createElement('li');
        todoListLink.style.listStyle = 'none';
        todoListLink.innerHTML = '<a href="#">To-Do List Manager</a>';
        navbar.appendChild(todoListLink);
        const logoutLink = document.createElement('li');
        logoutLink.style.listStyle = 'none';
        logoutLink.innerHTML = '<a href="#" id="logout">Logout</a>';
        navbar.appendChild(logoutLink);

        document.getElementById('logout').addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                console.log("User signed out.");
            }).catch((error) => {
                console.error("Error signing out: ", error);
            });
        });
    } else {
        const signinLink = document.createElement('li');
        signinLink.innerHTML = '<a href="sign-in.html">Sign In</a>';
        signinLink.style.listStyle = "none";
        navbar.appendChild(signinLink);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Redirect to sign-in page if not signed in
            window.location.href = "sign-in.html";
        } else {
            console.log("User is signed in: ", user.uid);
            populateNavbar(user);
            fetchTasks(); // Load tasks when user is signed in
        }
    });
    const calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: [dayGridPlugin],
        initialView: 'dayGridMonth',
        events: [], // Start with an empty array
        eventDidMount: function (info) {
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.innerHTML = `<strong>${info.event.title}</strong><br>${info.event.start.toLocaleString()} ${info.event.extendedProps.deadlineTime || ''}`;
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '5px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
    
            info.el.addEventListener('mouseenter', function (e) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
            });
    
            info.el.addEventListener('mouseleave', function () {
                tooltip.style.display = 'none';
            });
        },
        eventContent: function (arg) {
            // Return empty or minimal content to avoid displaying task text directly
            return { html: '' }; // No content displayed on the calendar cell
        }
    });
    
    calendar.render();

    taskForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const taskInput = document.getElementById("taskInput");
        const dateTimeInput = document.getElementById("dateTimeInput");
        const task = taskInput.value.trim();
        const deadline = new Date(dateTimeInput.value);

        if (task && deadline) {
            try {
                await addDoc(collection(db, 'tasks'), {
                    task: task,
                    deadline: deadline.toISOString(),
                    completed: false,
                    userId: auth.currentUser.uid
                });
                taskInput.value = '';
                dateTimeInput.value = '';
            } catch (error) {
                console.error("Error adding task: ", error);
            }
        }
    });

    function addTaskToList(task, deadline, completed, taskId) {
        const li = document.createElement("li");
        li.className = "task-item";
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${completed ? 'checked' : ''}>
            <span ${completed ? 'class="completed"' : ''}>${task} - ${deadline.toLocaleString()}</span>
            <button class="delete-button">Delete</button>
        `;
    
        li.querySelector(".task-checkbox").addEventListener("change", async function () {
            const isChecked = this.checked;
            try {
                await updateDoc(doc(db, 'tasks', taskId), { completed: isChecked });
            } catch (error) {
                console.error("Error updating task: ", error);
            }
            li.querySelector('span').classList.toggle('completed', isChecked);
        });
    
        li.querySelector(".delete-button").addEventListener("click", async function () {
            try {
                await deleteDoc(doc(db, 'tasks', taskId));
                taskList.removeChild(li);
            } catch (error) {
                console.error("Error deleting task: ", error);
            }
        });
    
        taskList.appendChild(li);
    }    

    function fetchTasks() {
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, orderBy('deadline'));

        onSnapshot(q, (snapshot) => {
            taskList.innerHTML = '';
            calendar.getEvents().forEach(event => event.remove());
            snapshot.forEach((doc) => {
                const task = doc.data();
                const taskDeadline = new Date(task.deadline);

                // Add task to the list
                addTaskToList(task.task, taskDeadline, task.completed, doc.id);

                // Add task to calendar
                calendar.addEvent({
                    id: doc.id,
                    title: task.task,
                    start: taskDeadline,
                    allDay: true,
                    backgroundColor: task.completed ? 'green' : 'red'
                });
            });
        });
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            populateNavbar(user);
            fetchTasks(); // Load tasks when user is signed in
        } else {
            populateNavbar(null);
            taskList.innerHTML = "<li>Please sign in to see your tasks.</li>";
        }
    });
});

