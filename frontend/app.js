// ==========================================
// StudyHub - Main App JavaScript
// This file handles everything on the dashboard:
//   - checking if user is logged in
//   - switching between panels (chat, tasks, etc)
//   - study chat (sending and loading messages)
//   - task manager (add, delete, filter tasks)
//   - pomodoro timer (start, pause, reset)
//   - resources (upload and download files)
// ==========================================

// this is the path to our API folder
var API = '../api';

// this stores the current user's info (like username, email, etc)
var currentUser = null;

// this is the login token we use to prove we are logged in
var token = null;

// which panel is currently showing (chat, tasks, pomodoro, or resources)
var currentPanel = 'chat';

// which chat room are we in right now
var currentRoom = 'general';

// this array stores all the tasks we loaded from the server
var allTasks = [];

// what filter is currently active for tasks (all, pending, completed, etc)
var taskFilter = 'all';

// pomodoro timer variables
var timerInterval = null;      // the setInterval id
var timeLeft = 25 * 60;        // time remaining in seconds (starts at 25 min)
var isRunning = false;          // is the timer currently running?
var timerType = 'work';        // what type of session (work, short_break, long_break)
var timerMinutes = 25;          // how many minutes for the current session


// ==========================================
// CHECK IF THE USER IS LOGGED IN
// if not, send them to the login page
// ==========================================
function checkLogin() {
    // try to get the token from localStorage
    token = localStorage.getItem('studyhub_token');

    // try to get the user data from localStorage
    var userData = localStorage.getItem('studyhub_user');

    // if there is no token or no user data, go to login
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }

    if (!userData) {
        window.location.href = 'login.html';
        return false;
    }

    // parse the user data from JSON string to an object
    currentUser = JSON.parse(userData);

    // now update the sidebar to show the user's info
    var avatarElement = $('#user-avatar');
    var nameElement = $('#user-display-name');
    var emailElement = $('#user-display-email');

    // set the avatar letter (first letter of username, capitalized)
    if (avatarElement.length > 0) {
        var firstLetter = currentUser.username[0].toUpperCase();
        avatarElement.text(firstLetter);

        // set the avatar background color
        var avatarColor = currentUser.avatar_color;
        if (!avatarColor) {
            avatarColor = '#6C63FF'; // default purple
        }
        avatarElement.css('background', avatarColor);
    }

    // set the username text
    if (nameElement.length > 0) {
        nameElement.text(currentUser.username);
    }

    // set the email text
    if (emailElement.length > 0) {
        emailElement.text(currentUser.email);
    }

    return true;
}


// ==========================================
// LOG OUT - clear everything and go to login
// ==========================================
function logout() {
    localStorage.removeItem('studyhub_token');
    localStorage.removeItem('studyhub_user');
    window.location.href = 'login.html';
}


// ==========================================
// HELPER FUNCTION: Make API requests
// This function sends requests to our PHP backend
// url = the endpoint (like /messages.php)
// method = GET, POST, PUT, DELETE
// body = data to send (for POST/PUT)
// callback = function to call when we get a response
// ==========================================
function callAPI(url, method, body, callback) {
    // set up the ajax options
    var ajaxOptions = {
        url: API + url,
        method: method,
        headers: {
            'Authorization': 'Bearer ' + token
        }
    };

    // if we have a body, add it as JSON
    if (body) {
        ajaxOptions.contentType = 'application/json';
        ajaxOptions.data = JSON.stringify(body);
    }

    // what to do when the request succeeds
    ajaxOptions.success = function (data) {
        if (callback) {
            callback(data);
        }
    };

    // what to do when the request fails
    ajaxOptions.error = function (xhr) {
        console.log('API Error:', xhr.responseText);
    };

    // send the request!
    $.ajax(ajaxOptions);
}


// ==========================================
// PANEL NAVIGATION
// This is called when user clicks a sidebar item
// It hides all panels and shows the selected one
// ==========================================

