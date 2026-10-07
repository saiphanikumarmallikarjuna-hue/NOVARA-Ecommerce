
// ========================================
// 1. GLOBAL VARIABLES
// ========================================

const API = "/api";

let products = [];
let cart = [];
let category = "All";
let query = "";
let currentUser = null;
let registering = false;

const $ = id => document.getElementById(id);


// ========================================
// 2. UTILITY FUNCTIONS
// ========================================

// Format price in Indian Rupees
const money = n =>
    "₹" + Number(n).toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });

// Prevent HTML injection
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ========================================
// 3. LOAD AND DISPLAY PRODUCTS
// ========================================

// Fetch products from the backend
async function loadProducts() {
    $("products").innerHTML =
        '<p class="empty">Loading the collection…</p>';

    try {
        const response = await fetch(API + "/products");

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        products = await response.json();
        renderProducts();

    } catch (error) {
        $("products").innerHTML =
            '<p class="empty">Could not connect to the store. Check that the server and database are running.</p>';

        $("resultCount").textContent = "";
    }
}

// Display products based on search and category
function renderProducts() {
    const shown = products.filter(product =>
        (category === "All" || product.category === category) &&
        (`${product.name} ${product.category}`).toLowerCase().includes(query.toLowerCase())
    );

    $("resultCount").textContent = `${shown.length} items`;

    if (!shown.length) {
        $("products").innerHTML = '<p class="empty">No products found. Try another search.</p>';
        return;
    }

    $("products").innerHTML = shown.map(product => {
        const stock = Number(product.stock) || 0;
        const out = stock <= 0;
        return `
        <article class="product-card">
            <div class="product-image">
                <img src="${escapeHtml(product.image_url || "")}" alt="${escapeHtml(product.name)}" onerror="this.style.display='none'">
                ${out ? '<span class="stock-badge">OUT OF STOCK</span>' : `<span class="stock-badge">${stock} left</span>`}
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtml(product.category)}</span>
                <h3>${escapeHtml(product.name)}</h3>
                <div class="price-row">
                    <span class="price">${money(product.price)}</span>
                    <button class="add-btn" onclick="addToCart(${product.id})" ${out ? "disabled" : ""}>
                        ${out ? "Out of stock" : "Add to bag +"}
                    </button>
                </div>
            </div>
        </article>`;
    }).join("");
}


// ========================================
// 4. SHOPPING CART
// ========================================

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const stock = Number(product.stock) || 0;
    if (stock <= 0) {
        alert(`${product.name} is out of stock.`);
        return;
    }

    const item = cart.find(product => product.id === id);
    const currentQty = item ? item.quantity : 0;

    if (currentQty >= stock) {
        alert(`Only ${stock} item${stock === 1 ? "" : "s"} available for ${product.name}.`);
        renderCart();
        return;
    }

    if (item) item.quantity++;
    else cart.push({ id, quantity: 1 });

    renderCart();
}

function changeQty(id, difference) {
    const item = cart.find(product => product.id === id);
    const product = products.find(product => product.id === id);
    if (!item || !product) return;

    const nextQty = item.quantity + difference;

    if (nextQty > Number(product.stock)) {
        alert(`Only ${product.stock} available for ${product.name}.`);
        return;
    }

    item.quantity = nextQty;
    if (item.quantity < 1) cart = cart.filter(product => product.id !== id);
    renderCart();
}

function renderCart() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    $("cartCount").textContent = totalItems;

    $("cartItems").innerHTML = cart.length
        ? cart.map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) return "";
            const atLimit = item.quantity >= Number(product.stock);
            return `
                <div class="cart-line">
                    <div>
                        <h4>${escapeHtml(product.name)}</h4>
                        <p>${money(product.price)} each</p>
                        <div class="qty">
                            <button onclick="changeQty(${item.id}, -1)">−</button>
                            <span>${item.quantity}</span>
                            <button onclick="changeQty(${item.id}, 1)" ${atLimit ? "disabled" : ""}>+</button>
                        </div>
                        ${atLimit ? '<small class="stock-warning">Maximum available stock reached.</small>' : ''}
                    </div>
                    <strong>${money(product.price * item.quantity)}</strong>
                </div>`;
        }).join("")
        : '<p class="empty">Your bag is waiting for something lovely.</p>';

    const total = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? Number(product.price) * item.quantity : 0);
    }, 0);

    $("cartTotal").textContent = money(total);
}


// ========================================
// 5. MODAL AND PANEL CONTROLS
// ========================================

// Open cart or modal
function openPanel(id) {
    // Always close another open panel first.
    closePanels(false);

    $("overlay").classList.add("show");
    document.body.classList.add("panel-open");

    const panel = $(id);
    if (!panel) return;

    if (id === "cartDrawer") {
        panel.classList.add("open");
    } else {
        panel.classList.add("show");
    }
}

// Close all panels
function closePanels(updateBody = true) {
    $("overlay").classList.remove("show");

    $("cartDrawer").classList.remove("open");
    $("accountModal").classList.remove("show");
    $("checkoutModal").classList.remove("show");
    $("ordersModal").classList.remove("show");

    if (updateBody) {
        document.body.classList.remove("panel-open");
    }
}


