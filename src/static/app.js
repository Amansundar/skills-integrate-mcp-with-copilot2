document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortBy = document.getElementById("sortBy");
  const searchInput = document.getElementById("searchInput");
  const resetFiltersBtn = document.getElementById("resetFilters");
  const userIcon = document.getElementById("userIcon");
  const loginModal = document.getElementById("loginModal");
  const closeLoginBtn = document.getElementById("closeLoginBtn");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  let allActivities = {};
  let authToken = localStorage.getItem("authToken");
  let loggedInUser = localStorage.getItem("loggedInUser");

  // Update user icon based on auth status
  function updateUserIcon() {
    if (loggedInUser) {
      userIcon.textContent = "✅";
      userIcon.title = `Logged in as: ${loggedInUser}`;
    } else {
      userIcon.textContent = "👨‍🏫";
      userIcon.title = "Teacher Login";
    }
  }

  // User icon click handler
  userIcon.addEventListener("click", () => {
    if (loggedInUser) {
      logoutTeacher();
    } else {
      loginModal.classList.add("open");
    }
  });

  // Login form handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      if (response.ok) {
        const result = await response.json();
        authToken = result.token;
        loggedInUser = result.username;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("loggedInUser", loggedInUser);

        loginMessage.textContent = `Welcome, ${username}!`;
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");

        setTimeout(() => {
          loginModal.classList.remove("open");
          loginForm.reset();
          updateUserIcon();
          fetchActivities();
        }, 1500);
      } else {
        loginMessage.textContent = "Invalid credentials";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  closeLoginBtn.addEventListener("click", () => {
    loginModal.classList.remove("open");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  function logoutTeacher() {
    if (authToken) {
      fetch(`/logout?token=${encodeURIComponent(authToken)}`, { method: "POST" });
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("loggedInUser");
    authToken = null;
    loggedInUser = null;
    updateUserIcon();
    showMessage("Logged out successfully", "success");
    fetchActivities();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      renderActivities();
      updateActivityDropdown();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Render activities with filtering and sorting
  function renderActivities() {
    activitiesList.innerHTML = "";

    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const sortOption = sortBy.value;

    // Filter and transform activities
    let filtered = Object.entries(allActivities)
      .filter(([name, details]) => {
        const matchesSearch =
          name.toLowerCase().includes(searchTerm) ||
          (details.description || "").toLowerCase().includes(searchTerm);
        const matchesCategory =
          !selectedCategory || details.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .map(([name, details]) => ({ name, ...details }));

    // Sort activities
    if (sortOption === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "name-desc") {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === "availability") {
      filtered.sort(
        (a, b) =>
          (b.max_participants - b.participants.length) -
          (a.max_participants - a.participants.length)
      );
    } else if (sortOption === "availability-desc") {
      filtered.sort(
        (a, b) =>
          (a.max_participants - a.participants.length) -
          (b.max_participants - b.participants.length)
      );
    }

    // Render filtered and sorted activities
    if (filtered.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your search.</p>";
      return;
    }

    filtered.forEach((activity) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = activity.max_participants - activity.participants.length;
      const isFull = spotsLeft === 0;

      const participantsHTML =
        activity.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants (${activity.participants.length}/${activity.max_participants}):</h5>
            <ul class="participants-list">
              ${activity.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span>${
                      loggedInUser
                        ? `<button class="delete-btn" data-activity="${activity.name}" data-email="${email}">❌</button>`
                        : ""
                    }</li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      const availabilityClass = isFull ? "full" : "";
      const availabilityText = isFull
        ? "Activity Full"
        : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`;

      activityCard.innerHTML = `
        <h4>${activity.name}</h4>
        <span class="category-badge">${activity.category}</span>
        <p>${activity.description}</p>
        <p><strong>Schedule:</strong> ${activity.schedule}</p>
        <p><strong>Availability:</strong> <span class="availability ${availabilityClass}">${availabilityText}</span></p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
        ${
          !isFull
            ? `<button class="activity-signup-btn" data-activity="${activity.name}" style="margin-top: 10px; width: 100%;">Quick Sign Up</button>`
            : ""
        }
      `;

      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    // Add event listeners to quick signup buttons
    document.querySelectorAll(".activity-signup-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const activityName = button.getAttribute("data-activity");
        document.getElementById("activity").value = activityName;
        document.getElementById("signup-section").scrollIntoView({ behavior: "smooth" });
        document.getElementById("email").focus();
      });
    });
  }

  function updateActivityDropdown() {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(allActivities)
      .sort()
      .forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    if (!loggedInUser) {
      showMessage("Only logged-in teachers can unregister students", "error");
      return;
    }

    if (!confirm("Are you sure you want to unregister this student?")) {
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}&token=${encodeURIComponent(authToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle form submission (signup)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!activity) {
      showMessage("Please select an activity", "error");
      return;
    }

    try {
      const params = new URLSearchParams({
        email: email,
      });
      if (loggedInUser) {
        params.append("token", authToken);
      }

      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Filter event listeners
  categoryFilter.addEventListener("change", renderActivities);
  sortBy.addEventListener("change", renderActivities);
  searchInput.addEventListener("input", renderActivities);
  resetFiltersBtn.addEventListener("click", () => {
    categoryFilter.value = "";
    sortBy.value = "name";
    searchInput.value = "";
    renderActivities();
  });

  // Initial load
  updateUserIcon();
  fetchActivities();
});