// normalize panel names, so "common-task" and "other" still work
function normalizePanelName(panel) {
    var normalized = '';

    if (typeof panel === 'string') {
        normalized = panel.trim().toLowerCase();
    }

    // common aliases for tasks
    if (normalized === 'task') {
        normalized = 'tasks';
    }
    if (normalized === 'taskmanager') {
        normalized = 'tasks';
    }
    if (normalized === 'task-manager') {
        normalized = 'tasks';
    }

    // common aliases for common tasks
    if (normalized === 'common-task') {
        normalized = 'common';
    }
    if (normalized === 'common_tasks') {
        normalized = 'common';
    }
    if (normalized === 'common-tasks') {
        normalized = 'common';
    }
    if (normalized === 'commontask') {
        normalized = 'common';
    }

    // common aliases for resources / other tab wording
    if (normalized === 'resource') {
        normalized = 'resources';
    }
    if (normalized === 'files') {
        normalized = 'resources';
    }
    if (normalized === 'other') {
        normalized = 'resources';
    }

    // common aliases for pomodoro
    if (normalized === 'pomo') {
        normalized = 'pomodoro';
    }
    if (normalized === 'timer') {
        normalized = 'pomodoro';
    }

    // fallback
    if (!normalized) {
        normalized = 'chat';
    }

    return normalized;
}

// check if a panel element exists in HTML
function panelExists(panelName) {
    var panelId = '#panel-' + panelName;
    return $(panelId).length > 0;
}

// load panel data in one place
function loadDataForPanel(panelName) {
    if (panelName === 'chat') {
        loadMessages();
        return;
    }
    if (panelName === 'tasks') {
        loadTasks();
        return;
    }
    if (panelName === 'pomodoro') {
        loadPomodoroStats();
        return;
    }
    if (panelName === 'common') {
        loadCommonTasks();
        return;
    }
    if (panelName === 'resources') {
        loadResources();
        return;
    }
}

function switchPanel(panel) {
    // make sure we are using a known panel name
    var panelName = normalizePanelName(panel);

    // if panel doesn't exist in the page, go back to chat
    if (!panelExists(panelName)) {
        panelName = 'chat';
    }

    // first, hide ALL panels by removing the 'active' class
    $('.panel').removeClass('active');

    // remove 'active' from ALL sidebar items
    $('.sidebar-item').removeClass('active');

    // now show the panel that was clicked
    var panelId = '#panel-' + panelName;
    $(panelId).addClass('active');

    // highlight the sidebar item that was clicked
    var navId = '#nav-' + panelName;
    $(navId).addClass('active');

    // remember which panel is now showing
    currentPanel = panelName;

    // load the data for whatever panel we just switched to
    loadDataForPanel(panelName);
}


// ==========================================
// STUDY CHAT - sending and receiving messages
// ==========================================

// switch to a different chat room
function switchRoom(room) {
    // update the current room variable
    currentRoom = room;

    // remove active class from all room buttons
    $('.chat-room-btn').removeClass('active');

    // add active class to the button that was clicked
    $(event.target).addClass('active');

    // update the room label badge
    $('#chat-room-label').text('# ' + room);

    // load messages for this new room
    loadMessages();
}

// load all messages from the server for the current room
function loadMessages() {
    var url = '/messages.php?room=' + currentRoom;

    callAPI(url, 'GET', null, function (data) {
        // get the messages container element
        var messagesContainer = $('#chat-messages');

        // get the messages array from the response
        var messages = data.messages;
        if (!messages) {
            messages = [];
        }

        // if there are no messages, show a welcome message
        if (messages.length === 0) {
            var welcomeHtml = '<div style="text-align:center; color:#6a6a8a; padding:40px;">';
            welcomeHtml = welcomeHtml + 'Welcome to #' + currentRoom + '! Start chatting 🎉';
            welcomeHtml = welcomeHtml + '</div>';
            messagesContainer.html(welcomeHtml);
            return;
        }

        // build the HTML for all the messages
        var html = '';
        var i = 0;
        while (i < messages.length) {
            var msg = messages[i];

            // get the avatar color, default to purple
            var avatarColor = msg.avatar_color;
            if (!avatarColor) {
                avatarColor = '#6C63FF';
            }

            // get the first letter of the sender's name
            var firstLetter = msg.sender_name[0].toUpperCase();

            // build the HTML for this message
            html = html + '<div class="chat-message">';
            html = html + '  <div class="chat-message-avatar" style="background:' + avatarColor + '">';
            html = html + '    ' + firstLetter;
            html = html + '  </div>';
            html = html + '  <div class="chat-message-content">';
            html = html + '    <div class="chat-message-header">';
            html = html + '      <span class="chat-message-name">' + escapeHtml(msg.sender_name) + '</span>';
            html = html + '      <span class="chat-message-time">' + timeAgo(msg.created_at) + '</span>';
            html = html + '    </div>';
            html = html + '    <div class="chat-message-text">' + escapeHtml(msg.content) + '</div>';
            html = html + '  </div>';
            html = html + '</div>';

            i = i + 1;
        }

        // put the HTML into the container
        messagesContainer.html(html);

        // scroll to the bottom so we can see the newest messages
        messagesContainer[0].scrollTop = messagesContainer[0].scrollHeight;
    });
}