// ========================================
// 6. SEARCH AND CATEGORY FILTERS
// ========================================

// Search products
function searchProducts() {
    query = $("searchInput").value.trim();
    renderProducts();
}

// Filter products by category
function filterProducts(button) {
    document.querySelectorAll(".filter").forEach(filter => {
        filter.classList.remove("active");
    });

    button.classList.add("active");

    category = button.dataset.category;

    renderProducts();
}


// ========================================
// 7. LOGIN AND REGISTRATION
// ========================================

// Switch between login and registration
function switchAuthMode() {
    registering = !registering;

    $("nameField").classList.toggle(
        "hidden",
        !registering
    );

    $("authTitle").textContent =
        registering ? "Create account" : "Sign in";

    $("authSubmit").textContent =
        registering ? "Create account" : "Sign in";

    $("switchText").textContent =
        registering ? "Already registered?" : "New here?";

    $("switchAuth").textContent =
        registering ? "Sign in" : "Create an account";

    $("authMessage").textContent = "";
}

// Submit login or registration form
async function handleAuth(event) {
    event.preventDefault();

    const payload = {
        name: $("authName").value,
        email: $("authEmail").value,
        password: $("authPassword").value
    };

    const endpoint = registering
        ? "/register"
        : "/login";

    try {
        const response = await fetch(API + endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        $("authMessage").textContent = data.message;

        if (response.ok && !registering) {
            currentUser = data.user;

            $("accountBtn").textContent = data.user.name;
            $("logoutBtn").classList.remove("hidden");
            $("ordersBtn").classList.remove("hidden");
            closePanels();
            loadOrders();
        }

    } catch (error) {
        $("authMessage").textContent =
            "Could not connect to the server.";
    }
}


// ========================================
// 8. CHECKOUT AND ORDER PLACEMENT
// ========================================

function openCheckout() {
    if (!cart.length) return;

    if (!currentUser) {
        openPanel("accountModal");
        $("authMessage").textContent = "Please sign in before checkout.";
        return;
    }

    closePanels();
    $("customerName").value = currentUser.name || "";
    $("customerEmail").value = currentUser.email || "";
    updatePaymentFields();
    openPanel("checkoutModal");
}

function updatePaymentFields() {
    const method = $("paymentMethod").value;

    $("upiFields").classList.toggle("hidden", method !== "UPI");
    $("cardFields").classList.toggle("hidden", method !== "CARD");

    $("upiId").required = method === "UPI";
    $("cardNumber").required = method === "CARD";
    $("cardExpiry").required = method === "CARD";
    $("cardCvv").required = method === "CARD";

    // Keep hidden payment controls out of browser validation.
    if (method !== "UPI") $("upiId").setCustomValidity("");
    if (method !== "CARD") {
        $("cardNumber").setCustomValidity("");
        $("cardExpiry").setCustomValidity("");
        $("cardCvv").setCustomValidity("");
    }
}

function isValidUpiId(value) {
    return /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(value);
}

function isValidLuhn(cardNumber) {
    let sum = 0;
    let shouldDouble = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = Number(cardNumber[i]);

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
}

function isValidExpiry(value) {
    if (!/^\d{2}\/\d{2}$/.test(value)) return false;

    const [monthText, yearText] = value.split("/");
    const month = Number(monthText);
    const year = 2000 + Number(yearText);

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentMonth = now.getFullYear() * 12 + now.getMonth();
    const expiryMonth = year * 12 + (month - 1);

    return expiryMonth >= currentMonth;
}

function validatePayment(method) {
    if (method === "UPI") {
        const upi = $("upiId").value.trim();

        if (!isValidUpiId(upi)) {
            $("upiId").setCustomValidity("Enter a valid UPI ID, for example name@upi");
            $("upiId").reportValidity();
            return false;
        }

        $("upiId").setCustomValidity("");
    }

    if (method === "CARD") {
        const card = $("cardNumber").value.replace(/\D/g, "");
        const expiry = $("cardExpiry").value.trim();
        const cvv = $("cardCvv").value.replace(/\D/g, "");

        if (card.length !== 16 || !isValidLuhn(card)) {
            $("cardNumber").setCustomValidity("Enter a valid 16-digit card number.");
            $("cardNumber").reportValidity();
            return false;
        }

        if (!isValidExpiry(expiry)) {
            $("cardExpiry").setCustomValidity("Enter a valid future expiry date in MM/YY format.");
            $("cardExpiry").reportValidity();
            return false;
        }

        if (cvv.length !== 3) {
            $("cardCvv").setCustomValidity("CVV must contain 3 digits.");
            $("cardCvv").reportValidity();
            return false;
        }

        $("cardNumber").setCustomValidity("");
        $("cardExpiry").setCustomValidity("");
        $("cardCvv").setCustomValidity("");
    }

    return true;
}

async function placeOrder(event) {
    event.preventDefault();

    if (!cart.length) {
        $("checkoutMessage").textContent = "Your bag is empty.";
        return;
    }

    const form = $("checkoutForm");
    const paymentMethod = $("paymentMethod").value;

    if (!validatePayment(paymentMethod)) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {
        customer_name: $("customerName").value.trim(),
        email: $("customerEmail").value.trim(),
        items: cart,
        payment_method: paymentMethod,
        payment_reference: paymentMethod === "UPI" ? $("upiId").value.trim() : null,
        card_number: paymentMethod === "CARD" ? $("cardNumber").value.replace(/\D/g, "") : null,
        card_expiry: paymentMethod === "CARD" ? $("cardExpiry").value.trim() : null,
        card_cvv: paymentMethod === "CARD" ? $("cardCvv").value.replace(/\D/g, "") : null
    };

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Processing…";
    $("checkoutMessage").textContent = "Processing order…";

    try {
        const response = await fetch(API + "/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let data;
        try {
            data = await response.json();
        } catch {
            data = { message: "The server returned an invalid response." };
        }

        if (!response.ok) {
            $("checkoutMessage").textContent = data.message || "Could not place the order.";
            return;
        }

        $("checkoutMessage").textContent =
            `${data.message} — Order #${data.orderId}, total ${money(data.total)}`;

        cart = [];
        form.reset();
        updatePaymentFields();
        renderCart();
        await loadProducts();

        if (currentUser) await loadOrders();

        // Leave the success message visible briefly, then close checkout.
        setTimeout(() => {
            closePanels();
            $("checkoutMessage").textContent = "";
        }, 1200);
    } catch (error) {
        $("checkoutMessage").textContent = "Could not connect to the server.";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Place order";
    }
}

async function loadOrders() {
    if (!currentUser) return;

    $("ordersList").innerHTML = '<p class="empty">Loading your orders…</p>';

    try {
        const response = await fetch(API + "/orders?email=" + encodeURIComponent(currentUser.email));
        const orders = await response.json();

        if (!response.ok) throw new Error(orders.message || "Could not load orders");
        if (!Array.isArray(orders)) throw new Error("Invalid order data");

        if (!orders.length) {
            $("ordersList").innerHTML = '<p class="empty">You have not placed any orders yet.</p>';
            return;
        }

        $("ordersList").innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-head">
                    <strong>Order #${order.id}</strong>
                    <span>${new Date(order.created_at).toLocaleString("en-IN")}</span>
                </div>
                <p>Payment: <b>${escapeHtml(order.payment_method)}</b> — ${escapeHtml(order.payment_status)}</p>
                <p>Status: <b>${escapeHtml(order.status || "Pending")}</b></p>
                <div>${order.items.map(item => `<div class="order-item"><span>${escapeHtml(item.name || "Product")} × ${item.quantity}</span><b>${money(Number(item.price) * item.quantity)}</b></div>`).join("")}</div>
                <strong class="order-total">Total: ${money(order.total)}</strong>
            </div>
        `).join("");
    } catch (error) {
        $("ordersList").innerHTML = '<p class="empty">Could not load your orders.</p>';
    }
}

function openOrders() {
    if (!currentUser) {
        openPanel("accountModal");
        return;
    }
    closePanels();
    loadOrders();
    openPanel("ordersModal");
}


// ========================================
// 9. LOGOUT
// ========================================

function logout() {
    currentUser = null;
    cart = [];

    $("accountBtn").textContent = "Login / Sign up";
    $("logoutBtn").classList.add("hidden");
    $("ordersBtn").classList.add("hidden");

    closePanels();
    renderCart();
}


// ========================================
// 10. EVENT LISTENERS
// ========================================

// Cart button
$("cartBtn").onclick = () => {
    renderCart();
    openPanel("cartDrawer");
};

// Account button
$("accountBtn").onclick = () => {
    openPanel("accountModal");
};

// Close panels
$("overlay").onclick = closePanels;

document.querySelectorAll(".close").forEach(button => {
    button.onclick = closePanels;
});

// Category filters
document.querySelectorAll(".filter").forEach(button => {
    button.onclick = () => filterProducts(button);
});

// Search button
$("searchBtn").onclick = searchProducts;

// Search using Enter key
$("searchInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchProducts();
    }
});

// Switch login and registration
$("switchAuth").onclick = switchAuthMode;

// Login and registration form
$("authForm").onsubmit = handleAuth;

// Checkout button
$("checkoutBtn").onclick = openCheckout;

// Checkout form
$("checkoutForm").onsubmit = placeOrder;
$("paymentMethod").onchange = updatePaymentFields;

$("cardNumber").addEventListener("input", event => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
    event.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
});

$("cardExpiry").addEventListener("input", event => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
    event.target.value = digits.length > 2
        ? digits.slice(0, 2) + "/" + digits.slice(2)
        : digits;
});

$("cardCvv").addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3);
});

["upiId", "cardNumber", "cardExpiry", "cardCvv"].forEach(id => {
    $(id).addEventListener("input", () => $(id).setCustomValidity(""));
});

$("ordersBtn").onclick = openOrders;

// Logout button
$("logoutBtn").onclick = logout;


// ========================================
// 11. INITIALIZE WEBSITE
// ========================================

loadProducts();