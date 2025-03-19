const API_URL = "http://localhost:5000";

// ✅ Login Function
function login() {
    const email = document.getElementById("email").value;
    
    if (!email) {
        alert("⚠ Please enter your email!");
        return;
    }

    fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message.includes("OTP sent")) {
            alert("✅ OTP Sent!");
            localStorage.setItem("userEmail", email);
            window.location.href = "verify.html";
        } else {
            alert("❌ Login failed! Please check your email.");
        }
    })
    .catch(error => console.error("Error:", error));
}

// ✅ OTP Verification Function
function verifyOTP() {
    const email = localStorage.getItem("userEmail");
    const otp = document.getElementById("otp").value;

    fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message.includes("OTP Verified")) {
            localStorage.setItem("userEmail", email);  // ✅ Store email after verification
            window.location.href = "home.html";
        } else {
            alert("❌ Invalid OTP! Try again.");
        }
    })
    .catch(error => console.error("Error verifying OTP:", error));
}

// ✅ Load Items on Home Page
if (window.location.pathname.includes("home.html")) {
    document.addEventListener("DOMContentLoaded", () => {
        const userEmail = localStorage.getItem("userEmail");
        
        if (!userEmail) {
            alert("⚠ No user logged in! Redirecting to login...");
            window.location.href = "index.html";
            return;
        }

        fetch(`${API_URL}/get-items?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(items => {
            let tableBody = document.getElementById("items-table");
            tableBody.innerHTML = "";

            items.forEach(item => {
                let formattedDate = new Date(item.expiry).toLocaleDateString();
                let row = `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <button onclick="sendEmail('${item.name}', '${item.expiry}')">Notify</button>
                            <button onclick="deleteItem('${item._id}')">Delete</button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        })
        .catch(error => console.error("Error fetching items:", error));
    });
}

// ✅ Add Item Function
function addItem() {
    const name = document.getElementById("item-name").value;
    const quantity = document.getElementById("quantity").value;
    const expiry = document.getElementById("expiry-date").value;
    const userEmail = localStorage.getItem("userEmail");

    if (!name || !quantity || !expiry) {
        alert("⚠ Please fill in all fields!");
        return;
    }

    fetch(`${API_URL}/add-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity, expiry, userEmail })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        document.getElementById("item-name").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("expiry-date").value = "";
        loadItems();
    })
    .catch(error => console.error("Error adding item:", error));
}

// ✅ Send Email Notification
function sendEmail(name, expiry) {
    let email = localStorage.getItem("userEmail");

    fetch(`${API_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, item: { name, expiry } })
    })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(error => console.error("Error sending email:", error));
}

// ✅ Delete Item Function
function deleteItem(itemId) {
    fetch(`${API_URL}/delete-item/${itemId}`, {
        method: "DELETE"
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        loadItems();
    })
    .catch(error => console.error("Error deleting item:", error));


    // Your existing functions (Login, OTP, Add/Delete Items, etc.)

// ✅ Check for expiry notifications every 1 minute
setInterval(checkExpiryNotifications, 60 * 1000);

function checkExpiryNotifications() {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) return;

    fetch(`http://localhost:5000/get-items?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(items => {
            const now = new Date();

            items.forEach(item => {
                let expiryDate = new Date(item.expiry);
                let timeDiff = expiryDate - now; // Time difference in milliseconds

                if (timeDiff > 0 && timeDiff <= 30 * 60 * 1000) { // 30 minutes before expiry
                    showNotification(item.name, expiryDate);
                }
            });
        })
        .catch(error => console.error("Error fetching items:", error));
}

function showNotification(itemName, expiryDate) {
    let hours = expiryDate.getHours();
    let minutes = expiryDate.getMinutes();
    let seconds = expiryDate.getSeconds();
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert 24-hour to 12-hour format
    minutes = minutes < 10 ? "0" + minutes : minutes; // Add leading zero if needed
    seconds = seconds < 10 ? "0" + seconds : seconds;

    let formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

    alert(`⏳ Reminder: "${itemName}" is expiring soon at ${formattedTime}!`);
}

}