// send a new message
function sendMessage() {
    // get the input element
    var inputElement = $('#chat-input');

    // get the text and remove whitespace from start/end
    var messageText = inputElement.val().trim();

    // if the message is empty, do nothing
    if (!messageText) {
        return;
    }

    // clear the input field
    inputElement.val('');

    // create the data to send
    var messageData = {
        content: messageText,
        room: currentRoom
    };

    // send it to the server, then reload messages
    callAPI('/messages.php', 'POST', messageData, function () {
        loadMessages();
    });
}


// ==========================================
// TASK MANAGER - add, view, delete tasks
// ==========================================

// load all tasks from the server
function loadTasks() {
    callAPI('/tasks.php', 'GET', null, function (data) {
        // save the tasks to our global array
        if (data.tasks) {
            allTasks = data.tasks;
        } else {
            allTasks = [];
        }

        // display them on the page
        showTasks();
    });
}

// display the tasks on the page (with filtering)
function showTasks() {
    var taskListContainer = $('#task-list');

    // figure out which tasks to show based on the filter
    var tasksToShow = [];

    if (taskFilter === 'all') {
        // show all tasks
        tasksToShow = allTasks;
    } else {
        // only show tasks that match the filter
        var i = 0;
        while (i < allTasks.length) {
            if (allTasks[i].status === taskFilter) {
                tasksToShow.push(allTasks[i]);
            }
            i = i + 1;
        }
    }

    // if there are no tasks to show
    if (tasksToShow.length === 0) {
        var emptyMessage = '<div style="text-align:center; color:#6a6a8a; padding:40px;">';
        emptyMessage = emptyMessage + 'No tasks yet! Click "+ Add Task" 📝';
        emptyMessage = emptyMessage + '</div>';
        taskListContainer.html(emptyMessage);
        return;
    }

    // build the HTML for each task
    var html = '';
    var i = 0;
    while (i < tasksToShow.length) {
        var task = tasksToShow[i];

        // is this task completed?
        var isDone = false;
        if (task.status === 'completed') {
            isDone = true;
        }

        // figure out the badge color based on priority
        var priorityBadgeColor = 'badge-orange'; // default for medium
        if (task.priority === 'low') {
            priorityBadgeColor = 'badge-green';
        }
        if (task.priority === 'high') {
            priorityBadgeColor = 'badge-red';
        }

        // figure out the checkbox class
        var checkboxClass = 'task-checkbox';
        if (isDone) {
            checkboxClass = 'task-checkbox checked';
        }

        // figure out the next status when checkbox is clicked
        var nextStatus = 'completed';
        if (isDone) {
            nextStatus = 'pending';
        }

        // figure out the title style (strikethrough if done)
        var titleStyle = '';
        if (isDone) {
            titleStyle = 'text-decoration:line-through; opacity:0.5';
        }

        // build the task item HTML
        html = html + '<div class="task-item">';
        html = html + '  <div class="' + checkboxClass + '" onclick="toggleTask(' + task.id + ', \'' + nextStatus + '\')"></div>';
        html = html + '  <div class="task-info">';
        html = html + '    <div class="task-title" style="' + titleStyle + '">' + escapeHtml(task.title) + '</div>';
        html = html + '    <div class="task-meta">';

        // add due date if it exists
        if (task.due_date) {
            html = html + '      <span>📅 ' + formatDate(task.due_date) + '</span>';
        }

        html = html + '      <span class="badge ' + priorityBadgeColor + '">' + task.priority + '</span>';
        html = html + '    </div>';
        html = html + '  </div>';
        html = html + '  <button class="btn btn-secondary btn-icon btn-sm" onclick="deleteTask(' + task.id + ')">🗑️</button>';
        html = html + '</div>';

        i = i + 1;
    }

    taskListContainer.html(html);
}

// show or hide the add task form
function toggleAddTask() {
    $('#add-task-form').toggleClass('show');
}

// add a new task
function addTask() {
    // get the title from the input
    var taskTitle = $('#task-title-input').val().trim();

    // make sure the title is not empty
    if (!taskTitle) {
        return;
    }

    // get the other fields
    var taskDescription = $('#task-desc-input').val();
    var taskDueDate = $('#task-date-input').val();
    var taskPriority = $('#task-priority-input').val();

    // create the data object
    var taskData = {
        title: taskTitle,
        description: taskDescription,
        due_date: taskDueDate,
        priority: taskPriority
    };

    // send it to the server
    callAPI('/tasks.php', 'POST', taskData, function () {
        // clear the form fields
        $('#task-title-input').val('');
        $('#task-desc-input').val('');
        $('#task-date-input').val('');

        // hide the form
        toggleAddTask();

        // reload the tasks
        loadTasks();
    });
}

// toggle a task between completed and pending
function toggleTask(taskId, newStatus) {
    var updateData = {
        status: newStatus
    };

    callAPI('/tasks.php?id=' + taskId, 'PUT', updateData, function () {
        loadTasks();
    });
}

// delete a task
function deleteTask(taskId) {
    // ask the user if they are sure
    var userSaidYes = confirm('Delete this task?');
    if (!userSaidYes) {
        return;
    }

    callAPI('/tasks.php?id=' + taskId, 'DELETE', null, function () {
        loadTasks();
    });
}

// filter tasks by status
function filterTasks(filter, buttonElement) {
    // update the global filter variable
    taskFilter = filter;

    // remove active from all filter buttons
    $('.task-filter-btn').removeClass('active');

    // add active to the clicked button
    $(buttonElement).addClass('active');

    // re-display the tasks with the new filter
    showTasks();
}


// ==========================================
// POMODORO TIMER
// ==========================================

// set the timer to a specific type and duration
function setPomodoro(type, minutes, buttonElement) {
    // don't change settings while timer is running
    if (isRunning) {
        return;
    }

    // update the variables
    timerType = type;
    timerMinutes = minutes;
    timeLeft = minutes * 60;

    // update the tab buttons
    $('.pomodoro-tab').removeClass('active');
    $(buttonElement).addClass('active');

    // update the display
    updateTimerDisplay();

    // update the label text
    if (type === 'work') {
        $('#pomo-label').text('Focus Session');
    }
    if (type === 'short_break') {
        $('#pomo-label').text('Short Break');
    }
    if (type === 'long_break') {
        $('#pomo-label').text('Long Break');
    }
}

// start or pause the timer
function togglePomodoro() {
    if (isRunning) {
        // PAUSE the timer
        clearInterval(timerInterval);
        isRunning = false;
        $('#pomo-toggle-btn').text('▶ Resume');
        $('#pomo-circle').removeClass('running');
    } else {
        // START the timer
        isRunning = true;
        $('#pomo-toggle-btn').text('⏸ Pause');
        $('#pomo-circle').addClass('running');

        timerInterval = setInterval(function () {
            // subtract one second
            timeLeft = timeLeft - 1;

            // update the display
            updateTimerDisplay();

            // check if the timer reached zero
            if (timeLeft <= 0) {
                // stop the timer
                clearInterval(timerInterval);
                isRunning = false;
                $('#pomo-toggle-btn').text('▶ Start');
                $('#pomo-circle').removeClass('running');

                // save the session to the server
                var sessionData = {
                    duration: timerMinutes,
                    session_type: timerType
                };
                callAPI('/pomodoro.php', 'POST', sessionData, function () {
                    loadPomodoroStats();
                });

                // show an alert to the user
                if (timerType === 'work') {
                    alert('🎉 Focus session complete!');
                } else {
                    alert('☕ Break session complete!');
                }

                // switch to the next mode
                if (timerType === 'work') {
                    // after work, switch to short break
                    var shortBreakButton = $('.pomodoro-tab').eq(1)[0];
                    setPomodoro('short_break', 5, shortBreakButton);
                } else {
                    // after break, switch to work
                    var workButton = $('.pomodoro-tab').eq(0)[0];
                    setPomodoro('work', 25, workButton);
                }
            }
        }, 1000); // run every 1000 milliseconds (1 second)
    }
}

// reset the timer back to the starting time
function resetPomodoro() {
    // stop the timer if it's running
    clearInterval(timerInterval);
    isRunning = false;

    // reset the time
    timeLeft = timerMinutes * 60;

    // update the display
    updateTimerDisplay();

    // reset the button text
    $('#pomo-toggle-btn').text('▶ Start');

    // remove the running animation
    $('#pomo-circle').removeClass('running');
}

// update the timer display to show the current time
function updateTimerDisplay() {
    // calculate minutes and seconds
    var minutes = Math.floor(timeLeft / 60);
    var seconds = timeLeft % 60;

    // add leading zeros if needed
    var minutesText = '';
    if (minutes < 10) {
        minutesText = '0' + minutes;
    } else {
        minutesText = '' + minutes;
    }

    var secondsText = '';
    if (seconds < 10) {
        secondsText = '0' + seconds;
    } else {
        secondsText = '' + seconds;
    }

    // put it together: "25:00"
    var displayText = minutesText + ':' + secondsText;

    // update the element
    $('#pomo-time').text(displayText);
}

// load the pomodoro stats from the server
function loadPomodoroStats() {
    callAPI('/pomodoro.php', 'GET', null, function (data) {
        var stats = data.stats;
        if (!stats) {
            stats = {};
        }

        // update the stat cards
        var todaySessions = stats.today_sessions;
        if (!todaySessions) {
            todaySessions = 0;
        }
        $('#pomo-today-sessions').text(todaySessions);

        var todayMinutes = stats.today_minutes;
        if (!todayMinutes) {
            todayMinutes = 0;
        }
        $('#pomo-today-minutes').text(todayMinutes);

        var totalSessions = stats.total_sessions;
        if (!totalSessions) {
            totalSessions = 0;
        }
        $('#pomo-total-sessions').text(totalSessions);
    });
}


// ==========================================
// COMMON TASKS - shared with everyone
// ==========================================

// load all shared tasks from the server
function loadCommonTasks() {
    callAPI('/common_tasks.php', 'GET', null, function (data) {
        var commonList = $('#common-task-list');
        var tasks = data.tasks || [];

        if (tasks.length === 0) {
            commonList.html('<div style="text-align:center; color:#6a6a8a; padding:40px;">No common tasks yet. Be the first to post! 📢</div>');
            return;
        }

        var html = '';
        var i = 0;
        while (i < tasks.length) {
            var task = tasks[i];

            var priorityBadge = 'badge-orange';
            if (task.priority === 'low') priorityBadge = 'badge-green';
            if (task.priority === 'high') priorityBadge = 'badge-red';

            var isOwner = (currentUser && currentUser.id == task.user_id);

            html = html + '<div class="task-item" style="align-items:flex-start;">';
            html = html + '  <div class="task-info" style="flex:1;">';
            html = html + '    <div class="task-title">' + escapeHtml(task.title) + '</div>';
            html = html + '    <div class="task-meta">';
            if (task.due_date) html = html + '<span>📅 ' + formatDate(task.due_date) + '</span>';
            html = html + '      <span class="badge ' + priorityBadge + '">' + task.priority + '</span>';
            html = html + '      <span style="color:#6a6a8a;">by <strong>' + escapeHtml(task.username) + '</strong></span>';
            html = html + '    </div>';
            if (task.description) {
                html = html + '    <div style="font-size:0.85rem; color:#6a6a8a; margin-top:8px;">' + escapeHtml(task.description).replace(/\n/g, '<br>') + '</div>';
            }
            html = html + '  </div>';

            if (isOwner) {
                html = html + '  <button class="btn btn-secondary btn-icon btn-sm" onclick="deleteCommonTask(' + task.id + ')">🗑️</button>';
            }

            html = html + '</div>';
            i = i + 1;
        }
        commonList.html(html);
    });
}

// show/hide add common task form
function toggleAddCommonTask() {
    $('#add-common-form').toggleClass('show');
}

// add a new shared task
function addCommonTask() {
    var title = $('#common-title-input').val().trim();
    if (!title) return;

    var commonData = {
        title: title,
        description: $('#common-desc-input').val(),
        due_date: $('#common-date-input').val(),
        priority: $('#common-priority-input').val()
    };

    callAPI('/common_tasks.php', 'POST', commonData, function () {
        $('#common-title-input').val('');
        $('#common-desc-input').val('');
        $('#common-date-input').val('');
        toggleAddCommonTask();
        loadCommonTasks();
    });
}

// delete a shared task
function deleteCommonTask(taskId) {
    if (!confirm('Delete this shared task?')) return;
    callAPI('/common_tasks.php?id=' + taskId, 'DELETE', null, loadCommonTasks);
}


// ==========================================
// RESOURCES - upload and share files
// ==========================================

// show or hide the upload form
function toggleUploadForm() {
    $('#upload-form').toggleClass('show');
}

// upload a file to the server
function uploadResource() {
    // get the title
    var resourceTitle = $('#resource-title-input').val().trim();

    // get the category
    var resourceCategory = $('#resource-category-input').val();

    // get the file input element
    var fileInputElement = $('#resource-file-input')[0];

    // make sure the title is not empty
    if (!resourceTitle) {
        alert('Please enter a title');
        return;
    }

    // make sure a file was selected
    if (!fileInputElement.files || fileInputElement.files.length === 0) {
        alert('Please select a file');
        return;
    }

    // get the selected file
    var selectedFile = fileInputElement.files[0];

    // create a FormData object (needed for file uploads)
    var formData = new FormData();
    formData.append('title', resourceTitle);
    formData.append('category', resourceCategory);
    formData.append('file', selectedFile);

    // get the upload button so we can show loading state
    var uploadButton = $('#upload-btn');
    uploadButton.html('<span class="spinner"></span> Uploading...');
    uploadButton.prop('disabled', true);

    // send the file to the server
    $.ajax({
        url: API + '/resources.php',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        data: formData,
        processData: false,    // don't process the data (because it's a file)
        contentType: false,    // don't set content type (browser handles it)
        success: function (data) {
            // clear the form
            $('#resource-title-input').val('');
            $('#resource-file-input').val('');

            // hide the form
            toggleUploadForm();

            // reload the resources list
            loadResources();
        },
        error: function (xhr) {
            // show error message
            var response = xhr.responseJSON;
            if (!response) {
                response = {};
            }
            var errorMessage = response.error;
            if (!errorMessage) {
                errorMessage = 'Upload failed';
            }
            alert(errorMessage);
        },
        complete: function () {
            // reset the button back to normal
            uploadButton.html('Upload');
            uploadButton.prop('disabled', false);
        }
    });
}

// load all resources from the server
function loadResources() {
    callAPI('/resources.php', 'GET', null, function (data) {
        // get the resources array
        var resources = data.resources;
        if (!resources) {
            resources = [];
        }

        // get the container element
        var resourceContainer = $('#resource-list');

        // if there are no resources, show empty message
        if (resources.length === 0) {
            var emptyHtml = '<div style="text-align:center; color:#6a6a8a; padding:40px;">';
            emptyHtml = emptyHtml + 'No resources yet. Be the first to share! 📄';
            emptyHtml = emptyHtml + '</div>';
            resourceContainer.html(emptyHtml);
            return;
        }

        // build HTML for each resource
        var html = '';
        var i = 0;
        while (i < resources.length) {
            var resource = resources[i];

            // pick an icon based on file type
            var fileIcon = '📎'; // default icon
            if (resource.file_type === 'application/pdf') {
                fileIcon = '📄';
            }
            if (resource.file_type === 'image/jpeg' || resource.file_type === 'image/png' || resource.file_type === 'image/gif' || resource.file_type === 'image/webp') {
                fileIcon = '🖼️';
            }
            if (resource.file_type === 'application/msword' || resource.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                fileIcon = '📝';
            }
            if (resource.file_type === 'application/vnd.ms-excel' || resource.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                fileIcon = '📊';
            }
            if (resource.file_type === 'application/vnd.ms-powerpoint' || resource.file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                fileIcon = '📽️';
            }
            if (resource.file_type === 'text/plain') {
                fileIcon = '📃';
            }
            if (resource.file_type === 'application/zip' || resource.file_type === 'application/x-rar-compressed') {
                fileIcon = '🗜️';
            }

            // pick a badge color based on category
            var categoryBadge = 'badge-primary'; // default
            if (resource.category === 'textbook') {
                categoryBadge = 'badge-green';
            }
            if (resource.category === 'assignment') {
                categoryBadge = 'badge-orange';
            }
            if (resource.category === 'presentation') {
                categoryBadge = 'badge-red';
            }

            // format the file size nicely
            var sizeText = formatFileSize(resource.file_size);

            // check if this resource belongs to the current user
            var isOwner = false;
            if (currentUser && currentUser.id == resource.user_id) {
                isOwner = true;
            }

            // build the HTML
            html = html + '<div class="task-item" style="align-items:flex-start;">';
            html = html + '  <div style="font-size:1.8rem; margin-right:4px;">' + fileIcon + '</div>';
            html = html + '  <div class="task-info" style="flex:1;">';
            html = html + '    <div class="task-title">' + escapeHtml(resource.title) + '</div>';
            html = html + '    <div class="task-meta">';
            html = html + '      <span class="badge ' + categoryBadge + '">' + escapeHtml(resource.category) + '</span>';
            html = html + '      <span style="color:#6a6a8a;">' + sizeText + '</span>';
            html = html + '      <span style="color:#6a6a8a;">by <strong>' + escapeHtml(resource.username) + '</strong></span>';
            html = html + '      <span style="color:#6a6a8a;">' + timeAgo(resource.created_at) + '</span>';
            html = html + '    </div>';
            html = html + '  </div>';
            html = html + '  <div style="display:flex; gap:6px;">';
            html = html + '    <a href="../' + resource.file_path + '" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none;">⬇ Download</a>';

            // only show delete button if the current user uploaded this
            if (isOwner) {
                html = html + '    <button class="btn btn-secondary btn-icon btn-sm" onclick="deleteResource(' + resource.id + ')">🗑️</button>';
            }

            html = html + '  </div>';
            html = html + '</div>';

            i = i + 1;
        }

        resourceContainer.html(html);
    });
}

// delete a resource
function deleteResource(resourceId) {
    var userSaidYes = confirm('Delete this resource?');
    if (!userSaidYes) {
        return;
    }

    callAPI('/resources.php?id=' + resourceId, 'DELETE', null, function () {
        loadResources();
    });
}

// format file size from bytes to a readable string
function formatFileSize(bytes) {
    // make sure bytes is a number
    bytes = parseInt(bytes);
    if (!bytes) {
        bytes = 0;
    }

    // if the file size is 0, just return "0 B"
    if (bytes === 0) {
        return '0 B';
    }

    // figure out the right unit
    if (bytes < 1024) {
        return bytes + ' B';
    }
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    }
    if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}


// ==========================================
// HELPER FUNCTIONS
// ==========================================

// escapeHtml - prevent HTML injection by escaping special characters
// this is important for security!
function escapeHtml(text) {
    var tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    return tempDiv.innerHTML;
}

// timeAgo - turn a date string into "5m ago", "2h ago", etc
function timeAgo(dateString) {
    var theDate = new Date(dateString);
    var rightNow = new Date();

    // calculate how many minutes ago it was
    var differenceInMs = rightNow - theDate;
    var minutesAgo = Math.floor(differenceInMs / 60000);

    // less than 1 minute ago
    if (minutesAgo < 1) {
        return 'just now';
    }

    // less than 1 hour ago (show minutes)
    if (minutesAgo < 60) {
        return minutesAgo + 'm ago';
    }

    // less than 1 day ago (show hours)
    if (minutesAgo < 1440) {
        var hoursAgo = Math.floor(minutesAgo / 60);
        return hoursAgo + 'h ago';
    }

    // more than 1 day ago (show the date)
    return theDate.toLocaleDateString();
}

// formatDate - make a date string look nice
function formatDate(dateString) {
    if (!dateString) {
        return '';
    }

    var theDate = new Date(dateString);
    var options = {
        month: 'short',
        day: 'numeric'
    };
    return theDate.toLocaleDateString('en-US', options);
}


// ==========================================
// START EVERYTHING WHEN THE PAGE LOADS
// ==========================================
$(document).ready(function () {
    // first check if the user is logged in
    var isLoggedIn = checkLogin();

    // if they are logged in, set the default panel
    if (isLoggedIn) {
        switchPanel('chat');
    }
});
